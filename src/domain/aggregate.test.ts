import { describe, expect, it } from "vitest";
import sample from "../../public/data/dashboard.json";
import { buildProjects, mergeWorkItems } from "./aggregate";
import { dashboardDataSchema, type WorkItem } from "./schema";

const parsed = dashboardDataSchema.parse(sample);

describe("dashboard aggregation", () => {
  it("parses the committed public sample against the versioned schema", () => {
    expect(parsed.accessMode).toBe("public");
    expect(parsed.projects.length).toBeGreaterThan(3);
  });

  it("merges discovery roles and facts by stable identity", () => {
    const original = parsed.items[0] as WorkItem;
    const merged = mergeWorkItems([
      original,
      {
        ...original,
        roles: ["involved"],
        sourceFacts: ["Recent involvement"],
        updatedAt: "2026-08-30T05:00:00.000Z",
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.roles).toEqual(
      expect.arrayContaining(["author", "involved"]),
    );
    expect(merged[0]?.sourceFacts).toEqual(
      expect.arrayContaining(["Authored pull request", "Recent involvement"]),
    );
  });

  it("preserves private visibility and counts when building projects", () => {
    const item = parsed.items[0] as WorkItem;
    const metadata = new Map([
      [
        item.repository,
        {
          repository: item.repository,
          visibility: "private" as const,
          description: "Private project",
          url: item.links.repository,
          avatarUrl: parsed.projects[0]!.avatarUrl,
        },
      ],
    ]);
    const projects = buildProjects([item], metadata, {});
    expect(projects[0]?.visibility).toBe("private");
    expect(projects[0]?.counts.needs_action).toBe(1);
  });
});
