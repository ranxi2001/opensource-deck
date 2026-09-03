import { describe, expect, it } from "vitest";
import { classifyWorkItem, type ClassificationInput } from "./classifier";

const base: ClassificationInput = {
  sourceState: "open",
  roles: ["author"],
  reviewDecision: "none",
  checks: {
    status: "unavailable",
    total: 0,
    success: 0,
    failure: 0,
    pending: 0,
    jobs: [],
  },
  mergeable: "unknown",
  latestActivity: null,
  warnings: [],
  now: new Date("2026-08-30T00:00:00Z"),
};

describe("classifyWorkItem", () => {
  it("makes terminal state authoritative", () => {
    expect(classifyWorkItem({ ...base, sourceState: "merged" })).toEqual({
      state: "completed",
      reasonCodes: ["item_merged"],
    });
  });

  it("surfaces failing CI and requested changes as action", () => {
    const result = classifyWorkItem({
      ...base,
      reviewDecision: "changes_requested",
      checks: {
        status: "failure",
        total: 1,
        success: 0,
        failure: 1,
        pending: 0,
        jobs: [],
      },
    });
    expect(result.state).toBe("needs_action");
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(["ci_failure", "changes_requested"]),
    );
  });

  it("does not assign an upstream pull request's CI failure to a reviewer", () => {
    const result = classifyWorkItem({
      ...base,
      roles: ["reviewed"],
      reviewDecision: "changes_requested",
      mergeable: "conflicting",
      checks: {
        status: "failure",
        total: 1,
        success: 0,
        failure: 1,
        pending: 0,
        jobs: [],
      },
    });
    expect(result).toEqual({
      state: "active",
      reasonCodes: ["open_unowned"],
    });
  });

  it("keeps source facts visible under a manual snooze", () => {
    const result = classifyWorkItem({
      ...base,
      checks: {
        status: "failure",
        total: 1,
        success: 0,
        failure: 1,
        pending: 0,
        jobs: [],
      },
      override: { state: "snoozed", until: "2026-09-01" },
    });
    expect(result).toEqual({
      state: "snoozed",
      reasonCodes: ["manual_snooze", "ci_failure"],
    });
  });

  it("uses visible activity order without claiming maintainer ownership", () => {
    const result = classifyWorkItem({
      ...base,
      latestActivity: {
        actor: "octocat",
        at: "2026-08-29T12:00:00.000Z",
        kind: "commented",
        byUser: true,
      },
    });
    expect(result).toEqual({
      state: "waiting_upstream",
      reasonCodes: ["last_activity_by_user"],
    });
  });

  it("surfaces external activity after the user participated", () => {
    expect(
      classifyWorkItem({
        ...base,
        roles: ["involved"],
        latestActivity: {
          actor: "maintainer",
          at: "2026-08-29T18:00:00.000Z",
          kind: "commented",
          byUser: false,
        },
      }),
    ).toEqual({
      state: "needs_action",
      reasonCodes: ["involved_external_update"],
    });
  });

  it("does not turn missing enrichment into success", () => {
    expect(
      classifyWorkItem({
        ...base,
        latestActivity: {
          actor: "octocat",
          at: "2026-08-29T12:00:00.000Z",
          kind: "commented",
          byUser: true,
        },
        warnings: ["checks unavailable"],
      }),
    ).toEqual({
      state: "unknown",
      reasonCodes: ["data_incomplete"],
    });
  });
});
