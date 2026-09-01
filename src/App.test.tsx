import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "../public/data/dashboard.json";
import App from "./App";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), window.location.origin);
      if (url.hostname === "api.github.com") {
        if (url.pathname === "/search/issues") {
          return new Response(
            JSON.stringify({
              total_count: 0,
              incomplete_results: false,
              items: [],
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.pathname === "/users/ranxi2001") {
          return new Response(
            JSON.stringify({
              login: sample.sourceUser.login,
              name: sample.sourceUser.name,
              avatar_url: sample.sourceUser.avatarUrl,
              html_url: sample.sourceUser.profileUrl,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        if (/\/issues\/\d+\/comments$/.test(url.pathname)) {
          return new Response(
            JSON.stringify([
              {
                user: { login: "ranxi2001" },
                created_at: "2026-08-31T01:00:00.000Z",
                updated_at: "2026-08-31T01:00:00.000Z",
              },
            ]),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        const pullMatch = url.pathname.match(/^\/repos\/(.+)\/pulls\/(\d+)$/);
        if (pullMatch) {
          return new Response(
            JSON.stringify({
              state: "open",
              updated_at: "2026-08-31T01:00:00.000Z",
              closed_at: null,
              merged_at: null,
              draft: false,
              mergeable: true,
              mergeable_state: "clean",
              requested_reviewers: [],
              head: { sha: `refreshed-${pullMatch[2]}` },
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        if (/\/commits\/refreshed-\d+\/check-runs$/.test(url.pathname)) {
          return new Response(
            JSON.stringify({
              total_count: 1,
              check_runs: [
                {
                  name: "current-head-ci",
                  status: "in_progress",
                  conclusion: null,
                  html_url: null,
                },
              ],
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }
        if (/\/pulls\/\d+\/reviews$/.test(url.pathname)) {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
          });
        }
        throw new Error(`Unexpected GitHub request: ${url.pathname}`);
      }
      return new Response(JSON.stringify(sample), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe("App", () => {
  it("opens on the operational dashboard and filters an action queue", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "我的上游贡献" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /需要处理/ }));
    const table = screen.getByRole("table", {
      name: "开源贡献项目",
    });
    expect(
      within(table).getByText(
        "fix: preserve anonymous OverlayBD credential mode",
      ),
    ).toBeVisible();
    expect(
      within(table).queryByText(
        "fix(memory): add a durable clear generation fence",
      ),
    ).toBeNull();
  });

  it("shows explainable reasons in the work detail panel", async () => {
    render(<App />);
    const title = await screen.findByText(
      "fix: preserve anonymous OverlayBD credential mode",
    );
    fireEvent.click(title);
    expect(
      screen.getByRole("complementary", { name: "贡献详情" }),
    ).toBeVisible();
    expect(screen.getAllByText("当前提交存在失败检查")[0]).toBeVisible();
    expect(screen.getByText("ci_failure")).toBeVisible();
  });

  it("offers username lookup and a safely disabled private mode without a relay", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "我的上游贡献" });
    fireEvent.click(
      screen.getByRole("button", { name: "切换 GitHub 数据来源" }),
    );
    expect(
      screen.getByRole("dialog", { name: "选择 GitHub 视图" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "尚未配置私有访问" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("GitHub 用户名"), {
      target: { value: "invalid--" },
    });
    fireEvent.click(screen.getByRole("button", { name: "加载公开数据" }));
    await waitFor(() =>
      expect(screen.getByText("请输入有效的 GitHub 用户名。")).toBeVisible(),
    );
  });

  it("shows and filters recent contribution candidates", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "我的上游贡献" });
    fireEvent.click(screen.getByRole("button", { name: /近期 Issue/ }));
    expect(
      screen.getByRole("heading", { name: "近期可贡献 Issue" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /未指派/ }));
    const table = screen.getByRole("table", { name: "近期可贡献 Issue" });
    expect(
      within(table).getByText(
        "Improve error details when a workflow configuration is invalid",
      ),
    ).toBeVisible();
    expect(
      within(table).queryByText(
        "Correct broken links in the memory systems chapter",
      ),
    ).toBeNull();
    expect(within(table).getByText("PR #5120 · community-user")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /已有 PR/ }));
    expect(
      within(table).getByText(
        "Improve error details when a workflow configuration is invalid",
      ),
    ).toBeVisible();
    expect(
      within(table).queryByText("Document the local snapshot cleanup workflow"),
    ).toBeNull();
  });

  it("refreshes current-head CI without replacing the deployed snapshot", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "我的上游贡献" });
    fireEvent.click(
      screen.getByRole("button", { name: "获取 GitHub 最新状态" }),
    );
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: "api.github.com",
          pathname:
            "/repos/kvcache-ai/AgentENV/commits/refreshed-230/check-runs",
        }),
        expect.objectContaining({ method: "GET" }),
      ),
    );
    const title = await screen.findByText(
      "fix: preserve anonymous OverlayBD credential mode",
    );
    expect(
      within(title.closest('[role="row"]') as HTMLElement).getByRole("img", {
        name: "1 项检查进行中",
      }),
    ).toBeVisible();
    const searchRequests = vi
      .mocked(fetch)
      .mock.calls.filter(([input]) =>
        new URL(String(input), window.location.origin).pathname.includes(
          "/search/issues",
        ),
      );
    expect(searchRequests).toHaveLength(1);
    expect(
      new URL(
        String(searchRequests[0]?.[0]),
        window.location.origin,
      ).searchParams.get("q"),
    ).toBe("involves:ranxi2001 is:pr is:open");
  });
});
