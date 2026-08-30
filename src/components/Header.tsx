import {
  Command,
  Globe2,
  LockKeyhole,
  Menu,
  Moon,
  PanelsTopLeft,
  RefreshCw,
  Sun,
} from "lucide-react";
import type { DashboardData } from "../domain/schema";
import { relativeTime } from "../domain/time";

interface HeaderProps {
  data: DashboardData;
  dark: boolean;
  onToggleTheme: () => void;
  onOpenCommand: () => void;
  onOpenProjects: () => void;
  onOpenAccount: () => void;
  onReload: () => void;
  reloading: boolean;
}

export function Header({
  data,
  dark,
  onToggleTheme,
  onOpenCommand,
  onOpenProjects,
  onOpenAccount,
  onReload,
  reloading,
}: HeaderProps) {
  return (
    <header className="app-header">
      <button
        className="icon-button mobile-only"
        type="button"
        onClick={onOpenProjects}
        aria-label="Open projects"
        title="Projects"
      >
        <Menu size={19} />
      </button>
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        aria-label="OpenSourceDeck home"
      >
        <span className="brand-mark" aria-hidden="true">
          <PanelsTopLeft size={19} />
        </span>
        <span className="brand-name">OpenSourceDeck</span>
      </a>
      <div className="header-context">
        <span
          className={`sync-indicator sync-${data.syncStatus}`}
          aria-hidden="true"
        />
        <span>{data.projects.length} projects</span>
        <span className="header-separator">/</span>
        <span>{data.items.length} items</span>
        <span className="header-separator">/</span>
        <span>{data.accessMode} view</span>
        <span className="header-separator">/</span>
        <span title={new Date(data.generatedAt).toLocaleString()}>
          synced {relativeTime(data.generatedAt)}
        </span>
      </div>
      <div className="header-actions">
        <button
          className="command-button"
          type="button"
          onClick={onOpenCommand}
          aria-label="Search projects and work"
        >
          <Command size={17} />
          <span>Find anything</span>
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onReload}
          aria-label="Reload dashboard data"
          title="Reload data"
          disabled={reloading}
        >
          <RefreshCw size={18} className={reloading ? "spin" : undefined} />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label={dark ? "Use light theme" : "Use dark theme"}
          title={dark ? "Light theme" : "Dark theme"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="profile-link profile-button"
          type="button"
          onClick={onOpenAccount}
          aria-label="Change GitHub data access"
          title={`${data.sourceUser.login} / ${data.accessMode}`}
        >
          <img src={data.sourceUser.avatarUrl} alt="" />
          {data.accessMode === "private" ? (
            <LockKeyhole size={14} aria-hidden="true" />
          ) : (
            <Globe2 size={14} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
