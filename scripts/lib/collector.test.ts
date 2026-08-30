import { describe, expect, it } from "vitest";
import { collectDashboard } from "./collector";
import { GitHubClient } from "./github";
import type { DeckConfig } from "../../src/domain/schema";

const config: DeckConfig = {
  schemaVersion: 1,
  githubUser: "octocat",
  lookbackDays: 90,
  completedRetentionDays: 30,
  projects: {},
  exclude: { repositories: [], labels: [] },
  overrides: {},
};

function response(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": "100",
    },
  });
}

function fetcher(privateRepository: boolean): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/search/issues") {
      const query = url.searchParams.get("q") ?? "";
      const include =
        query.startsWith("author:octocat is:pr") ||
        query.startsWith("involves:octocat");
      return response({
        total_count: include ? 1 : 0,
        incomplete_results: false,
        items: include
          ? [
              {
                id: 7,
                node_id: "PR_node_7",
                html_url: "https://github.com/acme/demo/pull/7",
                repository_url: "https://api.github.com/repos/acme/demo",
                number: 7,
                title: "Keep public state explainable",
                user: { login: "octocat" },
                state: "open",
                created_at: "2026-08-28T00:00:00.000Z",
                updated_at: "2026-08-29T00:00:00.000Z",
                closed_at: null,
                labels: [{ name: "dashboard" }],
                assignees: [],
                pull_request: { merged_at: null },
                draft: false,
              },
            ]
          : [],
      });
    }
    if (url.pathname === "/repos/acme/demo") {
      return response({
        full_name: "acme/demo",
        private: privateRepository,
        visibility: privateRepository ? "private" : "public",
        description: "Demo",
        html_url: "https://github.com/acme/demo",
        owner: { login: "acme", avatar_url: "https://github.com/acme.png" },
        fork: false,
      });
    }
    if (url.pathname === "/repos/octocat/demo")
      return new Response("not found", { status: 404 });
    if (url.pathname === "/users/octocat") {
      return response({
        login: "octocat",
        name: "The Octocat",
        avatar_url: "https://github.com/octocat.png",
        html_url: "https://github.com/octocat",
      });
    }
    throw new Error(`Unexpected test request: ${url.pathname}`);
  }) as typeof fetch;
}

describe("collectDashboard", () => {
  it("deduplicates role queries and emits the public lookup limitation", async () => {
    const dashboard = await collectDashboard({
      client: new GitHubClient({ fetcher: fetcher(false) }),
      config,
      now: new Date("2026-08-30T00:00:00.000Z"),
      collectionMode: "public_browser",
    });
    expect(dashboard.items).toHaveLength(1);
    expect(dashboard.items[0]?.roles).toEqual(
      expect.arrayContaining(["author", "involved"]),
    );
    expect(dashboard.projects[0]?.visibility).toBe("public");
    expect(dashboard.warnings.join(" ")).toContain(
      "20 recently active repositories",
    );
  });

  it("drops private repositories unless authenticated mode explicitly allows them", async () => {
    const publicDashboard = await collectDashboard({
      client: new GitHubClient({ fetcher: fetcher(true) }),
      config,
      now: new Date("2026-08-30T00:00:00.000Z"),
      collectionMode: "public_browser",
    });
    expect(publicDashboard.items).toHaveLength(0);

    const privateDashboard = await collectDashboard({
      client: new GitHubClient({ fetcher: fetcher(true) }),
      config,
      includePrivate: true,
      now: new Date("2026-08-30T00:00:00.000Z"),
      collectionMode: "public_browser",
    });
    expect(privateDashboard.accessMode).toBe("private");
    expect(privateDashboard.projects[0]?.visibility).toBe("private");
  });
});
