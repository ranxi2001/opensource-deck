import { describe, expect, it } from "vitest";
import sample from "../../public/data/dashboard.json";
import { dashboardDataSchema } from "./schema";
import { filterWorkItems } from "./selectors";

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
