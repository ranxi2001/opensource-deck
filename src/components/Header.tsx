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
        aria-label="打开项目列表"
        title="项目"
      >
        <Menu size={19} />
      </button>
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        aria-label="OpenSourceDeck 首页"
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
        <span>{data.projects.length} 个项目</span>
        <span className="header-separator">/</span>
        <span>{data.items.length} 项贡献</span>
        <span className="header-separator">/</span>
        <span>{data.accessMode === "private" ? "私有" : "公开"}视图</span>
        <span className="header-separator">/</span>
        <span title={new Date(data.generatedAt).toLocaleString()}>
          同步于 {relativeTime(data.generatedAt)}
        </span>
      </div>
      <div className="header-actions">
        <button
          className="command-button"
          type="button"
          onClick={onOpenCommand}
          aria-label="搜索项目和贡献"
        >
          <Command size={17} />
          <span>快速查找</span>
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onReload}
          aria-label="重新加载仪表盘数据"
          title="重新加载"
          disabled={reloading}
        >
          <RefreshCw size={18} className={reloading ? "spin" : undefined} />
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label={dark ? "切换到浅色主题" : "切换到深色主题"}
          title={dark ? "浅色主题" : "深色主题"}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="profile-link profile-button"
          type="button"
          onClick={onOpenAccount}
          aria-label="切换 GitHub 数据来源"
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
