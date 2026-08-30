import {
  EMPTY_COUNTS,
  type Project,
  type WorkItem,
  type WorkState,
} from "./schema";

export interface RepositoryMetadata {
  repository: string;
  visibility: "public" | "private";
  description: string;
  url: string;
  avatarUrl: string;
  forkUrl?: string;
}

export function mergeWorkItems(items: WorkItem[]): WorkItem[] {
  const merged = new Map<string, WorkItem>();
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
      reasonCodes: [...new Set([...current.reasonCodes, ...item.reasonCodes])],
      sourceFacts: [...new Set([...current.sourceFacts, ...item.sourceFacts])],
      warnings: [...new Set([...current.warnings, ...item.warnings])],
    });
  }
  return [...merged.values()].sort(
    (left, right) =>
      new Date(right.updatedAt).valueOf() - new Date(left.updatedAt).valueOf(),
  );
}

export function buildProjects(
  items: WorkItem[],
  metadata: Map<string, RepositoryMetadata>,
  config: Record<
    string,
    { pinned: boolean; alias?: string; nextAction?: string; hidden: boolean }
  >,
): Project[] {
  const grouped = new Map<string, WorkItem[]>();
  for (const item of items) {
    const group = grouped.get(item.repository) ?? [];
    group.push(item);
    grouped.set(item.repository, group);
  }

  const projects: Project[] = [];
  for (const [repository, work] of grouped) {
    const setting = config[repository];
    if (setting?.hidden) continue;
    const [owner, name] = repository.split("/") as [string, string];
    const details = metadata.get(repository) ?? {
      repository,
      visibility: "public",
      description: "Repository metadata was unavailable during the last sync.",
      url: `https://github.com/${repository}`,
      avatarUrl: `https://github.com/${owner}.png?size=96`,
    };
    const counts = { ...EMPTY_COUNTS } as Record<WorkState, number>;
    for (const item of work) counts[item.state] += 1;
    const updatedAt = work.reduce(
      (latest, item) => (item.updatedAt > latest ? item.updatedAt : latest),
      work[0]?.updatedAt ?? new Date(0).toISOString(),
    );
    projects.push({
      repository,
      visibility: details.visibility,
      name,
      owner,
      alias: setting?.alias,
      description: details.description,
      url: details.url,
      avatarUrl: details.avatarUrl,
      forkUrl: details.forkUrl,
      pinned: setting?.pinned ?? false,
      nextAction: setting?.nextAction,
      updatedAt,
      counts,
      links: {
        repository: details.url,
        issues: `${details.url}/issues`,
        pulls: `${details.url}/pulls`,
        actions: `${details.url}/actions`,
        fork: details.forkUrl,
      },
    });
  }

  return projects.sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
    const leftActions = left.counts.needs_action;
    const rightActions = right.counts.needs_action;
    if (leftActions !== rightActions) return rightActions - leftActions;
    return (
      new Date(right.updatedAt).valueOf() - new Date(left.updatedAt).valueOf()
    );
  });
}
