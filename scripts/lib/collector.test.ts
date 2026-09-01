import { describe, expect, it } from "vitest";
import { collectDashboard, refreshPublicDashboard } from "./collector";
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
    if (url.pathname === "/repos/acme/demo/issues") {
      return response([
        {
          id: 12,
          node_id: "I_node_12",
          html_url: "https://github.com/acme/demo/issues/12",
          repository_url: "https://api.github.com/repos/acme/demo",
          number: 12,
          title: "Add a contributor-friendly example",
          user: { login: "reader" },
          state: "open",
          created_at: "2026-08-29T00:00:00.000Z",
          updated_at: "2026-08-30T00:00:00.000Z",
          closed_at: null,
          labels: [{ name: "good first issue" }],
          assignees: [],
          comments: 2,
        },
      ]);
    }
    if (url.pathname === "/repos/acme/demo/issues/12/timeline") {
      return response([
        {
          event: "cross-referenced",
          source: {
            issue: {
              html_url: "https://github.com/acme/demo/pull/18",
              repository_url: "https://api.github.com/repos/acme/demo",
              number: 18,
              title: "Add the contributor-friendly example",
              user: { login: "contributor" },
              state: "open",
              pull_request: { merged_at: null },
              draft: false,
            },
          },
        },
        {
          event: "cross-referenced",
          source: {
            issue: {
              html_url: "https://github.com/acme/demo/pull/17",
              repository_url: "https://api.github.com/repos/acme/demo",
              number: 17,
              title: "Closed attempt",
              user: { login: "past-contributor" },
              state: "closed",
              pull_request: { merged_at: null },
              draft: false,
            },
          },
        },
      ]);
    }
    if (url.pathname === "/repos/acme/demo/issues/7/comments") {
      return response([
        {
          user: { login: "octocat" },
          created_at: "2026-08-30T01:00:00.000Z",
          updated_at: "2026-08-30T01:00:00.000Z",
        },
      ]);
    }
    if (url.pathname === "/repos/acme/demo/pulls/7") {
      return response({
        state: "open",
        updated_at: "2026-08-30T02:00:00.000Z",
        closed_at: null,
        merged_at: null,
        draft: false,
        mergeable: true,
        mergeable_state: "clean",
        requested_reviewers: [],
        head: { sha: "current-head" },
      });
    }
    if (url.pathname === "/repos/acme/demo/commits/current-head/check-runs") {
      return response({
        total_count: 1,
        check_runs: [
          {
            name: "test",
            status: "completed",
            conclusion: "failure",
            html_url: "https://github.com/acme/demo/actions/runs/1",
          },
        ],
      });
    }
    if (url.pathname === "/repos/acme/demo/pulls/7/reviews") {
      return response([]);
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
  it("enriches priority public pull requests while keeping lookup bounded", async () => {
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
    expect(dashboard.items[0]?.checks.status).toBe("failure");
    expect(dashboard.items[0]?.state).toBe("needs_action");
    expect(dashboard.recentIssues).toHaveLength(1);
    expect(dashboard.recentIssues[0]?.signals).toEqual(
      expect.arrayContaining([
        "linked_pull_request",
        "unassigned",
        "good_first_issue",
      ]),
    );
    expect(dashboard.recentIssues[0]?.linkedPullRequests).toEqual([
      expect.objectContaining({ number: 18, author: "contributor" }),
    ]);
    expect(dashboard.recentIssues[0]?.linkedPullRequestStatus).toBe("checked");
    expect(dashboard.warnings.join(" ")).toContain("20 个近期活跃仓库");
    expect(dashboard.warnings.join(" ")).toContain("作者或 Reviewer");
  });

  it("refreshes current-head CI without replacing the snapshot", async () => {
    const initial = await collectDashboard({
      client: new GitHubClient({ fetcher: fetcher(false) }),
      config,
      now: new Date("2026-08-30T00:00:00.000Z"),
      collectionMode: "public_browser",
    });
    const requests: string[] = [];
    const trackingFetcher = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requests.push(url.pathname);
      return fetcher(false)(input);
    }) as typeof fetch;
    const refreshed = await refreshPublicDashboard({
      client: new GitHubClient({ fetcher: trackingFetcher }),
      dashboard: initial,
      now: new Date("2026-08-30T03:00:00.000Z"),
    });

    expect(requests).toContain(
      "/repos/acme/demo/commits/current-head/check-runs",
    );
    expect(requests.filter((path) => path === "/search/issues")).toHaveLength(
      1,
    );
    expect(refreshed.items[0]?.checks.status).toBe("failure");
    expect(refreshed.recentIssues).toEqual(initial.recentIssues);
    expect(refreshed.syncStatus).toBe("partial");
    expect(refreshed.warnings[0]).toContain(
      "候选 Issue 保留上次 Pages 同步数据",
    );
    expect(refreshed.generatedAt).toBe("2026-08-30T03:00:00.000Z");
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
