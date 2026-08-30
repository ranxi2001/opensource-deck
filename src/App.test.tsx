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
      await screen.findByRole("heading", { name: "All upstream work" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /Needs action/ }));
    const table = screen.getByRole("table", {
      name: "Contribution work items",
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
      screen.getByRole("complementary", { name: "Work item details" }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Current head has a failing check")[0],
    ).toBeVisible();
    expect(screen.getByText("ci_failure")).toBeVisible();
  });

  it("offers username lookup and a safely disabled private mode without a relay", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "All upstream work" });
    fireEvent.click(
      screen.getByRole("button", { name: "Change GitHub data access" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Choose a GitHub view" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Private access not configured" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("GitHub username"), {
      target: { value: "invalid--" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load public work" }));
    await waitFor(() =>
      expect(screen.getByText("Enter a valid GitHub username.")).toBeVisible(),
    );
  });
});
