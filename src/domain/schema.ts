import { z } from "zod";

export const workStateSchema = z.enum([
  "needs_action",
  "waiting_upstream",
  "active",
  "completed",
  "snoozed",
  "unknown",
]);

export const itemTypeSchema = z.enum(["issue", "pull_request"]);

export const roleSchema = z.enum([
  "author",
  "assignee",
  "review_requested",
  "reviewed",
  "mentioned",
  "involved",
]);

export const reasonCodeSchema = z.enum([
  "manual_snooze",
  "manual_waiting",
  "manual_active",
  "item_merged",
  "item_closed",
  "ci_failure",
  "ci_pending",
  "changes_requested",
  "review_requested",
  "assigned_external_update",
  "mentioned_external_update",
  "merge_conflict",
  "last_activity_by_user",
  "open_unowned",
  "data_incomplete",
]);

export const checksStatusSchema = z.enum([
  "success",
  "failure",
  "pending",
  "unavailable",
]);

export const checkJobSchema = z.object({
  name: z.string().min(1),
  status: checksStatusSchema.exclude(["unavailable"]),
  url: z.string().url().optional(),
});

export const checksSummarySchema = z.object({
  status: checksStatusSchema,
  total: z.number().int().nonnegative(),
  success: z.number().int().nonnegative(),
  failure: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  jobs: z.array(checkJobSchema).default([]),
});

export const activitySchema = z.object({
  actor: z.string().min(1),
  at: z.string().datetime(),
  kind: z.enum(["opened", "commented", "reviewed", "committed"]),
  byUser: z.boolean(),
});

export const workLinksSchema = z.object({
  item: z.string().url(),
  repository: z.string().url(),
  checks: z.string().url().optional(),
  actions: z.string().url(),
});

export const workItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  number: z.number().int().positive(),
  type: itemTypeSchema,
  title: z.string().min(1),
  author: z.string().min(1),
  sourceState: z.enum(["open", "closed", "merged"]),
  state: workStateSchema,
  reasonCodes: z.array(reasonCodeSchema).min(1),
  roles: z.array(roleSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  labels: z.array(z.string()),
  assignees: z.array(z.string()),
  draft: z.boolean(),
  mergeable: z.enum(["mergeable", "conflicting", "unknown", "not_applicable"]),
  reviewDecision: z.enum([
    "approved",
    "changes_requested",
    "review_required",
    "none",
    "unknown",
  ]),
  checks: checksSummarySchema,
  latestActivity: activitySchema.nullable(),
  links: workLinksSchema,
  sourceFacts: z.array(z.string()).min(1),
  warnings: z.array(z.string()).default([]),
});

export const projectSchema = z.object({
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  visibility: z.enum(["public", "private"]),
  name: z.string().min(1),
  owner: z.string().min(1),
  alias: z.string().min(1).optional(),
  description: z.string(),
  url: z.string().url(),
  avatarUrl: z.string().url(),
  forkUrl: z.string().url().optional(),
  pinned: z.boolean(),
  nextAction: z.string().max(240).optional(),
  updatedAt: z.string().datetime(),
  counts: z.record(workStateSchema, z.number().int().nonnegative()),
  links: z.object({
    repository: z.string().url(),
    issues: z.string().url(),
    pulls: z.string().url(),
    actions: z.string().url(),
    fork: z.string().url().optional(),
  }),
});

export const dashboardDataSchema = z.object({
  schemaVersion: z.literal("1.0"),
  accessMode: z.enum(["public", "private"]),
  generatedAt: z.string().datetime(),
  sourceUser: z.object({
    login: z.string().min(1),
    name: z.string(),
    avatarUrl: z.string().url(),
    profileUrl: z.string().url(),
  }),
  lookback: z.object({
    days: z.number().int().min(1).max(365),
    since: z.string().date(),
    completedRetentionDays: z.number().int().min(0).max(365),
  }),
  projects: z.array(projectSchema),
  items: z.array(workItemSchema),
  syncStatus: z.enum(["success", "partial", "sample"]),
  rateLimit: z.object({
    remaining: z.number().int().nonnegative().nullable(),
    resetAt: z.string().datetime().nullable(),
  }),
  warnings: z.array(z.string()),
});

const projectConfigSchema = z.object({
  pinned: z.boolean().default(false),
  alias: z.string().min(1).max(80).optional(),
  next_action: z.string().min(1).max(240).optional(),
  hidden: z.boolean().default(false),
});

const overrideSchema = z.object({
  state: z.enum(["snoozed", "active", "waiting_upstream"]),
  until: z.string().date().optional(),
});

export const deckConfigFileSchema = z
  .object({
    schema_version: z.literal(1),
    github_user: z
      .string()
      .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/),
    lookback_days: z.number().int().min(1).max(365).default(90),
    completed_retention_days: z.number().int().min(0).max(365).default(30),
    projects: z.record(z.string(), projectConfigSchema).default({}),
    exclude: z
      .object({
        repositories: z.array(z.string()).default([]),
        labels: z.array(z.string()).default([]),
      })
      .default({ repositories: [], labels: [] }),
    overrides: z.record(z.string().url(), overrideSchema).default({}),
  })
  .strict();

export type WorkState = z.infer<typeof workStateSchema>;
export type ItemType = z.infer<typeof itemTypeSchema>;
export type Role = z.infer<typeof roleSchema>;
export type ReasonCode = z.infer<typeof reasonCodeSchema>;
export type ChecksSummary = z.infer<typeof checksSummarySchema>;
export type Activity = z.infer<typeof activitySchema>;
export type WorkItem = z.infer<typeof workItemSchema>;
export type Project = z.infer<typeof projectSchema>;
export type DashboardData = z.infer<typeof dashboardDataSchema>;
export type DeckConfigFile = z.infer<typeof deckConfigFileSchema>;

export interface DeckConfig {
  schemaVersion: 1;
  githubUser: string;
  lookbackDays: number;
  completedRetentionDays: number;
  projects: Record<
    string,
    { pinned: boolean; alias?: string; nextAction?: string; hidden: boolean }
  >;
  exclude: { repositories: string[]; labels: string[] };
  overrides: Record<
    string,
    { state: "snoozed" | "active" | "waiting_upstream"; until?: string }
  >;
}

export function normalizeDeckConfig(file: DeckConfigFile): DeckConfig {
  return {
    schemaVersion: 1,
    githubUser: file.github_user,
    lookbackDays: file.lookback_days,
    completedRetentionDays: file.completed_retention_days,
    projects: Object.fromEntries(
      Object.entries(file.projects).map(([repository, value]) => [
        repository,
        {
          pinned: value.pinned,
          alias: value.alias,
          nextAction: value.next_action,
          hidden: value.hidden,
        },
      ]),
    ),
    exclude: file.exclude,
    overrides: file.overrides,
  };
}

export const EMPTY_COUNTS: Record<WorkState, number> = {
  needs_action: 0,
  waiting_upstream: 0,
  active: 0,
  completed: 0,
  snoozed: 0,
  unknown: 0,
};
