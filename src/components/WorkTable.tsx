import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
} from "lucide-react";
import { REASON_LABELS, STATE_LABELS } from "../domain/labels";
import type { WorkItem } from "../domain/schema";
import { relativeTime } from "../domain/time";
import {
  MergeDecorator,
  ReviewDecorator,
  RoleDecorator,
  StateDecorator,
  TypeDecorator,
} from "./WorkDecorators";

interface WorkTableProps {
  items: WorkItem[];
  selectedId: string | null;
  onSelect: (item: WorkItem) => void;
}

function Checks({ item }: { item: WorkItem }) {
  const label =
    item.checks.status === "failure"
      ? `${item.checks.failure} 项检查失败`
      : item.checks.status === "pending"
        ? `${item.checks.pending} 项检查进行中`
        : item.checks.status === "success"
          ? `${item.checks.success} 项检查成功`
          : "检查状态不可用";
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
        <h3>当前视图没有匹配的贡献</h3>
        <p>可以切换队列、项目或筛选条件，查看其他公开活动。</p>
      </div>
    );
  }

  return (
    <div className="work-table" role="table" aria-label="开源贡献项目">
      <div className="work-header" role="row">
        <span role="columnheader">贡献项目</span>
        <span role="columnheader">你的角色</span>
        <span role="columnheader">状态与合并</span>
        <span role="columnheader">更新时间</span>
        <span role="columnheader" className="sr-only">
          打开
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
                <TypeDecorator type={item.type} />
                <span className="work-copy">
                  <span className="work-repo">
                    {item.repository}
                    <span>#{item.number}</span>
                    {item.draft && <span className="draft-label">草稿</span>}
                  </span>
                  <strong>{item.title}</strong>
                  <span className="mobile-decorators">
                    {item.roles[0] && <RoleDecorator role={item.roles[0]} />}
                    {item.type === "pull_request" && (
                      <>
                        <ReviewDecorator decision={item.reviewDecision} />
                        <MergeDecorator status={item.mergeable} />
                      </>
                    )}
                  </span>
                  <span className="mobile-work-meta">
                    {STATE_LABELS[item.state]} / {relativeTime(item.updatedAt)}
                  </span>
                </span>
              </button>
            </div>
            <div className="work-roles" role="cell">
              {item.roles.slice(0, 2).map((role) => (
                <RoleDecorator key={role} role={role} />
              ))}
              {item.roles.length > 2 && (
                <span className="decorator role-overflow">
                  +{item.roles.length - 2}
                </span>
              )}
            </div>
            <div
              className="work-signal"
              role="cell"
              title={item.reasonCodes
                .map((reason) => REASON_LABELS[reason])
                .join("; ")}
            >
              <StateDecorator state={item.state} />
              {item.type === "pull_request" && (
                <>
                  <ReviewDecorator decision={item.reviewDecision} />
                  <MergeDecorator status={item.mergeable} />
                </>
              )}
              <Checks item={item} />
            </div>
            <div
              className="work-updated"
              role="cell"
              title={new Date(item.updatedAt).toLocaleString("zh-CN")}
            >
              <Clock3 size={14} aria-hidden="true" />
              <span>{relativeTime(item.updatedAt)}</span>
              {item.latestActivity?.kind === "commented" && (
                <MessageSquareText size={13} aria-label="近期评论" />
              )}
            </div>
            <div className="row-open-cell" role="cell">
              <a
                className="row-open"
                href={item.links.item}
                target="_blank"
                rel="noreferrer noopener"
                title="在 GitHub 打开"
                aria-label={`在 GitHub 打开 ${item.repository} #${item.number}`}
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
