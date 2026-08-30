import { CircleDot, GitPullRequest, ListFilter, Search, X } from "lucide-react";
import { ROLE_LABELS, STATE_LABELS } from "../domain/labels";
import type { Role, WorkState } from "../domain/schema";
import type { WorkFilters } from "../domain/selectors";

const queueOrder: Array<WorkState | "all"> = [
  "all",
  "needs_action",
  "waiting_upstream",
  "active",
  "completed",
];

interface DashboardToolbarProps {
  filters: WorkFilters;
  counts: Record<WorkState | "all", number>;
  onChange: (next: WorkFilters) => void;
}

export function DashboardToolbar({
  filters,
  counts,
  onChange,
}: DashboardToolbarProps) {
  const hasSecondaryFilter =
    filters.type !== "all" || filters.role !== "all" || Boolean(filters.query);
  return (
    <div className="dashboard-toolbar">
      <div className="queue-tabs" role="tablist" aria-label="贡献队列">
        {queueOrder.map((state) => (
          <button
            key={state}
            type="button"
            role="tab"
            aria-selected={filters.state === state}
            className={filters.state === state ? "queue-active" : ""}
            onClick={() => onChange({ ...filters, state })}
          >
            <span>{state === "all" ? "全部贡献" : STATE_LABELS[state]}</span>
            <span className="queue-count">{counts[state]}</span>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">搜索贡献</span>
          <input
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="搜索标题、仓库或标签..."
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: "" })}
              aria-label="清空搜索"
            >
              <X size={15} />
            </button>
          )}
        </label>
        <label className="select-control">
          {filters.type === "pull_request" ? (
            <GitPullRequest size={15} />
          ) : (
            <CircleDot size={15} />
          )}
          <span className="sr-only">项目类型</span>
          <select
            value={filters.type}
            onChange={(event) =>
              onChange({
                ...filters,
                type: event.target.value as WorkFilters["type"],
              })
            }
          >
            <option value="all">全部类型</option>
            <option value="pull_request">Pull Request</option>
            <option value="issue">Issue</option>
          </select>
        </label>
        <label className="select-control">
          <ListFilter size={15} />
          <span className="sr-only">你的角色</span>
          <select
            value={filters.role}
            onChange={(event) =>
              onChange({ ...filters, role: event.target.value as Role | "all" })
            }
          >
            <option value="all">全部角色</option>
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {hasSecondaryFilter && (
          <button
            className="clear-filter-button"
            type="button"
            onClick={() =>
              onChange({ ...filters, query: "", type: "all", role: "all" })
            }
          >
            <X size={14} />
            清除筛选
          </button>
        )}
      </div>
    </div>
  );
}
