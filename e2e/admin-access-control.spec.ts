import { test, expect } from "@playwright/test";
import { adminClient, signIn, supabaseConfigured } from "./support/session";

/**
 * Live acceptance test for the admin access-control chain.
 *
 * Provisions a throwaway account, walks it through anonymous -> member ->
 * administrator, and removes it again. Skipped unless the Supabase server
 * environment is present, so CI without secrets stays green.
 */
test.describe("admin access control", () => {
  test.skip(!supabaseConfigured, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  const email = `kodex-acceptance-${Date.now()}@example.com`;
  const password = `Aa1!${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  let userId = "";

  const admin = adminClient;

  test.beforeAll(async () => {
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user!.id;
  });

  test.afterAll(async () => {
    if (userId) await admin().auth.admin.deleteUser(userId);
  });

  test("anonymous visitors cannot reach any admin page", async ({ page }) => {
    for (const path of ["/admin/leads", "/admin/founder-ops", "/admin/authority/command"]) {
      const response = await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/login\?/);
      expect(response?.status()).toBe(200);
      // The lead inbox renders mailto: links; none may survive the redirect.
      expect(await page.content()).not.toContain("mailto:");
    }
  });

  test("signup provisions a profile with the default member role", async () => {
    const { data, error } = await admin()
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    expect(error).toBeNull();
    // The trigger must never honour a client-supplied role.
    expect(data?.role).toBe("member");
  });

  test("an authenticated non-admin is still refused", async ({ page }) => {
    await signIn(page, { id: userId, email, password });
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/reason=not-authorized/);
    expect(await page.content()).not.toContain("mailto:");
  });

  test("an administrator reaches the admin surface and can sign out", async ({ page }) => {
    const { error } = await admin().from("profiles").update({ role: "founder" }).eq("id", userId);
    expect(error).toBeNull();

    await signIn(page, { id: userId, email, password });
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/admin\/leads$/);
    await expect(page.getByRole("heading", { name: "Lead Inbox" })).toBeVisible();

    await page.goto("/admin/authority/command");
    await expect(page).toHaveURL(/\/admin\/authority\/command$/);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth\/login\?reason=signed-out/);

    // The session must be gone, not merely navigated away from.
    await page.goto("/admin/leads");
    await expect(page).toHaveURL(/\/auth\/login\?/);
  });
});
