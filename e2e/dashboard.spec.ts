import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("desktop workspace supports filtering, details, and command search", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only workflow");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "All upstream work" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Waiting upstream/ }).click();
  await expect(
    page.getByText("fix(memory): add a durable clear generation fence"),
  ).toBeVisible();
  await page
    .getByText("fix(memory): add a durable clear generation fence")
    .click();
  await expect(
    page.getByRole("complementary", { name: "Work item details" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "Find projects and work" }),
  ).toBeVisible();
  await page
    .getByLabel("Find a project, issue, or pull request")
    .fill("AgentENV");
  await expect(
    page.getByRole("button", { name: /AgentENV/ }).first(),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("mobile workspace has no page overflow and exposes project navigation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only workflow");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "All upstream work" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open projects" }).click();
  const projects = page.getByRole("complementary", { name: "Projects" });
  await expect(projects).toBeVisible();
  await projects.getByRole("button", { name: /AgentENV/ }).click();
  await expect(page.getByRole("heading", { name: "AgentENV" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Change GitHub data access" }).click();
  await expect(
    page.getByRole("dialog", { name: "Choose a GitHub view" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Private access not configured" }),
  ).toBeDisabled();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
