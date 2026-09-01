import {
  AlertTriangle,
  CircleDot,
  GitPullRequest,
  Lightbulb,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { AccountPanel } from "./components/AccountPanel";
import { BrandMark } from "./components/BrandMark";
import { DashboardToolbar } from "./components/DashboardToolbar";
import { DetailPanel } from "./components/DetailPanel";
import { Header } from "./components/Header";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { RecentIssueTable } from "./components/RecentIssueTable";
import { RecentIssueToolbar } from "./components/RecentIssueToolbar";
import { WorkTable } from "./components/WorkTable";
import { loadDashboardData } from "./data/load-dashboard";
import {
  authIsConfigured,
  beginGitHubLogin,
  loadPrivateDashboard,
  logoutPrivateSession,
} from "./data/auth-client";
import {
  lookupPublicUser,
  publicUsernameIsValid,
  refreshPublicUser,
} from "./data/public-lookup";
import { STATE_LABELS } from "./domain/labels";
import type { DashboardData, WorkItem, WorkState } from "./domain/schema";
import {
  filterRecentIssues,
  filterWorkItems,
  type RecentIssueFilters,
  type WorkFilters,
} from "./domain/selectors";
import { isStale } from "./domain/time";

const initialFilters: WorkFilters = {
  state: "all",
  project: "all",
  type: "all",
  role: "all",
  query: "",
};

const initialIssueFilters: RecentIssueFilters = {
  project: "all",
  signal: "all",
  query: "",
};

type DashboardView = "work" | "issues";

type DataSource =
  | { mode: "snapshot" }
  | { mode: "public"; username: string }
  | { mode: "private" };

function initialDataSource(): DataSource {
  const params = new URLSearchParams(window.location.search);
  return params.get("auth") === "connected" && authIsConfigured()
    ? { mode: "private" }
    : { mode: "snapshot" };
}

function initialDarkMode(): boolean {
  const stored = window.localStorage.getItem("opensource-deck-theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function DashboardSummary({
  data,
  projectFilter,
  view,
}: {
  data: DashboardData;
  projectFilter: string | "all";
  view: DashboardView;
}) {
  const project =
    projectFilter === "all"
      ? null
      : data.projects.find(
          (candidate) => candidate.repository === projectFilter,
        );
  const inProject = (repository: string) =>
    projectFilter === "all" || repository === projectFilter;
  if (view === "issues") {
    const issues = data.recentIssues.filter((issue) =>
      inProject(issue.repository),
    );
    const linkedPullRequests = issues.filter((issue) =>
      issue.signals.includes("linked_pull_request"),
    ).length;
    const contributionLabels = issues.filter((issue) =>
      issue.signals.some((signal) =>
        ["good_first_issue", "help_wanted"].includes(signal),
      ),
    ).length;
    return (
      <div className="summary-band">
        <div className="summary-title">
          {project ? (
            <>
              <img src={project.avatarUrl} alt="" />
              <div>
                <span className="eyebrow">{project.owner}</span>
                <h1>{project.alias ?? project.name}</h1>
              </div>
            </>
          ) : (
            <div>
              <span className="eyebrow">参与项目的公开动态</span>
              <h1>近期可贡献 Issue</h1>
            </div>
          )}
        </div>
        <div className="summary-metrics" aria-label="近期 Issue 汇总">
          <div>
            <CircleDot size={16} />
            <strong>{issues.length}</strong>
            <span>近期 Issue</span>
          </div>
          <div>
            <GitPullRequest size={16} />
            <strong>{linkedPullRequests}</strong>
            <span>已有开放 PR</span>
          </div>
          <div>
            <Lightbulb size={16} />
            <strong>{contributionLabels}</strong>
            <span>贡献友好标签</span>
          </div>
        </div>
      </div>
    );
  }
  const actionable = data.items.filter(
    (item) => item.state === "needs_action" && inProject(item.repository),
  ).length;
  const waiting = data.items.filter(
    (item) => item.state === "waiting_upstream" && inProject(item.repository),
  ).length;
  const openPulls = data.items.filter(
    (item) =>
      item.type === "pull_request" &&
      item.sourceState === "open" &&
      inProject(item.repository),
  ).length;
  return (
    <div className="summary-band">
      <div className="summary-title">
        {project ? (
          <>
            <img src={project.avatarUrl} alt="" />
            <div>
              <span className="eyebrow">{project.owner}</span>
              <h1>{project.alias ?? project.name}</h1>
            </div>
          </>
        ) : (
          <div>
            <span className="eyebrow">开源贡献工作台</span>
            <h1>我的上游贡献</h1>
          </div>
        )}
      </div>
      <div className="summary-metrics" aria-label="贡献工作汇总">
        <div>
          <AlertTriangle size={16} />
          <strong>{actionable}</strong>
          <span>需要处理</span>
        </div>
        <div>
          <LoaderCircle size={16} />
          <strong>{waiting}</strong>
          <span>等待上游</span>
        </div>
        <div>
          <GitPullRequest size={16} />
          <strong>{openPulls}</strong>
          <span>开放 PR</span>
        </div>
      </div>
      {project?.nextAction && (
        <p className="project-next-action">{project.nextAction}</p>
      )}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [source, setSource] = useState<DataSource>(initialDataSource);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkFilters>(initialFilters);
  const [issueFilters, setIssueFilters] =
    useState<RecentIssueFilters>(initialIssueFilters);
  const [view, setView] = useState<DashboardView>("work");
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(initialDarkMode);
  const hasData = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const request =
      source.mode === "public"
        ? lookupPublicUser(source.username)
        : source.mode === "private"
          ? loadPrivateDashboard(controller.signal)
          : loadDashboardData(controller.signal);
    request
      .then((loaded) => {
        hasData.current = true;
        setData(loaded);
        setError(null);
        setDataError(null);
        setAccountError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          cause instanceof Error ? cause.message : "无法加载仪表盘数据。";
        if (hasData.current) setDataError(message);
        else setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setReloading(false);
      });
    return () => controller.abort();
  }, [reloadKey, source]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("auth")) {
      url.searchParams.delete("auth");
      window.history.replaceState({}, "", url);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.localStorage.setItem(
      "opensource-deck-theme",
      dark ? "dark" : "light",
    );
  }, [dark]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLocaleLowerCase() === "k"
      ) {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setSelected(null);
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const scopedForCounts = useMemo(
    () => filterWorkItems(data?.items ?? [], { ...filters, state: "all" }),
    [data?.items, filters],
  );
  const counts = useMemo(() => {
    const result: Record<WorkState | "all", number> = {
      all: scopedForCounts.length,
      needs_action: 0,
      waiting_upstream: 0,
      active: 0,
      completed: 0,
      snoozed: 0,
      unknown: 0,
    };
    for (const item of scopedForCounts) result[item.state] += 1;
    return result;
  }, [scopedForCounts]);
  const visibleItems = useMemo(
    () => filterWorkItems(data?.items ?? [], filters),
    [data?.items, filters],
  );
  const visibleIssues = useMemo(
    () => filterRecentIssues(data?.recentIssues ?? [], issueFilters),
    [data?.recentIssues, issueFilters],
  );
  const issueCounts = useMemo(() => {
    const scoped = filterRecentIssues(data?.recentIssues ?? [], {
      ...issueFilters,
      signal: "all",
      query: "",
    });
    return {
      all: scoped.length,
      unassigned: scoped.filter((issue) => issue.signals.includes("unassigned"))
        .length,
      contribution_label: scoped.filter((issue) =>
        issue.signals.some((signal) =>
          ["good_first_issue", "help_wanted"].includes(signal),
        ),
      ).length,
      linked_pull_request: scoped.filter((issue) =>
        issue.signals.includes("linked_pull_request"),
      ).length,
      assigned: scoped.filter((issue) => issue.signals.includes("assigned"))
        .length,
    };
  }, [data?.recentIssues, issueFilters]);
  const candidateCounts = useMemo(
    () =>
      Object.fromEntries(
        (data?.projects ?? []).map((project) => [
          project.repository,
          (data?.recentIssues ?? []).filter(
            (issue) => issue.repository === project.repository,
          ).length,
        ]),
      ),
    [data?.projects, data?.recentIssues],
  );

  if (!data && !error) {
    return (
      <main className="load-screen">
        <BrandMark />
        <LoaderCircle className="spin" size={22} />
        <p>正在加载开源贡献数据...</p>
      </main>
    );
  }

  if (!data && error) {
    return (
      <main className="load-screen load-error">
        <AlertTriangle size={28} />
        <h1>仪表盘数据暂不可用</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          重试
        </button>
      </main>
    );
  }

  if (!data) return null;
  const stale = isStale(data.generatedAt);
  return (
    <div className={`app-shell ${selected ? "detail-visible" : ""}`}>
      <Header
        data={data}
        dark={dark}
        onToggleTheme={() => setDark((value) => !value)}
        onOpenCommand={() => setPaletteOpen(true)}
        onOpenProjects={() => setSidebarOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onReload={() => {
          setReloading(true);
          setDataError(null);
          if (source.mode === "snapshot") {
            void refreshPublicUser(data)
              .then((loaded) => {
                setData(loaded);
                setError(null);
                setDataError(null);
              })
              .catch((cause: unknown) => {
                setDataError(
                  cause instanceof Error
                    ? cause.message
                    : "无法刷新公开 GitHub 状态。",
                );
              })
              .finally(() => setReloading(false));
          } else {
            setReloadKey((value) => value + 1);
          }
        }}
        reloading={reloading}
      />
      <ProjectSidebar
        projects={data.projects}
        selected={view === "work" ? filters.project : issueFilters.project}
        view={view}
        candidateCounts={candidateCounts}
        open={sidebarOpen}
        onSelect={(project) => {
          setFilters((current) => ({ ...current, project }));
          setIssueFilters((current) => ({ ...current, project }));
          setSelected(null);
        }}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="dashboard-main">
        {(dataError || data.syncStatus !== "success" || stale) && (
          <div
            className={`data-banner ${dataError || stale ? "banner-stale" : ""}`}
            role="status"
          >
            {dataError || stale ? (
              <AlertTriangle size={17} />
            ) : (
              <CircleDot size={17} />
            )}
            <span>
              {dataError ??
                (stale
                  ? "最近一次成功同步已超过两个同步周期。"
                  : data.warnings[0])}
            </span>
            {dataError ? (
              <small>保留上次成功数据</small>
            ) : data.warnings.length > 1 ? (
              <small>另有 {data.warnings.length - 1} 条</small>
            ) : null}
          </div>
        )}
        <DashboardSummary
          data={data}
          projectFilter={
            view === "work" ? filters.project : issueFilters.project
          }
          view={view}
        />
        <nav className="view-tabs" aria-label="工作台视图">
          <button
            type="button"
            className={view === "work" ? "view-active" : ""}
            onClick={() => setView("work")}
          >
            <GitPullRequest size={16} />
            我的贡献
          </button>
          <button
            type="button"
            className={view === "issues" ? "view-active" : ""}
            onClick={() => {
              setView("issues");
              setSelected(null);
            }}
          >
            <CircleDot size={16} />
            近期 Issue
            <span>{data.recentIssues.length}</span>
          </button>
        </nav>
        {view === "work" ? (
          <DashboardToolbar
            filters={filters}
            counts={counts}
            onChange={setFilters}
          />
        ) : (
          <RecentIssueToolbar
            filters={issueFilters}
            counts={issueCounts}
            onChange={setIssueFilters}
          />
        )}
        <div className="work-content">
          <div className="work-content-header">
            <span>
              {view === "work" ? visibleItems.length : visibleIssues.length} 项
            </span>
            <span>
              {view === "work"
                ? filters.state === "all"
                  ? "全部状态"
                  : STATE_LABELS[filters.state]
                : "近 30 天内更新"}
            </span>
          </div>
          {view === "work" ? (
            <WorkTable
              items={visibleItems}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          ) : (
            <RecentIssueTable issues={visibleIssues} />
          )}
        </div>
        <footer className="app-footer">
          <span>仅使用 GitHub 元数据</span>
          <span aria-hidden="true">/</span>
          <span>不会修改上游状态</span>
          <span className="footer-spacer" />
          <a
            href="https://github.com/ranxi2001/opensource-deck"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub 源码
          </a>
        </footer>
      </main>
      <DetailPanel item={selected} onClose={() => setSelected(null)} />
      <AccountPanel
        open={accountOpen}
        data={data}
        authConfigured={authIsConfigured()}
        busy={reloading}
        error={accountError}
        onClose={() => setAccountOpen(false)}
        onPublicLookup={(username) => {
          if (!publicUsernameIsValid(username)) {
            setAccountError("请输入有效的 GitHub 用户名。");
            return;
          }
          setReloading(true);
          setAccountError(null);
          setDataError(null);
          setFilters(initialFilters);
          setIssueFilters(initialIssueFilters);
          setSelected(null);
          setSource({ mode: "public", username: username.trim() });
          setAccountOpen(false);
        }}
        onConnectGitHub={() => beginGitHubLogin()}
        onUseSnapshot={() => {
          setReloading(true);
          setDataError(null);
          setFilters(initialFilters);
          setIssueFilters(initialIssueFilters);
          setSelected(null);
          setSource({ mode: "snapshot" });
          setAccountOpen(false);
        }}
        onLogout={() => {
          setReloading(true);
          logoutPrivateSession()
            .then(() => {
              setSource({ mode: "snapshot" });
              setAccountOpen(false);
            })
            .catch((cause: unknown) => {
              setReloading(false);
              setAccountError(
                cause instanceof Error ? cause.message : "退出登录失败。",
              );
            });
        }}
      />
      {paletteOpen && (
        <CommandPalette
          open
          projects={data.projects}
          items={data.items}
          onClose={() => setPaletteOpen(false)}
          onSelectProject={(project) => {
            setFilters({ ...initialFilters, project });
            setSelected(null);
          }}
          onSelectItem={(item) => {
            setFilters({ ...initialFilters, project: item.repository });
            setSelected(item);
          }}
        />
      )}
    </div>
  );
}
