import type {
  Activity,
  ChecksSummary,
  ReasonCode,
  Role,
  WorkState,
} from "./schema";

export interface ClassificationInput {
  sourceState: "open" | "closed" | "merged";
  roles: Role[];
  reviewDecision:
    "approved" | "changes_requested" | "review_required" | "none" | "unknown";
  checks: ChecksSummary;
  mergeable: "mergeable" | "conflicting" | "unknown" | "not_applicable";
  latestActivity: Activity | null;
  warnings: string[];
  override?: {
    state: "snoozed" | "active" | "waiting_upstream";
    until?: string;
  };
  now?: Date;
}

export interface Classification {
  state: WorkState;
  reasonCodes: ReasonCode[];
}

function overrideIsActive(
  override: ClassificationInput["override"],
  now: Date,
): override is NonNullable<ClassificationInput["override"]> {
  if (!override) return false;
  if (!override.until) return true;
  const until = new Date(`${override.until}T23:59:59.999Z`);
  return !Number.isNaN(until.valueOf()) && until >= now;
}

export function classifyWorkItem(input: ClassificationInput): Classification {
  const reasons: ReasonCode[] = [];

  if (input.sourceState === "merged")
    return { state: "completed", reasonCodes: ["item_merged"] };
  if (input.sourceState === "closed")
    return { state: "completed", reasonCodes: ["item_closed"] };

  if (input.checks.status === "failure" && input.roles.includes("author"))
    reasons.push("ci_failure");
  if (input.checks.status === "pending") reasons.push("ci_pending");
  if (
    input.reviewDecision === "changes_requested" &&
    input.roles.includes("author")
  )
    reasons.push("changes_requested");
  if (input.roles.includes("review_requested"))
    reasons.push("review_requested");
  if (input.mergeable === "conflicting" && input.roles.includes("author"))
    reasons.push("merge_conflict");
  if (
    input.roles.includes("assignee") &&
    input.latestActivity &&
    !input.latestActivity.byUser
  ) {
    reasons.push("assigned_external_update");
  }
  if (
    input.roles.includes("mentioned") &&
    input.latestActivity &&
    !input.latestActivity.byUser
  ) {
    reasons.push("mentioned_external_update");
  }
  if (input.warnings.length > 0) reasons.push("data_incomplete");

  const now = input.now ?? new Date();
  if (overrideIsActive(input.override, now)) {
    const manualReason: ReasonCode =
      input.override.state === "snoozed"
        ? "manual_snooze"
        : input.override.state === "waiting_upstream"
          ? "manual_waiting"
          : "manual_active";
    return {
      state: input.override.state,
      reasonCodes: [manualReason, ...new Set(reasons)],
    };
  }

  const actionReasons = reasons.filter((reason) =>
    [
      "ci_failure",
      "changes_requested",
      "review_requested",
      "assigned_external_update",
      "mentioned_external_update",
      "merge_conflict",
    ].includes(reason),
  );
  if (actionReasons.length > 0)
    return { state: "needs_action", reasonCodes: [...new Set(reasons)] };

  if (input.warnings.length > 0) {
    return {
      state: "unknown",
      reasonCodes: [...new Set(reasons)],
    };
  }

  if (input.latestActivity?.byUser) {
    return {
      state: "waiting_upstream",
      reasonCodes: ["last_activity_by_user", ...new Set(reasons)],
    };
  }

  return {
    state: "active",
    reasonCodes: ["open_unowned", ...new Set(reasons)],
  };
}
