#!/usr/bin/env node
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectDashboard } from "./lib/collector";
import { loadDeckConfig } from "./lib/config";
import { GitHubClient } from "./lib/github";

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value`);
  return value;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.resolve(root, option("--config", "deck.config.yml"));
const outputPath = path.resolve(
  root,
  option("--output", "public/data/dashboard.json"),
);
const token = process.env.GITHUB_TOKEN;

if (!token && process.env.CI) {
  throw new Error("GITHUB_TOKEN is required in CI");
}

const config = await loadDeckConfig(configPath);
const client = new GitHubClient({ token });
const dashboard = await collectDashboard({ client, config });

await mkdir(path.dirname(outputPath), { recursive: true });
const tempPath = `${outputPath}.${process.pid}.tmp`;
await writeFile(tempPath, `${JSON.stringify(dashboard, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
await rename(tempPath, outputPath);

const states = dashboard.items.reduce<Record<string, number>>(
  (counts, item) => {
    counts[item.state] = (counts[item.state] ?? 0) + 1;
    return counts;
  },
  {},
);
console.log(
  JSON.stringify({
    output: path.relative(root, outputPath),
    user: dashboard.sourceUser.login,
    projects: dashboard.projects.length,
    items: dashboard.items.length,
    states,
    syncStatus: dashboard.syncStatus,
    warnings: dashboard.warnings.length,
    rateLimit: dashboard.rateLimit,
  }),
);
