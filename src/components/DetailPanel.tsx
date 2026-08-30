import {
  AlertTriangle,
  Check,
  CircleDot,
  CodeXml,
  ExternalLink,
  GitPullRequest,
  Workflow,
  X,
} from "lucide-react";
import { REASON_LABELS, ROLE_LABELS, STATE_LABELS } from "../domain/labels";
import type { WorkItem } from "../domain/schema";
import { relativeTime } from "../domain/time";

interface DetailPanelProps {
  item: WorkItem | null;
  onClose: () => void;
}

export function DetailPanel({ item, onClose }: DetailPanelProps) {
  if (!item) return null;
  return (
    <aside className="detail-panel" aria-label="Work item details">
      <div className="detail-header">
        <div className="detail-kicker">
          {item.type === "pull_request" ? (
            <GitPullRequest size={16} />
          ) : (
            <CircleDot size={16} />
          )}
          <span>
            {item.repository} #{item.number}
          </span>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>
      <div className="detail-scroll">
        <h2>{item.title}</h2>
        <div className="detail-state-row">
          <span className={`state-badge state-badge-${item.state}`}>
            <span
              className={`state-dot state-${item.state}`}
              aria-hidden="true"
            />
            {STATE_LABELS[item.state]}
          </span>
          <span>updated {relativeTime(item.updatedAt)}</span>
        </div>

        <section className="detail-section">
          <h3>Why it is here</h3>
          <ul className="reason-list">
            {item.reasonCodes.map((reason) => (
              <li key={reason}>
                <Check size={15} aria-hidden="true" />
                <span>{REASON_LABELS[reason]}</span>
                <code>{reason}</code>
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section detail-grid">
          <div>
            <h3>Your role</h3>
            <div className="tag-list">
              {item.roles.map((role) => (
                <span key={role}>{ROLE_LABELS[role]}</span>
              ))}
            </div>
          </div>
          <div>
            <h3>Review</h3>
            <p>{item.reviewDecision.replaceAll("_", " ")}</p>
          </div>
          <div>
            <h3>Mergeability</h3>
            <p>{item.mergeable.replaceAll("_", " ")}</p>
          </div>
          <div>
            <h3>Last activity</h3>
            <p>
              {item.latestActivity
                ? `${item.latestActivity.actor}, ${relativeTime(item.latestActivity.at)}`
                : "Not available"}
            </p>
          </div>
        </section>

        {item.checks.status !== "unavailable" && (
          <section className="detail-section">
            <h3>Current checks</h3>
            <div className="check-list">
              {item.checks.jobs.length === 0 ? (
                <p>{item.checks.success} checks passed.</p>
              ) : (
                item.checks.jobs.map((job) => {
                  const content = (
                    <>
                      <span
                        className={`check-job-dot check-job-${job.status}`}
                        aria-hidden="true"
                      />
                      <span>{job.name}</span>
                      <small>{job.status}</small>
                    </>
                  );
                  return job.url ? (
                    <a
                      key={job.name}
                      href={job.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={job.name}>{content}</div>
                  );
                })
              )}
            </div>
          </section>
        )}

        <section className="detail-section">
          <h3>Source facts</h3>
          <ul className="fact-list">
            {item.sourceFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>

        {item.labels.length > 0 && (
          <section className="detail-section">
            <h3>Labels</h3>
            <div className="tag-list">
              {item.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </section>
        )}

        {item.warnings.length > 0 && (
          <section className="detail-warning">
            <AlertTriangle size={17} />
            <div>
              <strong>Partial data</strong>
              {item.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="detail-actions">
        <a href={item.links.item} target="_blank" rel="noreferrer noopener">
          <CodeXml size={16} />
          Open item
          <ExternalLink size={14} />
        </a>
        {item.links.checks && (
          <a
            href={item.links.checks}
            target="_blank"
            rel="noreferrer noopener"
            title="Open checks"
          >
            <Workflow size={17} />
          </a>
        )}
      </div>
    </aside>
  );
}
