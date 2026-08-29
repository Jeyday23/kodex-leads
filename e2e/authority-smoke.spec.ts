import { expect, test } from "@playwright/test";

test("command center uses understandable controls and real navigation", async ({ page }) => {
  await page.goto("/admin/authority/command");
  await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings and integration readiness" })).toHaveText("Settings");
  await expect(page.getByRole("link", { name: "System status and observatory" })).toHaveText("Status");
  await expect(page.locator("text=⌕")).toHaveCount(0);
  await expect(page.locator("text=○")).toHaveCount(0);

  await page.getByRole("link", { name: "Settings and integration readiness" }).click();
  await expect(page).toHaveURL(/\/admin\/authority\/settings$/);
  await expect(page.getByRole("heading", { name: "Integration readiness" })).toBeVisible();
});

test("public staging cannot mutate Authority APIs without founder authorization", async ({ request }) => {
  const response = await request.post("/api/authority/opportunities/discover");
  expect(response.status()).toBe(403);
  const payload = await response.json();
  expect(payload.code).toBe("FOUNDER_CONTROL_REQUIRED");
});

test("protected action explains authorization failures instead of a generic failed label", async ({ page }) => {
  await page.goto("/admin/authority/command");
  page.once("dialog", async (dialog) => dialog.accept("incorrect-test-key"));
  await page.getByRole("button", { name: "Run discovery" }).click();
  await expect(page.getByText("Private founder authorization required for this action.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("core runtime surfaces render in a clean public staging session", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();

  for (const path of [
    "/admin/authority/command",
    "/admin/authority/settings",
    "/admin/authority/outreach",
    "/admin/authority/opportunities",
    "/admin/leads",
  ]) {
    const response = await page.goto(path);
    expect(response?.ok(), `${path} should return a successful response`).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Application error");
  }
});
