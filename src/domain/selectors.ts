import type {
  IssueSignal,
  ItemType,
  RecentIssue,
  Role,
  WorkItem,
  WorkState,
} from "./schema";

export interface WorkFilters {
  state: WorkState | "all";
  project: string | "all";
  type: ItemType | "all";
  role: Role | "all";
  query: string;
}

export type RecentIssueSignalFilter =
  "all" | "unassigned" | "contribution_label" | "assigned";

export interface RecentIssueFilters {
  project: string | "all";
  signal: RecentIssueSignalFilter;
  query: string;
}

export function filterWorkItems(
  items: WorkItem[],
  filters: WorkFilters,
): WorkItem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (filters.state !== "all" && item.state !== filters.state) return false;
    if (filters.project !== "all" && item.repository !== filters.project)
      return false;
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (filters.role !== "all" && !item.roles.includes(filters.role))
      return false;
    if (!query) return true;
    return [
      item.repository,
      item.title,
      `#${item.number}`,
      ...item.labels,
      ...item.assignees,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
}

const contributionSignals: IssueSignal[] = ["good_first_issue", "help_wanted"];

export function filterRecentIssues(
  issues: RecentIssue[],
  filters: RecentIssueFilters,
): RecentIssue[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return issues.filter((issue) => {
    if (filters.project !== "all" && issue.repository !== filters.project)
      return false;
    if (
      filters.signal === "contribution_label" &&
      !contributionSignals.some((signal) => issue.signals.includes(signal))
    )
      return false;
    if (
      filters.signal !== "all" &&
      filters.signal !== "contribution_label" &&
      !issue.signals.includes(filters.signal)
    )
      return false;
    if (!query) return true;
    return [
      issue.repository,
      issue.title,
      `#${issue.number}`,
      issue.author,
      ...issue.labels,
      ...issue.assignees,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });
}
