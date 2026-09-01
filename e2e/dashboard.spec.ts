import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("desktop workspace supports filtering, details, and command search", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only workflow");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "我的上游贡献" }),
  ).toBeVisible();
  const pullRequestRow = page
    .getByRole("row")
    .filter({ hasText: "fix: preserve anonymous OverlayBD credential mode" });
  await expect(pullRequestRow.getByLabel("类型：Pull Request")).toBeVisible();
  await expect(
    pullRequestRow.locator(".work-roles").getByTitle("你的角色：作者"),
  ).toBeVisible();
  await expect(
    pullRequestRow.locator(".work-signal").getByTitle("审阅状态：等待审阅"),
  ).toBeVisible();
  await expect(
    pullRequestRow.locator(".work-signal").getByTitle("可合并状态：可合并"),
  ).toBeVisible();
  await page.getByRole("tab", { name: /等待上游/ }).click();
  await expect(
    page.getByText("fix(memory): add a durable clear generation fence"),
  ).toBeVisible();
  await page
    .getByText("fix(memory): add a durable clear generation fence")
    .click();
  await expect(
    page.getByRole("complementary", { name: "贡献详情" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /近期 Issue/ }).click();
  await page.getByRole("tab", { name: /已有 PR/ }).click();
  await expect(
    page.getByRole("link", { name: "PR #5120 · community-user" }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("dialog", { name: "查找项目和贡献" }),
  ).toBeVisible();
  await page.getByLabel("查找项目、Issue 或 Pull Request").fill("AgentENV");
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
    page.getByRole("heading", { name: "我的上游贡献" }),
  ).toBeVisible();
  const pullRequestRow = page
    .getByRole("row")
    .filter({ hasText: "fix: preserve anonymous OverlayBD credential mode" });
  await expect(pullRequestRow.getByLabel("类型：Pull Request")).toBeVisible();
  await expect(
    pullRequestRow.locator(".mobile-decorators").getByTitle("你的角色：作者"),
  ).toBeVisible();
  await expect(
    pullRequestRow
      .locator(".mobile-decorators")
      .getByTitle("审阅状态：等待审阅"),
  ).toBeVisible();
  await expect(
    pullRequestRow
      .locator(".mobile-decorators")
      .getByTitle("可合并状态：可合并"),
  ).toBeVisible();
  await page.getByRole("button", { name: /近期 Issue/ }).click();
  await expect(page.getByText("已有开放 PR").first()).toBeVisible();
  await page.getByRole("button", { name: "打开项目列表" }).click();
  const projects = page.getByRole("complementary", { name: "项目" });
  await expect(projects).toBeVisible();
  await projects.getByRole("button", { name: /AgentENV/ }).click();
  await expect(page.getByRole("heading", { name: "AgentENV" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "切换 GitHub 数据来源" }).click();
  await expect(
    page.getByRole("dialog", { name: "选择 GitHub 视图" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "尚未配置私有访问" }),
  ).toBeDisabled();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
