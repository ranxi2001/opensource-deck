import { ListFilter, Search, X } from "lucide-react";
import type { RecentIssueFilters } from "../domain/selectors";

interface RecentIssueToolbarProps {
  filters: RecentIssueFilters;
  counts: Record<RecentIssueToolbarSignal, number>;
  onChange: (next: RecentIssueFilters) => void;
}

type RecentIssueToolbarSignal =
  | "all"
  | "unassigned"
  | "contribution_label"
  | "linked_pull_request"
  | "assigned";

const options: Array<{
  value: RecentIssueToolbarSignal;
  label: string;
}> = [
  { value: "all", label: "全部 Issue" },
  { value: "unassigned", label: "未指派" },
  { value: "contribution_label", label: "贡献友好标签" },
  { value: "linked_pull_request", label: "已有 PR" },
  { value: "assigned", label: "已指派" },
];

export function RecentIssueToolbar({
  filters,
  counts,
  onChange,
}: RecentIssueToolbarProps) {
  return (
    <div className="dashboard-toolbar issue-toolbar">
      <div className="queue-tabs" role="tablist" aria-label="近期 Issue 筛选">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={filters.signal === option.value}
            className={filters.signal === option.value ? "queue-active" : ""}
            onClick={() => onChange({ ...filters, signal: option.value })}
          >
            <span>{option.label}</span>
            <span className="queue-count">{counts[option.value]}</span>
          </button>
        ))}
      </div>
      <div className="filter-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">搜索近期 Issue</span>
          <input
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
            placeholder="搜索标题、仓库、标签或作者..."
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
        <span className="issue-signal-note">
          <ListFilter size={15} />
          仅依据公开指派、关联 PR 与标签信号
        </span>
      </div>
    </div>
  );
}
