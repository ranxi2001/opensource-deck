import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CircleHelp,
  Eye,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  Minus,
} from "lucide-react";
import {
  ITEM_TYPE_LABELS,
  MERGE_LABELS,
  REVIEW_LABELS,
  ROLE_LABELS,
  STATE_LABELS,
} from "../domain/labels";
import type { Role, WorkItem, WorkState } from "../domain/schema";

export function TypeDecorator({ type }: { type: WorkItem["type"] }) {
  const label = ITEM_TYPE_LABELS[type];
  return (
    <span
      className={`type-decorator type-decorator-${type}`}
      aria-label={`类型：${label}`}
      title={label}
    >
      {type === "pull_request" ? (
        <GitPullRequest size={17} aria-hidden="true" />
      ) : (
        <CircleDot size={17} aria-hidden="true" />
      )}
      <span>{type === "pull_request" ? "PR" : "Issue"}</span>
    </span>
  );
}

export function RoleDecorator({ role }: { role: Role }) {
  const label = ROLE_LABELS[role];
  return (
    <span
      className={`decorator role-decorator role-decorator-${role}`}
      title={`你的角色：${label}`}
    >
      {label}
    </span>
  );
}

export function StateDecorator({ state }: { state: WorkState }) {
  const label = STATE_LABELS[state];
  return (
    <span
      className={`decorator state-decorator state-decorator-${state}`}
      title={`队列状态：${label}`}
    >
      <span className={`state-dot state-${state}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function ReviewIcon({ decision }: { decision: WorkItem["reviewDecision"] }) {
  if (decision === "approved")
    return <CheckCircle2 size={13} aria-hidden="true" />;
  if (decision === "changes_requested")
    return <AlertTriangle size={13} aria-hidden="true" />;
  if (decision === "review_required")
    return <Eye size={13} aria-hidden="true" />;
  if (decision === "unknown")
    return <CircleHelp size={13} aria-hidden="true" />;
  return <Minus size={13} aria-hidden="true" />;
}

export function ReviewDecorator({
  decision,
}: {
  decision: WorkItem["reviewDecision"];
}) {
  const label = REVIEW_LABELS[decision];
  return (
    <span
      className={`decorator status-decorator review-decorator review-decorator-${decision}`}
      title={`审阅状态：${label}`}
    >
      <ReviewIcon decision={decision} />
      {label}
    </span>
  );
}

function MergeIcon({ status }: { status: WorkItem["mergeable"] }) {
  if (status === "mergeable") return <GitMerge size={13} aria-hidden="true" />;
  if (status === "conflicting")
    return <GitPullRequestClosed size={13} aria-hidden="true" />;
  if (status === "unknown") return <CircleHelp size={13} aria-hidden="true" />;
  return <Minus size={13} aria-hidden="true" />;
}

export function MergeDecorator({ status }: { status: WorkItem["mergeable"] }) {
  const label = MERGE_LABELS[status];
  return (
    <span
      className={`decorator status-decorator merge-decorator merge-decorator-${status}`}
      title={`可合并状态：${label}`}
    >
      <MergeIcon status={status} />
      {label}
    </span>
  );
}
