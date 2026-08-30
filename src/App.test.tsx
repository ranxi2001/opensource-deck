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
    vi.fn(
      async () =>
        new Response(JSON.stringify(sample), {
          headers: { "Content-Type": "application/json" },
        }),
    ),
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
  });
});
