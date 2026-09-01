import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import packageMetadata from "../package.json";
import { collectDashboard } from "../scripts/lib/collector";
import { loadDeckConfig } from "../scripts/lib/config";
import { GitHubClient } from "../scripts/lib/github";
import {
  ISSUE_SIGNAL_LABELS,
  REASON_LABELS,
  ROLE_LABELS,
  STATE_LABELS,
  sourceFactLabel,
} from "../src/domain/labels";
import {
  dashboardDataSchema,
  issueSignalSchema,
  itemTypeSchema,
  roleSchema,
  workStateSchema,
  type DashboardData,
  type DeckConfig,
  type Project,
  type RecentIssue,
  type WorkItem,
} from "../src/domain/schema";
import {
  filterRecentIssues,
  filterWorkItems,
  type RecentIssueSignalFilter,
} from "../src/domain/selectors";
import { relativeTime } from "../src/domain/time";
import { formatKeyValues, formatTable, terminalText } from "./output";

const DEFAULT_SOURCE = "https://onefly.top/opensource-deck/data/dashboard.json";
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const optionDefinitions = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  json: { type: "boolean", short: "j" },
  source: { type: "string", short: "s" },
  project: { type: "string", short: "p" },
  query: { type: "string", short: "q" },
  limit: { type: "string", short: "l" },
  state: { type: "string" },
  type: { type: "string" },
  role: { type: "string" },
  signal: { type: "string" },
  user: { type: "string" },
  config: { type: "string" },
  output: { type: "string" },
  lookback: { type: "string" },
  "completed-retention": { type: "string" },
} as const;

export interface CliRuntime {
  cwd: string;
  home: string;
  env: NodeJS.ProcessEnv;
  fetcher: typeof fetch;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

const defaultRuntime: CliRuntime = {
  cwd: process.cwd(),
  home: os.homedir(),
  env: process.env,
  fetcher: globalThis.fetch,
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

const HELP = `OpenSourceDeck CLI ${packageMetadata.version}

用法:
  osdeck [summary] [--source <url|file>] [--json]
  osdeck projects [--query <text>] [--limit <n>] [--json]
  osdeck work [--state <state>] [--type <type>] [--role <role>]
              [--project <owner/repo>] [--query <text>] [--limit <n>] [--json]
  osdeck issues [--signal <signal>] [--project <owner/repo>]
                [--query <text>] [--limit <n>] [--json]
  osdeck show <owner/repo#number|url> [--json]
  osdeck url <owner/repo#number|url>
  osdeck sync (--user <login> | --config <file>) [--output <file|->]
              [--json]

默认数据源:
  OSDECK_SOURCE，其次本地缓存，最后 ${DEFAULT_SOURCE}

筛选值:
  state   ${workStateSchema.options.join(", ")}
  type    ${itemTypeSchema.options.join(", ")}
  role    ${roleSchema.options.join(", ")}
  signal  all, contribution_label, ${issueSignalSchema.options.join(", ")}

安全边界:
  所有 GitHub 请求均为只读，CLI 只生成公开仓库数据。
  token 只从 GITHUB_TOKEN 或 GH_TOKEN 读取，不会写入输出。
`;

function writeLine(writer: (text: string) => void, value: string): void {
  writer(value.endsWith("\n") ? value : `${value}\n`);
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum)
    throw new Error(`${name} 必须是 1-${maximum} 的整数。`);
  return parsed;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    throw new Error(`${name} 必须是 ${minimum}-${maximum} 的整数。`);
  return parsed;
}

function choice<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  fallback: T,
  name: string,
): T {
  if (value === undefined) return fallback;
  if (!choices.includes(value as T))
    throw new Error(`${name} 不支持 ${value}，可选值：${choices.join(", ")}`);
  return value as T;
}

function cachePath(runtime: CliRuntime): string {
  const base = runtime.env.XDG_CACHE_HOME
    ? path.resolve(runtime.env.XDG_CACHE_HOME)
    : path.join(runtime.home, ".cache");
  return path.join(base, "opensource-deck", "dashboard.json");
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveSource(
  requested: string | undefined,
  runtime: CliRuntime,
): Promise<string> {
  if (requested) return requested;
  if (runtime.env.OSDECK_SOURCE) return runtime.env.OSDECK_SOURCE;
  const cached = cachePath(runtime);
  return (await exists(cached)) ? cached : DEFAULT_SOURCE;
}

async function loadSource(
  source: string,
  runtime: CliRuntime,
): Promise<DashboardData> {
  let text: string;
  if (/^https?:\/\//i.test(source)) {
    const response = await runtime.fetcher(source, {
      headers: { Accept: "application/json", "User-Agent": "osdeck-cli" },
    });
    if (!response.ok)
      throw new Error(`数据源请求失败，HTTP 状态码：${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SOURCE_BYTES)
      throw new Error("数据源超过 10 MiB。");
    text = await response.text();
  } else {
    const file = path.resolve(runtime.cwd, source);
    const metadata = await stat(file);
    if (metadata.size > MAX_SOURCE_BYTES)
      throw new Error("数据源超过 10 MiB。");
    text = await readFile(file, "utf8");
  }
  if (Buffer.byteLength(text, "utf8") > MAX_SOURCE_BYTES)
    throw new Error("数据源超过 10 MiB。");
  const dashboard = dashboardDataSchema.parse(JSON.parse(text) as unknown);
  if (
    dashboard.accessMode !== "public" ||
    dashboard.projects.some((project) => project.visibility !== "public")
  ) {
    throw new Error(
      "CLI 拒绝读取私有 dashboard 数据；请在 OAuth 浏览器视图中查看。",
    );
  }
  return dashboard;
}

function summarize(data: DashboardData) {
  const states = Object.fromEntries(
    workStateSchema.options.map((state) => [
      state,
      data.items.filter((item) => item.state === state).length,
    ]),
  );
  const signals = Object.fromEntries(
    issueSignalSchema.options.map((signal) => [
      signal,
      data.recentIssues.filter((issue) => issue.signals.includes(signal))
        .length,
    ]),
  );
  return {
    schemaVersion: data.schemaVersion,
    accessMode: data.accessMode,
    user: data.sourceUser.login,
    generatedAt: data.generatedAt,
    syncStatus: data.syncStatus,
    projects: data.projects.length,
    items: data.items.length,
    recentIssues: data.recentIssues.length,
    states,
    signals,
    warnings: data.warnings,
    rateLimit: data.rateLimit,
  };
}

function humanSummary(data: DashboardData): string {
  const summary = summarize(data);
  return [
    `OpenSourceDeck · @${terminalText(summary.user)} · ${summary.accessMode === "private" ? "私有" : "公开"}`,
    `同步于 ${new Date(summary.generatedAt).toLocaleString("zh-CN")}（${relativeTime(summary.generatedAt)}）`,
    `项目 ${summary.projects}  |  贡献 ${summary.items}  |  近期 Issue ${summary.recentIssues}`,
    `需要处理 ${summary.states.needs_action}  |  等待上游 ${summary.states.waiting_upstream}  |  进行中 ${summary.states.active}  |  已完成 ${summary.states.completed}`,
    `未指派 ${summary.signals.unassigned}  |  已有开放 PR ${summary.signals.linked_pull_request}  |  贡献友好 ${summary.signals.good_first_issue + summary.signals.help_wanted}`,
    `同步状态 ${summary.syncStatus}${summary.warnings.length ? `  |  警告 ${summary.warnings.length}` : ""}`,
  ].join("\n");
}

function projectRows(data: DashboardData, query: string, limit: number) {
  const normalized = query.trim().toLocaleLowerCase();
  const candidates = data.projects.filter((project) =>
    [project.repository, project.alias ?? "", project.description]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalized),
  );
  return { total: candidates.length, projects: candidates.slice(0, limit) };
}

function humanProjects(data: DashboardData, projects: Project[]): string {
  const issueCounts = new Map<string, number>();
  for (const issue of data.recentIssues)
    issueCounts.set(
      issue.repository,
      (issueCounts.get(issue.repository) ?? 0) + 1,
    );
  return formatTable(projects, [
    { header: "仓库", value: (project) => project.repository, maxWidth: 34 },
    { header: "可见性", value: (project) => project.visibility, maxWidth: 7 },
    {
      header: "需处理",
      value: (project) => project.counts.needs_action,
      align: "right",
    },
    {
      header: "等待",
      value: (project) => project.counts.waiting_upstream,
      align: "right",
    },
    {
      header: "候选",
      value: (project) => issueCounts.get(project.repository) ?? 0,
      align: "right",
    },
    {
      header: "更新",
      value: (project) => relativeTime(project.updatedAt),
      maxWidth: 10,
    },
  ]);
}

function humanWork(items: WorkItem[]): string {
  return formatTable(items, [
    { header: "状态", value: (item) => STATE_LABELS[item.state], maxWidth: 8 },
    {
      header: "类型",
      value: (item) => (item.type === "pull_request" ? "PR" : "Issue"),
      maxWidth: 5,
    },
    {
      header: "项目",
      value: (item) => `${item.repository}#${item.number}`,
      maxWidth: 32,
    },
    { header: "标题", value: (item) => item.title, maxWidth: 46 },
    {
      header: "更新",
      value: (item) => relativeTime(item.updatedAt),
      maxWidth: 10,
    },
  ]);
}

function signalSummary(issue: RecentIssue): string {
  return issue.signals.map((signal) => ISSUE_SIGNAL_LABELS[signal]).join(",");
}

function humanIssues(issues: RecentIssue[]): string {
  return formatTable(issues, [
    { header: "公开信号", value: signalSummary, maxWidth: 22 },
    {
      header: "项目",
      value: (issue) => `${issue.repository}#${issue.number}`,
      maxWidth: 32,
    },
    { header: "标题", value: (issue) => issue.title, maxWidth: 44 },
    {
      header: "开放PR",
      value: (issue) => issue.linkedPullRequests.length,
      align: "right",
    },
    {
      header: "评论",
      value: (issue) => issue.comments,
      align: "right",
    },
    {
      header: "更新",
      value: (issue) => relativeTime(issue.updatedAt),
      maxWidth: 10,
    },
  ]);
}

type LocatedItem =
  | { kind: "work"; item: WorkItem }
  | { kind: "recent_issue"; item: RecentIssue };

function locate(data: DashboardData, identifier: string): LocatedItem {
  const normalized = identifier.replace(/\/$/, "");
  const all: LocatedItem[] = [
    ...data.items.map((item) => ({ kind: "work" as const, item })),
    ...data.recentIssues.map((item) => ({
      kind: "recent_issue" as const,
      item,
    })),
  ];
  const byUrl = all.find((candidate) => candidate.item.url === normalized);
  if (byUrl) return byUrl;
  const coordinate = normalized.match(/^([^\s/#]+\/[^\s#]+)#(\d+)$/);
  const numberOnly = normalized.match(/^#?(\d+)$/);
  const matches = all.filter((candidate) => {
    if (coordinate)
      return (
        candidate.item.repository.toLocaleLowerCase() ===
          coordinate[1]?.toLocaleLowerCase() &&
        candidate.item.number === Number(coordinate[2])
      );
    return numberOnly ? candidate.item.number === Number(numberOnly[1]) : false;
  });
  if (matches.length === 1) return matches[0] as LocatedItem;
  if (matches.length > 1)
    throw new Error(
      `标识 ${identifier} 匹配多个项目，请使用 owner/repo#number。`,
    );
  throw new Error(`没有找到 ${identifier}。`);
}

function humanLocated(located: LocatedItem): string {
  if (located.kind === "recent_issue") {
    const issue = located.item;
    return formatKeyValues([
      ["类型", "近期 Issue 候选"],
      ["项目", `${issue.repository}#${issue.number}`],
      ["标题", issue.title],
      ["作者", issue.author],
      ["公开信号", signalSummary(issue)],
      ["指派", issue.assignees.join(", ") || "暂无"],
      [
        "关联 PR",
        issue.linkedPullRequests.length > 0
          ? issue.linkedPullRequests
              .map((pull) => `${pull.repository}#${pull.number}`)
              .join(", ")
          : issue.linkedPullRequestStatus === "checked"
            ? "未发现开放 PR"
            : "未知",
      ],
      ["标签", issue.labels.join(", ") || "暂无"],
      ["评论", issue.comments],
      ["更新", `${relativeTime(issue.updatedAt)} / ${issue.updatedAt}`],
      ["URL", issue.url],
      ["提示", "指派和关联 PR 只是筛选证据，不代表允许开始或保证接受。"],
    ]);
  }
  const item = located.item;
  return formatKeyValues([
    ["类型", item.type === "pull_request" ? "Pull Request" : "Issue"],
    ["项目", `${item.repository}#${item.number}`],
    ["标题", item.title],
    ["状态", STATE_LABELS[item.state]],
    [
      "原因",
      item.reasonCodes.map((reason) => REASON_LABELS[reason]).join("；"),
    ],
    ["角色", item.roles.map((role) => ROLE_LABELS[role]).join(", ")],
    ["事实", item.sourceFacts.map(sourceFactLabel).join("；")],
    ["检查", item.checks.status],
    ["更新", `${relativeTime(item.updatedAt)} / ${item.updatedAt}`],
    ["URL", item.url],
  ]);
}

async function writeDashboard(
  dashboard: DashboardData,
  destination: string,
  runtime: CliRuntime,
): Promise<void> {
  const content = `${JSON.stringify(dashboard, null, 2)}\n`;
  if (destination === "-") {
    runtime.stdout(content);
    return;
  }
  const output = path.resolve(runtime.cwd, destination);
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, output);
}

async function syncDashboard(
  values: Record<string, string | boolean | undefined>,
  runtime: CliRuntime,
): Promise<number> {
  const token = runtime.env.GITHUB_TOKEN ?? runtime.env.GH_TOKEN;

  let config: DeckConfig;
  if (typeof values.config === "string") {
    config = await loadDeckConfig(path.resolve(runtime.cwd, values.config));
  } else {
    const user = typeof values.user === "string" ? values.user.trim() : "";
    if (!USERNAME_PATTERN.test(user))
      throw new Error("sync 需要有效的 --user，或使用 --config。");
    config = {
      schemaVersion: 1,
      githubUser: user,
      lookbackDays: boundedInteger(
        typeof values.lookback === "string" ? values.lookback : undefined,
        90,
        "--lookback",
        1,
        365,
      ),
      completedRetentionDays: boundedInteger(
        typeof values["completed-retention"] === "string"
          ? values["completed-retention"]
          : undefined,
        30,
        "--completed-retention",
        0,
        365,
      ),
      projects: {},
      exclude: { repositories: [], labels: [] },
      overrides: {},
    };
  }

  const dashboard = await collectDashboard({
    client: new GitHubClient({ token }),
    config,
    includePrivate: false,
    collectionMode: token ? "full" : "public_browser",
  });
  const destination =
    typeof values.output === "string" ? values.output : cachePath(runtime);
  await writeDashboard(dashboard, destination, runtime);
  if (destination === "-") return 0;
  const result = {
    output: path.resolve(runtime.cwd, destination),
    ...summarize(dashboard),
  };
  writeLine(
    runtime.stdout,
    values.json === true
      ? JSON.stringify(result, null, 2)
      : `已同步 @${dashboard.sourceUser.login}：${dashboard.projects.length} 个项目、${dashboard.items.length} 项贡献、${dashboard.recentIssues.length} 个近期 Issue\n输出：${result.output}`,
  );
  return 0;
}

export async function runCli(
  argv: string[],
  overrides: Partial<CliRuntime> = {},
): Promise<number> {
  const runtime = { ...defaultRuntime, ...overrides };
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: optionDefinitions,
      allowPositionals: true,
      strict: true,
    });
    const command = positionals[0] ?? "summary";
    if (values.version) {
      writeLine(runtime.stdout, packageMetadata.version);
      return 0;
    }
    if (values.help || command === "help") {
      runtime.stdout(HELP);
      return 0;
    }
    if (command === "sync")
      return await syncDashboard(
        values as Record<string, string | boolean | undefined>,
        runtime,
      );
    if (
      !["summary", "projects", "work", "issues", "show", "url"].includes(
        command,
      )
    )
      throw new Error(`未知命令：${command}。运行 osdeck --help 查看用法。`);

    const source = await resolveSource(values.source, runtime);
    const data = await loadSource(source, runtime);
    const json = values.json === true;
    const limit = positiveInteger(values.limit, 50, "--limit", 500);

    if (command === "summary") {
      writeLine(
        runtime.stdout,
        json
          ? JSON.stringify({ source, ...summarize(data) }, null, 2)
          : humanSummary(data),
      );
      return 0;
    }
    if (command === "projects") {
      const result = projectRows(data, values.query ?? "", limit);
      writeLine(
        runtime.stdout,
        json
          ? JSON.stringify({ source, ...result }, null, 2)
          : result.projects.length
            ? humanProjects(data, result.projects)
            : "没有匹配的项目。",
      );
      return 0;
    }
    if (command === "work") {
      const state = choice(
        values.state,
        ["all", ...workStateSchema.options],
        "all",
        "--state",
      );
      const type = choice(
        values.type,
        ["all", ...itemTypeSchema.options],
        "all",
        "--type",
      );
      const role = choice(
        values.role,
        ["all", ...roleSchema.options],
        "all",
        "--role",
      );
      const filtered = filterWorkItems(data.items, {
        state,
        project: values.project ?? "all",
        type,
        role,
        query: values.query ?? "",
      });
      const items = filtered.slice(0, limit);
      writeLine(
        runtime.stdout,
        json
          ? JSON.stringify(
              { source, total: filtered.length, returned: items.length, items },
              null,
              2,
            )
          : items.length
            ? humanWork(items)
            : "没有匹配的贡献项目。",
      );
      return 0;
    }
    if (command === "issues") {
      const signal = choice(
        values.signal,
        ["all", "contribution_label", ...issueSignalSchema.options],
        "all",
        "--signal",
      ) as RecentIssueSignalFilter;
      const filtered = filterRecentIssues(data.recentIssues, {
        project: values.project ?? "all",
        signal,
        query: values.query ?? "",
      });
      const issues = filtered.slice(0, limit);
      writeLine(
        runtime.stdout,
        json
          ? JSON.stringify(
              {
                source,
                total: filtered.length,
                returned: issues.length,
                issues,
              },
              null,
              2,
            )
          : issues.length
            ? humanIssues(issues)
            : "没有匹配的近期 Issue。",
      );
      return 0;
    }

    const identifier = positionals[1];
    if (!identifier)
      throw new Error(`${command} 需要 owner/repo#number 或 URL。`);
    const located = locate(data, identifier);
    if (command === "url") {
      writeLine(runtime.stdout, located.item.url);
      return 0;
    }
    writeLine(
      runtime.stdout,
      json ? JSON.stringify(located, null, 2) : humanLocated(located),
    );
    return 0;
  } catch (error) {
    writeLine(
      runtime.stderr,
      `错误：${error instanceof Error ? error.message : "未知错误"}`,
    );
    return 1;
  }
}
