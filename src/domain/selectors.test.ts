import { describe, expect, it } from "vitest";
import sample from "../../public/data/dashboard.json";
import { dashboardDataSchema } from "./schema";
import { filterRecentIssues, filterWorkItems } from "./selectors";

const items = dashboardDataSchema.parse(sample).items;

describe("filterWorkItems", () => {
  it("composes queue, project, type, role, and text filters", () => {
    const results = filterWorkItems(items, {
      state: "waiting_upstream",
      project: "bytedance/deer-flow",
      type: "issue",
      role: "involved",
      query: "generation",
    });
    expect(results.map((item) => item.number)).toEqual([5093]);
  });

  it("searches labels and issue numbers", () => {
    expect(
      filterWorkItems(items, {
        state: "all",
        project: "all",
        type: "all",
        role: "all",
        query: "storage",
      }),
    ).toHaveLength(1);
  });
});

describe("filterRecentIssues", () => {
  it("filters and searches linked pull request evidence", () => {
    const issues = dashboardDataSchema.parse(sample).recentIssues;
    expect(
      filterRecentIssues(issues, {
        project: "all",
        signal: "linked_pull_request",
        query: "#5120",
      }).map((issue) => issue.number),
    ).toEqual([5101]);
  });

  it("treats legacy snapshots as not checked instead of no linked PR", () => {
    const legacy = structuredClone(sample) as Record<string, unknown>;
    const recentIssues = legacy.recentIssues as Array<Record<string, unknown>>;
    delete recentIssues[0]?.linkedPullRequests;
    delete recentIssues[0]?.linkedPullRequestStatus;
    const parsed = dashboardDataSchema.parse(legacy);
    expect(parsed.recentIssues[0]?.linkedPullRequests).toEqual([]);
    expect(parsed.recentIssues[0]?.linkedPullRequestStatus).toBe("not_checked");
  });
});
