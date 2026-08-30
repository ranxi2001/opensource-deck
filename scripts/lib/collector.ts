import { classifyWorkItem } from "../../src/domain/classifier";
import {
  buildProjects,
  mergeWorkItems,
  type RepositoryMetadata,
} from "../../src/domain/aggregate";
import {
  dashboardDataSchema,
  type Activity,
  type ChecksSummary,
  type DashboardData,
  type DeckConfig,
  type IssueSignal,
  type RecentIssue,
  type Role,
  type WorkItem,
} from "../../src/domain/schema";
import { GitHubClient, GitHubRequestError, mapLimit } from "./github";

interface SearchIssue {
  id: number;
  node_id: string;
  html_url: string;
  repository_url: string;
  number: number;
  title: string;
  user: { login: string } | null;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name?: string } | string>;
  assignees?: Array<{ login: string }>;
  comments?: number;
  pull_request?: { merged_at?: string | null };
  draft?: boolean;
}

const GOOD_FIRST_ISSUE_LABELS = new Set([
  "good first issue",
  "good-first-issue",
  "good_first_issue",
]);
const HELP_WANTED_LABELS = new Set(["help wanted", "help-wanted"]);
const NEEDS_TRIAGE_LABELS = new Set(["needs triage", "needs-triage"]);

function toRecentIssue(item: SearchIssue): RecentIssue {
  const labels = item.labels.map(labelName).filter(Boolean);
  const normalizedLabels = new Set(
    labels.map((label) => label.toLocaleLowerCase()),
  );
  const assignees = (item.assignees ?? []).map((assignee) => assignee.login);
  const signals: IssueSignal[] = [
    assignees.length === 0 ? "unassigned" : "assigned",
  ];
  if ([...normalizedLabels].some((label) => GOOD_FIRST_ISSUE_LABELS.has(label)))
    signals.push("good_first_issue");
  if ([...normalizedLabels].some((label) => HELP_WANTED_LABELS.has(label)))
    signals.push("help_wanted");
  if ([...normalizedLabels].some((label) => NEEDS_TRIAGE_LABELS.has(label)))
    signals.push("needs_triage");
  return {
    id: item.node_id || String(item.id),
    url: item.html_url,
    repository: repositoryFromApiUrl(item.repository_url),
    number: item.number,
    title: item.title,
    author: item.user?.login ?? "ghost",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    labels,
    assignees,
    comments: item.comments ?? 0,
    signals,
  };
}

async function recentIssuesForRepository(
  client: GitHubClient,
  repository: string,
  since: string,
): Promise<RecentIssue[]> {
  const response = await client.get<SearchResponse>("/search/issues", {
    q: `repo:${repository} is:issue is:open updated:>=${since}`,
    per_page: 12,
    page: 1,
    sort: "updated",
    order: "desc",
  });
  return response.items.filter((item) => !item.pull_request).map(toRecentIssue);
}

interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssue[];
}

interface RepositoryResponse {
  full_name: string;
  private: boolean;
  visibility?: string;
  description: string | null;
  html_url: string;
  owner: { login: string; avatar_url: string };
  fork: boolean;
  parent?: { full_name: string };
}

interface UserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

interface PullResponse {
  merged_at: string | null;
  draft: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  requested_reviewers: Array<{ login: string }>;
  head: { sha: string };
}

interface CheckRunsResponse {
  total_count: number;
  check_runs: Array<{
    name: string;
    status: "queued" | "in_progress" | "completed";
    conclusion: string | null;
    html_url: string | null;
  }>;
}

interface ReviewResponse {
  user: { login: string } | null;
  body: string | null;
  state: string;
  submitted_at: string | null;
}

interface CommentResponse {
  user: { login: string } | null;
  created_at: string;
  updated_at: string;
}

interface DiscoveredItem extends Omit<WorkItem, "state" | "reasonCodes"> {
  state?: never;
  reasonCodes?: never;
}

interface DiscoveryQuery {
  query: string;
  role: Role;
  fact: string;
}

function repositoryFromApiUrl(value: string): string {
  const marker = "/repos/";
  const index = value.indexOf(marker);
  if (index < 0)
    throw new Error("Search result did not contain a repository coordinate");
  return value.slice(index + marker.length);
}

function labelName(label: SearchIssue["labels"][number]): string {
  return typeof label === "string" ? label : (label.name ?? "");
}

function defaultChecks(): ChecksSummary {
  return {
    status: "unavailable",
    total: 0,
    success: 0,
    failure: 0,
    pending: 0,
    jobs: [],
  };
}

function workLinks(
  repository: string,
  number: number,
  type: "issue" | "pull_request",
) {
  const base = `https://github.com/${repository}`;
  return {
    item: `${base}/${type === "pull_request" ? "pull" : "issues"}/${number}`,
    repository: base,
    checks:
      type === "pull_request" ? `${base}/pull/${number}/checks` : undefined,
    actions: `${base}/actions`,
  };
}

function toDiscovered(
  item: SearchIssue,
  role: Role,
  fact: string,
  user: string,
): DiscoveredItem {
  const repository = repositoryFromApiUrl(item.repository_url);
  const type = item.pull_request ? "pull_request" : "issue";
  const merged = Boolean(item.pull_request?.merged_at);
  const author = item.user?.login ?? "ghost";
  const initialActivity: Activity = {
    actor: author,
    at: item.created_at,
    kind: "opened",
    byUser: author.toLocaleLowerCase() === user.toLocaleLowerCase(),
  };
  return {
    id: item.node_id || String(item.id),
    url: item.html_url,
    repository,
    number: item.number,
    type,
    title: item.title,
    author,
    sourceState: merged ? "merged" : item.state,
    roles: [role],
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    closedAt: item.closed_at,
    labels: item.labels.map(labelName).filter(Boolean),
    assignees: (item.assignees ?? []).map((assignee) => assignee.login),
    draft: item.draft ?? false,
    mergeable: type === "pull_request" ? "unknown" : "not_applicable",
    reviewDecision: type === "pull_request" ? "unknown" : "none",
    checks: defaultChecks(),
    latestActivity: initialActivity,
    links: workLinks(repository, item.number, type),
    sourceFacts: [fact],
    warnings: [],
  };
}

function mergeDiscovered(items: DiscoveredItem[]): DiscoveredItem[] {
  const merged = new Map<string, DiscoveredItem>();
  for (const item of items) {
    const current = merged.get(item.id);
    if (!current) {
      merged.set(item.id, item);
      continue;
    }
    const latest =
      new Date(item.updatedAt) >= new Date(current.updatedAt) ? item : current;
    merged.set(item.id, {
      ...latest,
      roles: [...new Set([...current.roles, ...item.roles])].sort(),
      sourceFacts: [...new Set([...current.sourceFacts, ...item.sourceFacts])],
      warnings: [...new Set([...current.warnings, ...item.warnings])],
    });
  }
  return [...merged.values()];
}

function newestActivity(activities: Activity[]): Activity | null {
  return (
    activities.sort(
      (left, right) =>
        new Date(right.at).valueOf() - new Date(left.at).valueOf(),
    )[0] ?? null
  );
}

function summarizeChecks(response: CheckRunsResponse): ChecksSummary {
  const jobs: ChecksSummary["jobs"] = [];
  for (const run of response.check_runs) {
    let status: "success" | "failure" | "pending";
    if (run.status !== "completed") status = "pending";
    else if (
      [
        "failure",
        "timed_out",
        "cancelled",
        "action_required",
        "startup_failure",
      ].includes(run.conclusion ?? "")
    )
      status = "failure";
    else if (["success", "neutral", "skipped"].includes(run.conclusion ?? ""))
      status = "success";
    else status = "pending";
    jobs.push({ name: run.name, status, url: run.html_url ?? undefined });
  }
  if (jobs.length === 0) return defaultChecks();
  const success = jobs.filter((job) => job.status === "success").length;
  const failure = jobs.filter((job) => job.status === "failure").length;
  const pending = jobs.filter((job) => job.status === "pending").length;
  return {
    status: failure > 0 ? "failure" : pending > 0 ? "pending" : "success",
    total: jobs.length,
    success,
    failure,
    pending,
    jobs,
  };
}

function reviewDecision(
  reviews: ReviewResponse[],
  requestedReviewers: string[],
  configuredUser: string,
): WorkItem["reviewDecision"] {
  const latestByReviewer = new Map<string, ReviewResponse>();
  for (const review of reviews) {
    const reviewer = review.user?.login;
    if (!reviewer || !review.submitted_at) continue;
    const current = latestByReviewer.get(reviewer);
    if (
      !current ||
      new Date(review.submitted_at) > new Date(current.submitted_at ?? 0)
    ) {
      latestByReviewer.set(reviewer, review);
    }
  }
  if (
    [...latestByReviewer.values()].some(
      (review) => review.state === "CHANGES_REQUESTED",
    )
  ) {
    return "changes_requested";
  }
  if (
    [...latestByReviewer.values()].some((review) => review.state === "APPROVED")
  )
    return "approved";
  if (
    requestedReviewers.some(
      (reviewer) =>
        reviewer.toLocaleLowerCase() === configuredUser.toLocaleLowerCase(),
    )
  ) {
    return "review_required";
  }
  return "none";
}

async function searchAll(
  client: GitHubClient,
  query: DiscoveryQuery,
  warnings: string[],
  user: string,
): Promise<DiscoveredItem[]> {
  const results: SearchIssue[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await client.get<SearchResponse>("/search/issues", {
      q: query.query,
      per_page: 100,
      page,
      sort: "updated",
      order: "desc",
    });
    results.push(...response.items);
    if (response.incomplete_results)
      warnings.push(`角色 ${query.role} 的搜索结果不完整。`);
    if (response.items.length < 100) break;
    if (page === 10 && response.total_count > results.length) {
      warnings.push(
        `角色 ${query.role} 的搜索已达到结果上限，较早项目可能被省略。`,
      );
    }
  }
  return results.map((item) =>
    toDiscovered(item, query.role, query.fact, user),
  );
}

async function repositoryMetadata(
  client: GitHubClient,
  repository: string,
  configuredUser: string,
): Promise<{ metadata: RepositoryMetadata; isPublic: boolean }> {
  const response = await client.get<RepositoryResponse>(`/repos/${repository}`);
  const isPublic =
    !response.private && (response.visibility ?? "public") === "public";
  let forkUrl: string | undefined;
  if (
    isPublic &&
    response.owner.login.toLocaleLowerCase() !==
      configuredUser.toLocaleLowerCase()
  ) {
    const name = repository.split("/")[1];
    try {
      const fork = await client.get<RepositoryResponse>(
        `/repos/${configuredUser}/${name}`,
      );
      if (
        fork.fork &&
        fork.parent?.full_name.toLocaleLowerCase() ===
          repository.toLocaleLowerCase()
      ) {
        forkUrl = fork.html_url;
      }
    } catch (error) {
      if (!(error instanceof GitHubRequestError && error.status === 404))
        throw error;
    }
  }
  return {
    isPublic,
    metadata: {
      repository,
      visibility: isPublic ? "public" : "private",
      description: response.description ?? "该仓库暂未提供简介。",
      url: response.html_url,
      avatarUrl: response.owner.avatar_url,
      forkUrl,
    },
  };
}

async function enrichItem(
  client: GitHubClient,
  item: DiscoveredItem,
  configuredUser: string,
): Promise<DiscoveredItem> {
  if (item.sourceState !== "open") return item;
  const warnings = [...item.warnings];
  const activities: Activity[] = item.latestActivity
    ? [item.latestActivity]
    : [];
  try {
    const comments = await client.get<CommentResponse[]>(
      `/repos/${item.repository}/issues/${item.number}/comments`,
      { per_page: 100 },
    );
    for (const comment of comments) {
      const actor = comment.user?.login;
      if (!actor) continue;
      activities.push({
        actor,
        at: comment.updated_at || comment.created_at,
        kind: "commented",
        byUser:
          actor.toLocaleLowerCase() === configuredUser.toLocaleLowerCase(),
      });
    }
  } catch (error) {
    warnings.push(
      `评论不可用：${error instanceof Error ? error.message : "未知错误"}`,
    );
  }

  if (item.type === "issue")
    return { ...item, latestActivity: newestActivity(activities), warnings };

  try {
    const pull = await client.get<PullResponse>(
      `/repos/${item.repository}/pulls/${item.number}`,
    );
    const [checks, reviews] = await Promise.all([
      client
        .get<CheckRunsResponse>(
          `/repos/${item.repository}/commits/${pull.head.sha}/check-runs`,
          {
            per_page: 100,
          },
        )
        .catch((error) => {
          warnings.push(
            `检查状态不可用：${error instanceof Error ? error.message : "未知错误"}`,
          );
          return { total_count: 0, check_runs: [] } satisfies CheckRunsResponse;
        }),
      client
        .get<ReviewResponse[]>(
          `/repos/${item.repository}/pulls/${item.number}/reviews`,
          {
            per_page: 100,
          },
        )
        .catch((error) => {
          warnings.push(
            `审阅数据不可用：${error instanceof Error ? error.message : "未知错误"}`,
          );
          return [];
        }),
    ]);
    for (const review of reviews) {
      const actor = review.user?.login;
      if (!actor || !review.submitted_at) continue;
      activities.push({
        actor,
        at: review.submitted_at,
        kind: "reviewed",
        byUser:
          actor.toLocaleLowerCase() === configuredUser.toLocaleLowerCase(),
      });
    }
    const requestedReviewers = pull.requested_reviewers.map(
      (reviewer) => reviewer.login,
    );
    const roles = [...item.roles];
    if (
      requestedReviewers.some(
        (reviewer) =>
          reviewer.toLocaleLowerCase() === configuredUser.toLocaleLowerCase(),
      ) &&
      !roles.includes("review_requested")
    ) {
      roles.push("review_requested");
    }
    return {
      ...item,
      sourceState: pull.merged_at ? "merged" : item.sourceState,
      draft: pull.draft,
      mergeable:
        pull.mergeable === true
          ? "mergeable"
          : pull.mergeable === false && pull.mergeable_state === "dirty"
            ? "conflicting"
            : "unknown",
      reviewDecision: reviewDecision(
        reviews,
        requestedReviewers,
        configuredUser,
      ),
      checks: summarizeChecks(checks),
      roles,
      latestActivity: newestActivity(activities),
      warnings,
    };
  } catch (error) {
    warnings.push(
      `Pull Request 数据不可用：${error instanceof Error ? error.message : "未知错误"}`,
    );
    return { ...item, latestActivity: newestActivity(activities), warnings };
  }
}

export interface CollectDashboardOptions {
  client: GitHubClient;
  config: DeckConfig;
  now?: Date;
  concurrency?: number;
  includePrivate?: boolean;
  collectionMode?: "full" | "public_browser";
}

export async function collectDashboard(
  options: CollectDashboardOptions,
): Promise<DashboardData> {
  const { client, config } = options;
  const now = options.now ?? new Date();
  const since = new Date(now.valueOf() - config.lookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const warnings: string[] = [];
  const user = config.githubUser;
  const queries: DiscoveryQuery[] = [
    {
      query: `author:${user} is:pr updated:>=${since}`,
      role: "author",
      fact: "Authored pull request",
    },
    {
      query: `author:${user} is:issue updated:>=${since}`,
      role: "author",
      fact: "Authored issue",
    },
    {
      query: `assignee:${user} is:issue is:open`,
      role: "assignee",
      fact: "Assigned open issue",
    },
    {
      query: `review-requested:${user} is:pr is:open`,
      role: "review_requested",
      fact: "Review requested",
    },
    {
      query: `reviewed-by:${user} is:pr updated:>=${since} -author:${user}`,
      role: "reviewed",
      fact: "Reviewed pull request",
    },
    {
      query: `involves:${user} is:open updated:>=${since}`,
      role: "involved",
      fact: "Recent involvement",
    },
  ];

  const discovered = mergeDiscovered(
    (
      await mapLimit(queries, 3, (query) =>
        searchAll(client, query, warnings, user),
      )
    ).flat(),
  );

  const browserLimited = options.collectionMode === "public_browser";
  const discoveredForMetadata = browserLimited
    ? [...discovered]
        .sort(
          (left, right) =>
            new Date(right.updatedAt).valueOf() -
            new Date(left.updatedAt).valueOf(),
        )
        .filter(
          (item, index, all) =>
            all.findIndex(
              (candidate) => candidate.repository === item.repository,
            ) === index,
        )
        .slice(0, 20)
    : discovered;
  const repositories = [
    ...new Set(discoveredForMetadata.map((item) => item.repository)),
  ];
  const repositoryResults = await mapLimit(
    repositories,
    options.concurrency ?? 6,
    async (repository) => {
      try {
        return await repositoryMetadata(client, repository, user);
      } catch (error) {
        warnings.push(
          `仓库 ${repository} 的元数据不可用：${error instanceof Error ? error.message : "未知错误"}`,
        );
        return null;
      }
    },
  );
  const metadata = new Map<string, RepositoryMetadata>();
  const allowedRepositories = new Set<string>();
  for (const result of repositoryResults) {
    if (!result || (!result.isPublic && !options.includePrivate)) continue;
    metadata.set(result.metadata.repository, result.metadata);
    allowedRepositories.add(result.metadata.repository);
  }

  const excludedRepositories = new Set(
    config.exclude.repositories.map((value) => value.toLocaleLowerCase()),
  );
  const excludedLabels = new Set(
    config.exclude.labels.map((value) => value.toLocaleLowerCase()),
  );
  const safeItems = discovered.filter((item) => {
    if (!allowedRepositories.has(item.repository)) return false;
    if (excludedRepositories.has(item.repository.toLocaleLowerCase()))
      return false;
    if (config.projects[item.repository]?.hidden) return false;
    return !item.labels.some((label) =>
      excludedLabels.has(label.toLocaleLowerCase()),
    );
  });

  if (browserLimited) {
    warnings.push(
      "公开账户查询最多处理 20 个近期活跃仓库，其中前 8 个仓库用于发现候选 Issue；同时省略逐项 CI、审阅和评论补充数据。",
    );
  }
  const enriched = browserLimited
    ? safeItems
    : await mapLimit(safeItems, options.concurrency ?? 6, (item) =>
        enrichItem(client, item, user),
      );
  const classified: WorkItem[] = enriched.map((item) => {
    const classification = classifyWorkItem({
      ...item,
      override: config.overrides[item.url],
      now,
    });
    return { ...item, ...classification };
  });

  const retentionStart =
    now.valueOf() - config.completedRetentionDays * 86_400_000;
  const retained = classified.filter(
    (item) =>
      item.state !== "completed" ||
      new Date(item.closedAt ?? item.updatedAt).valueOf() >= retentionStart,
  );
  const items = mergeWorkItems(retained);
  const projects = buildProjects(items, metadata, config.projects);
  const recentIssueSince = new Date(now.valueOf() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const recentIssueRepositories = projects
    .slice(0, browserLimited ? 8 : 20)
    .map((project) => project.repository);
  const knownIssueUrls = new Set(
    items.filter((item) => item.type === "issue").map((item) => item.url),
  );
  const recentIssueResults = await mapLimit(
    recentIssueRepositories,
    browserLimited ? 3 : (options.concurrency ?? 6),
    async (repository) => {
      try {
        return await recentIssuesForRepository(
          client,
          repository,
          recentIssueSince,
        );
      } catch (error) {
        warnings.push(
          `近期 Issue 获取失败（${repository}）：${error instanceof Error ? error.message : "未知错误"}`,
        );
        return [];
      }
    },
  );
  const recentIssues = recentIssueResults
    .flat()
    .filter((issue) => !knownIssueUrls.has(issue.url))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).valueOf() -
        new Date(left.updatedAt).valueOf(),
    )
    .slice(0, browserLimited ? 80 : 160);
  const profile = await client.get<UserResponse>(`/users/${user}`);
  const result: DashboardData = {
    schemaVersion: "1.0",
    accessMode: options.includePrivate ? "private" : "public",
    generatedAt: now.toISOString(),
    sourceUser: {
      login: profile.login,
      name: profile.name ?? profile.login,
      avatarUrl: profile.avatar_url,
      profileUrl: profile.html_url,
    },
    lookback: {
      days: config.lookbackDays,
      since,
      completedRetentionDays: config.completedRetentionDays,
    },
    projects,
    items,
    recentIssues,
    syncStatus: warnings.length > 0 ? "partial" : "success",
    rateLimit: client.getRateLimit(),
    warnings: [...new Set(warnings)],
  };
  return dashboardDataSchema.parse(result);
}
