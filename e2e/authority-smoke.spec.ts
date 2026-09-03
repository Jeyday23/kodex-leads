import { expect, test } from "@playwright/test";
import { createAccount, deleteAccount, signIn, supabaseConfigured, type TestAccount } from "./support/session";

test("health endpoint is public", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.ok()).toBeTruthy();
});

test.describe("unauthenticated callers", () => {
  test("cannot mutate Authority APIs", async ({ request }) => {
    const response = await request.post("/api/authority/opportunities/discover");
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("cannot queue media generation", async ({ request }) => {
    const response = await request.post("/api/media/jobs", {
      data: { title: "test", brief: "test", kind: "image" },
    });
    expect(response.status()).toBe(401);
  });

  test("cannot open any admin surface", async ({ page }) => {
    for (const path of [
      "/admin/authority/command",
      "/admin/authority/settings",
      "/admin/authority/outreach",
      "/admin/authority/media",
      "/admin/authority/opportunities",
      "/admin/leads",
      "/admin/founder-ops",
    ]) {
      await page.goto(path);
      await expect(page, `${path} must not render for an anonymous visitor`).toHaveURL(/\/auth\/login\?/);
    }
  });
});

test.describe("signed-in administrator", () => {
  test.skip(!supabaseConfigured, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  let admin: TestAccount | null = null;

  test.beforeAll(async () => {
    admin = await createAccount("founder");
  });

  test.afterAll(async () => {
    await deleteAccount(admin);
    admin = null;
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page, admin!);
  });

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

  test("media studio renders and never publishes automatically", async ({ page }) => {
    await page.goto("/admin/authority/media");
    await expect(page.getByRole("heading", { name: "Media studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "New media brief" })).toBeVisible();
    await expect(page.locator("body")).toContainText("Generation never publishes automatically");
  });

  test("privileged actions no longer ask for a pasted secret", async ({ page }) => {
    await page.goto("/admin/authority/command");
    let promptShown = false;
    page.on("dialog", async (dialog) => {
      promptShown = true;
      await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Run discovery" }).click();
    // The action runs on the session cookie; no control-key prompt may appear.
    await expect
      .poll(() => promptShown, { timeout: 5_000, message: "a credential prompt was shown" })
      .toBe(false);
  });

  test("admin surfaces render without error", async ({ page }) => {
    for (const path of [
      "/admin/authority/command",
      "/admin/authority/settings",
      "/admin/authority/outreach",
      "/admin/authority/media",
      "/admin/authority/opportunities",
      "/admin/leads",
    ]) {
      const response = await page.goto(path);
      expect(response?.ok(), `${path} should return a successful response`).toBeTruthy();
      await expect(page.locator("body")).not.toContainText("Application error");
    }
  });
});
