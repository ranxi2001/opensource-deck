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
      <div className="queue-tabs" role="tablist" aria-label="Work queues">
        {queueOrder.map((state) => (
          <button
            key={state}
            type="button"
            role="tab"
            aria-selected={filters.state === state}
            className={filters.state === state ? "queue-active" : ""}
            onClick={() => onChange({ ...filters, state })}
          >
            <span>{state === "all" ? "All work" : STATE_LABELS[state]}</span>
            <span className="queue-count">{counts[state]}</span>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search work</span>
          <input
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="Search title, repo, label..."
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: "" })}
              aria-label="Clear search"
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
          <span className="sr-only">Item type</span>
          <select
            value={filters.type}
            onChange={(event) =>
              onChange({
                ...filters,
                type: event.target.value as WorkFilters["type"],
              })
            }
          >
            <option value="all">All items</option>
            <option value="pull_request">Pull requests</option>
            <option value="issue">Issues</option>
          </select>
        </label>
        <label className="select-control">
          <ListFilter size={15} />
          <span className="sr-only">Your role</span>
          <select
            value={filters.role}
            onChange={(event) =>
              onChange({ ...filters, role: event.target.value as Role | "all" })
            }
          >
            <option value="all">Any role</option>
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
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
