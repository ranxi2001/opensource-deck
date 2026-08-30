import {
  AlertTriangle,
  CircleDot,
  GitPullRequest,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CommandPalette } from "./components/CommandPalette";
import { AccountPanel } from "./components/AccountPanel";
import { DashboardToolbar } from "./components/DashboardToolbar";
import { DetailPanel } from "./components/DetailPanel";
import { Header } from "./components/Header";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { WorkTable } from "./components/WorkTable";
import { loadDashboardData } from "./data/load-dashboard";
import {
  authIsConfigured,
  beginGitHubLogin,
  loadPrivateDashboard,
  logoutPrivateSession,
} from "./data/auth-client";
import { lookupPublicUser, publicUsernameIsValid } from "./data/public-lookup";
import { STATE_LABELS } from "./domain/labels";
import type { DashboardData, WorkItem, WorkState } from "./domain/schema";
import { filterWorkItems, type WorkFilters } from "./domain/selectors";
import { isStale } from "./domain/time";

const initialFilters: WorkFilters = {
  state: "all",
  project: "all",
  type: "all",
  role: "all",
  query: "",
};

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
  filters,
}: {
  data: DashboardData;
  filters: WorkFilters;
}) {
  const project =
    filters.project === "all"
      ? null
      : data.projects.find(
          (candidate) => candidate.repository === filters.project,
        );
  const actionable = data.items.filter(
    (item) =>
      item.state === "needs_action" &&
      (filters.project === "all" || item.repository === filters.project),
  ).length;
  const waiting = data.items.filter(
    (item) =>
      item.state === "waiting_upstream" &&
      (filters.project === "all" || item.repository === filters.project),
  ).length;
  const openPulls = data.items.filter(
    (item) =>
      item.type === "pull_request" &&
      item.sourceState === "open" &&
      (filters.project === "all" || item.repository === filters.project),
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
            <span className="eyebrow">Public contribution workspace</span>
            <h1>All upstream work</h1>
          </div>
        )}
      </div>
      <div className="summary-metrics" aria-label="Workspace totals">
        <div>
          <AlertTriangle size={16} />
          <strong>{actionable}</strong>
          <span>need action</span>
        </div>
        <div>
          <LoaderCircle size={16} />
          <strong>{waiting}</strong>
          <span>waiting</span>
        </div>
        <div>
          <GitPullRequest size={16} />
          <strong>{openPulls}</strong>
          <span>open PRs</span>
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
  const [reloadKey, setReloadKey] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [source, setSource] = useState<DataSource>(initialDataSource);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkFilters>(initialFilters);
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
        setAccountError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          cause instanceof Error
            ? cause.message
            : "Dashboard data could not be loaded.";
        if (hasData.current) setAccountError(message);
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

  if (!data && !error) {
    return (
      <main className="load-screen">
        <span className="brand-mark">
          <CircleDot size={20} />
        </span>
        <LoaderCircle className="spin" size={22} />
        <p>Loading public contribution data...</p>
      </main>
    );
  }

  if (!data && error) {
    return (
      <main className="load-screen load-error">
        <AlertTriangle size={28} />
        <h1>Dashboard data is unavailable</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Try again
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
          setReloadKey((value) => value + 1);
        }}
        reloading={reloading}
      />
      <ProjectSidebar
        projects={data.projects}
        selected={filters.project}
        open={sidebarOpen}
        onSelect={(project) => {
          setFilters((current) => ({ ...current, project }));
          setSelected(null);
        }}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="dashboard-main">
        {(data.syncStatus !== "success" || stale) && (
          <div
            className={`data-banner ${stale ? "banner-stale" : ""}`}
            role="status"
          >
            {stale ? <AlertTriangle size={17} /> : <CircleDot size={17} />}
            <span>
              {stale
                ? "The last successful data artifact is older than two sync intervals."
                : data.warnings[0]}
            </span>
            {data.warnings.length > 1 && (
              <small>+{data.warnings.length - 1} more</small>
            )}
          </div>
        )}
        <DashboardSummary data={data} filters={filters} />
        <DashboardToolbar
          filters={filters}
          counts={counts}
          onChange={setFilters}
        />
        <div className="work-content">
          <div className="work-content-header">
            <span>
              {visibleItems.length}{" "}
              {visibleItems.length === 1 ? "item" : "items"}
            </span>
            <span>
              {filters.state === "all"
                ? "All states"
                : STATE_LABELS[filters.state]}
            </span>
          </div>
          <WorkTable
            items={visibleItems}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>
        <footer className="app-footer">
          <span>Public GitHub metadata only</span>
          <span aria-hidden="true">/</span>
          <span>No upstream mutations</span>
          <span className="footer-spacer" />
          <a
            href="https://github.com/ranxi2001/opensource-deck"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source on GitHub
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
            setAccountError("Enter a valid GitHub username.");
            return;
          }
          setReloading(true);
          setAccountError(null);
          setFilters(initialFilters);
          setSelected(null);
          setSource({ mode: "public", username: username.trim() });
          setAccountOpen(false);
        }}
        onConnectGitHub={() => beginGitHubLogin()}
        onUseSnapshot={() => {
          setReloading(true);
          setFilters(initialFilters);
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
                cause instanceof Error ? cause.message : "Logout failed.",
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
