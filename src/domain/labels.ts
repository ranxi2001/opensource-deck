import type {
  IssueSignal,
  ReasonCode,
  Role,
  WorkItem,
  WorkState,
} from "./schema";

export const ITEM_TYPE_LABELS: Record<WorkItem["type"], string> = {
  issue: "Issue",
  pull_request: "Pull Request",
};

export const STATE_LABELS: Record<WorkState, string> = {
  needs_action: "需要处理",
  waiting_upstream: "等待上游",
  active: "进行中",
  completed: "已完成",
  snoozed: "已暂缓",
  unknown: "未知",
};

export const REASON_LABELS: Record<ReasonCode, string> = {
  manual_snooze: "已通过公开配置暂缓",
  manual_waiting: "已通过公开配置设为等待上游",
  manual_active: "已通过公开配置设为进行中",
  item_merged: "Pull Request 已合并",
  item_closed: "Issue 或 Pull Request 已关闭",
  ci_failure: "当前提交存在失败检查",
  ci_pending: "当前提交仍有检查在运行",
  changes_requested: "审阅者要求修改",
  review_requested: "有人请求你进行审阅",
  assigned_external_update: "已指派项目出现了新的外部活动",
  mentioned_external_update: "提及你的项目出现了新的外部活动",
  merge_conflict: "Pull Request 存在合并冲突",
  last_activity_by_user: "最近一次可见相关活动来自你",
  open_unowned: "尚未确认下一步由谁处理",
  data_incomplete: "部分补充数据不可用",
};

export const ROLE_LABELS: Record<Role, string> = {
  author: "作者",
  assignee: "被指派",
  review_requested: "待审阅",
  reviewed: "已审阅",
  mentioned: "被提及",
  involved: "已参与",
};

export const REVIEW_LABELS: Record<WorkItem["reviewDecision"], string> = {
  approved: "已批准",
  changes_requested: "要求修改",
  review_required: "等待审阅",
  none: "无审阅结论",
  unknown: "审阅状态未知",
};

export const MERGE_LABELS: Record<WorkItem["mergeable"], string> = {
  mergeable: "可合并",
  conflicting: "存在冲突",
  unknown: "合并状态未知",
  not_applicable: "不适用",
};

export const ISSUE_SIGNAL_LABELS: Record<IssueSignal, string> = {
  linked_pull_request: "已有开放 PR",
  unassigned: "未指派",
  assigned: "已指派",
  good_first_issue: "适合首次贡献",
  help_wanted: "欢迎协助",
  needs_triage: "待分类",
};

const SOURCE_FACT_LABELS: Record<string, string> = {
  "Authored pull request": "你创建了这个 Pull Request",
  "Authored issue": "你创建了这个 Issue",
  "Assigned open issue": "这个开放 Issue 已指派给你",
  "Review requested": "有人请求你审阅",
  "Reviewed pull request": "你审阅过这个 Pull Request",
  "Recent involvement": "你近期参与过讨论",
  "Current head checks passed": "当前提交的检查已通过",
  "Current head has a failing check": "当前提交存在失败检查",
  "Current head has checks in progress": "当前提交仍有检查在运行",
  "Last visible relevant activity is yours": "最近一次可见相关活动来自你",
  "Pull request merged": "Pull Request 已合并",
};

export function sourceFactLabel(fact: string): string {
  return SOURCE_FACT_LABELS[fact] ?? fact;
}
