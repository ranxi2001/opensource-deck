import { describe, expect, it, vi } from "vitest";
import { GitHubClient, GitHubRequestError } from "./github";

describe("GitHubClient", () => {
  it("uses GET only, protects the token, and records rate state", async () => {
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        expect(request.method).toBe("GET");
        expect(request.headers.get("Authorization")).toBe(
          "Bearer secret-token",
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "4998",
            "X-RateLimit-Reset": "1788062400",
          },
        });
      },
    );
    const client = new GitHubClient({ token: "secret-token", fetcher });
    await expect(client.get("/user")).resolves.toEqual({ ok: true });
    expect(client.getRateLimit()).toEqual({
      remaining: 4998,
      resetAt: new Date(1788062400 * 1000).toISOString(),
    });
  });

  it("does not include response bodies or query values in errors", async () => {
    const client = new GitHubClient({
      fetcher: async () =>
        new Response("private title and token ghp_should_not_escape", {
          status: 403,
        }),
    });
    const error = await client
      .get("/search/issues", { q: "private query" })
      .catch((cause) => cause);
    expect(error).toBeInstanceOf(GitHubRequestError);
    expect(String(error)).not.toContain("private title");
    expect(String(error)).not.toContain("private query");
  });
});
