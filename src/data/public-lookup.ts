import {
  collectDashboard,
  refreshPublicDashboard,
} from "../../scripts/lib/collector";
import { GitHubClient } from "../../scripts/lib/github";
import type { DashboardData, DeckConfig } from "../domain/schema";

const usernamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function publicUsernameIsValid(username: string): boolean {
  return usernamePattern.test(username.trim());
}

export async function lookupPublicUser(
  username: string,
): Promise<DashboardData> {
  const normalized = username.trim();
  if (!publicUsernameIsValid(normalized)) {
    throw new Error("请输入有效的 GitHub 用户名。");
  }
  const config: DeckConfig = {
    schemaVersion: 1,
    githubUser: normalized,
    lookbackDays: 90,
    completedRetentionDays: 30,
    projects: {},
    exclude: { repositories: [], labels: [] },
    overrides: {},
  };
  return await collectDashboard({
    client: new GitHubClient(),
    config,
    concurrency: 4,
    collectionMode: "public_browser",
  });
}

export async function refreshPublicUser(
  dashboard: DashboardData,
): Promise<DashboardData> {
  return await refreshPublicDashboard({
    client: new GitHubClient(),
    dashboard,
    concurrency: 4,
  });
}
