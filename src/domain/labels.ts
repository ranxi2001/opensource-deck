import type { ReasonCode, Role, WorkState } from "./schema";

export const STATE_LABELS: Record<WorkState, string> = {
  needs_action: "Needs action",
  waiting_upstream: "Waiting upstream",
  active: "Active",
  completed: "Completed",
  snoozed: "Snoozed",
  unknown: "Unknown",
};

export const REASON_LABELS: Record<ReasonCode, string> = {
  manual_snooze: "Snoozed by public configuration",
  manual_waiting: "Waiting state set by public configuration",
  manual_active: "Active state set by public configuration",
  item_merged: "Pull request merged",
  item_closed: "Issue or pull request closed",
  ci_failure: "Current head has a failing check",
  ci_pending: "Current head has checks in progress",
  changes_requested: "A reviewer requested changes",
  review_requested: "Your review was requested",
  assigned_external_update: "Assigned item has a newer external activity",
  mentioned_external_update: "Mentioned item has a newer external activity",
  merge_conflict: "Pull request reports a merge conflict",
  last_activity_by_user: "Last visible relevant activity is yours",
  open_unowned: "Open with no confirmed next-action owner",
  data_incomplete: "Some enrichment data was unavailable",
};

export const ROLE_LABELS: Record<Role, string> = {
  author: "Author",
  assignee: "Assigned",
  review_requested: "Review requested",
  reviewed: "Reviewed",
  mentioned: "Mentioned",
  involved: "Involved",
};
