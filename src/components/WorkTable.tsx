import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  GitPullRequest,
  LoaderCircle,
  MessageSquareText,
} from "lucide-react";
import { REASON_LABELS, ROLE_LABELS, STATE_LABELS } from "../domain/labels";
import type { WorkItem } from "../domain/schema";
import { relativeTime } from "../domain/time";

interface WorkTableProps {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
}

function Checks({ item }: { item: WorkItem }) {
  const label =
    item.checks.status === "failure"
      ? `${item.checks.failure} failing checks`
      : item.checks.status === "pending"
        ? `${item.checks.pending} pending checks`
        : item.checks.status === "success"
          ? `${item.checks.success} successful checks`
          : "Checks unavailable";
  return (
    <span
      className={`checks checks-${item.checks.status}`}
      title={label}
      aria-label={label}
      role="img"
    >
      {item.checks.status === "failure" && <AlertCircle size={15} />}
      {item.checks.status === "pending" && <LoaderCircle size={15} />}
      {item.checks.status === "success" && <CheckCircle2 size={15} />}
      {item.checks.status === "unavailable" && (
        <span className="checks-empty">-</span>
      )}
    </span>
  );
}

export function WorkTable({ items, selectedId, onSelect }: WorkTableProps) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle2 size={28} />
        <h3>No work matches this view</h3>
        <p>
          Change the queue, project, or filters to inspect other public
          activity.
        </p>
      </div>
    );
  }

  return (
    <div
      className="work-table"
      role="table"
      aria-label="Contribution work items"
    >
      <div className="work-header" role="row">
        <span role="columnheader">Work item</span>
        <span role="columnheader">Your role</span>
        <span role="columnheader">Signal</span>
        <span role="columnheader">Updated</span>
        <span role="columnheader" className="sr-only">
          Open
        </span>
      </div>
      <div role="rowgroup">
        {items.map((item) => (
          <div
            className={`work-row ${selectedId === item.id ? "work-row-selected" : ""}`}
            role="row"
            key={item.id}
          >
            <div className="work-main-cell" role="cell">
              <button
                className="work-main"
                type="button"
                onClick={() => onSelect(item)}
              >
                <span
                  className={`type-icon type-${item.type}`}
                  aria-hidden="true"
                >
                  {item.type === "pull_request" ? (
                    <GitPullRequest size={17} />
                  ) : (
                    <CircleDot size={17} />
                  )}
                </span>
                <span className="work-copy">
                  <span className="work-repo">
                    {item.repository}
                    <span>#{item.number}</span>
                    {item.draft && <span className="draft-label">Draft</span>}
                  </span>
                  <strong>{item.title}</strong>
                  <span className="mobile-work-meta">
                    {STATE_LABELS[item.state]} / {relativeTime(item.updatedAt)}
                  </span>
                </span>
              </button>
            </div>
            <div className="work-roles" role="cell">
              {item.roles.slice(0, 2).map((role) => (
                <span key={role}>{ROLE_LABELS[role]}</span>
              ))}
              {item.roles.length > 2 && <span>+{item.roles.length - 2}</span>}
            </div>
            <div className="work-signal" role="cell">
              <span
                className={`state-dot state-${item.state}`}
                aria-hidden="true"
              />
              <span
                title={item.reasonCodes
                  .map((reason) => REASON_LABELS[reason])
                  .join("; ")}
              >
                {STATE_LABELS[item.state]}
              </span>
              <Checks item={item} />
            </div>
            <div
              className="work-updated"
              role="cell"
              title={new Date(item.updatedAt).toLocaleString()}
            >
              <Clock3 size={14} aria-hidden="true" />
              <span>{relativeTime(item.updatedAt)}</span>
              {item.latestActivity?.kind === "commented" && (
                <MessageSquareText size={13} aria-label="Recent comment" />
              )}
            </div>
            <div className="row-open-cell" role="cell">
              <a
                className="row-open"
                href={item.links.item}
                target="_blank"
                rel="noreferrer noopener"
                title="Open on GitHub"
                aria-label={`Open ${item.repository} #${item.number} on GitHub`}
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
