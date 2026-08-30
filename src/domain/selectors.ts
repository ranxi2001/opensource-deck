import type { ItemType, Role, WorkItem, WorkState } from "./schema";

export interface WorkFilters {
  state: WorkState | "all";
  project: string | "all";
  type: ItemType | "all";
  role: Role | "all";
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
