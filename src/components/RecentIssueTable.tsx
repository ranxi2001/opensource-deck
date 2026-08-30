import {
  CircleDot,
  Clock3,
  ExternalLink,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import type { IssueSignal, RecentIssue } from "../domain/schema";
import { relativeTime } from "../domain/time";

const SIGNAL_LABELS: Record<IssueSignal, string> = {
  unassigned: "未指派",
  assigned: "已指派",
  good_first_issue: "适合首次贡献",
  help_wanted: "欢迎协助",
  needs_triage: "待分类",
};

interface RecentIssueTableProps {
  issues: RecentIssue[];
}

export function RecentIssueTable({ issues }: RecentIssueTableProps) {
  if (issues.length === 0) {
    return (
      <div className="empty-state">
        <CircleDot size={28} />
        <h3>当前筛选下没有近期 Issue</h3>
        <p>可以切换项目、筛选条件或关键词，查看其他候选任务。</p>
      </div>
    );
  }

  return (
    <div className="work-table" role="table" aria-label="近期可贡献 Issue">
      <div className="work-header issue-header" role="row">
        <span role="columnheader">Issue</span>
        <span role="columnheader">公开信号</span>
        <span role="columnheader">参与情况</span>
        <span role="columnheader">更新时间</span>
        <span role="columnheader" className="sr-only">
          打开
        </span>
      </div>
      <div role="rowgroup">
        {issues.map((issue) => (
          <div className="work-row issue-row" role="row" key={issue.id}>
            <div className="work-main-cell" role="cell">
              <a
                className="work-main issue-main"
                href={issue.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="type-icon type-issue" aria-hidden="true">
                  <CircleDot size={17} />
                </span>
                <span className="work-copy">
                  <span className="work-repo">
                    {issue.repository}
                    <span>#{issue.number}</span>
                  </span>
                  <strong>{issue.title}</strong>
                  <span className="mobile-work-meta">
                    {issue.signals[0]
                      ? SIGNAL_LABELS[issue.signals[0]]
                      : "公开 Issue"}{" "}
                    / {relativeTime(issue.updatedAt)}
                  </span>
                </span>
              </a>
            </div>
            <div className="work-roles issue-signals" role="cell">
              {issue.signals.slice(0, 3).map((signal) => (
                <span key={signal} className={`issue-signal signal-${signal}`}>
                  {SIGNAL_LABELS[signal]}
                </span>
              ))}
            </div>
            <div className="issue-participation" role="cell">
              <span title={`由 ${issue.author} 创建`}>
                <UserRound size={14} />
                {issue.assignees.length > 0
                  ? issue.assignees.slice(0, 2).join(", ")
                  : "暂无指派"}
              </span>
              <span>
                <MessageSquareText size={14} />
                {issue.comments}
              </span>
            </div>
            <div
              className="work-updated"
              role="cell"
              title={new Date(issue.updatedAt).toLocaleString("zh-CN")}
            >
              <Clock3 size={14} aria-hidden="true" />
              <span>{relativeTime(issue.updatedAt)}</span>
            </div>
            <div className="row-open-cell" role="cell">
              <a
                className="row-open"
                href={issue.url}
                target="_blank"
                rel="noreferrer noopener"
                title="在 GitHub 打开"
                aria-label={`在 GitHub 打开 ${issue.repository} #${issue.number}`}
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
