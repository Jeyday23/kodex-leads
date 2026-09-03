import type { Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** E2E that needs a real session is skipped unless the server env is present. */
export const supabaseConfigured = Boolean(url && serviceKey);

export function adminClient(): SupabaseClient {
  if (!supabaseConfigured) throw new Error("Supabase server environment is not configured.");
  return createClient(url!, serviceKey!, { auth: { persistSession: false } });
}

export interface TestAccount {
  id: string;
  email: string;
  password: string;
}

/** Creates a confirmed throwaway account. Always pair with deleteAccount(). */
export async function createAccount(role: "member" | "founder"): Promise<TestAccount> {
  const email = `kodex-e2e-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `Aa1!${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const client = adminClient();

  const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const id = data.user!.id;

  if (role !== "member") {
    // The signup trigger always provisions 'member'; elevation is deliberate.
    const { error: roleError } = await client.from("profiles").update({ role }).eq("id", id);
    if (roleError) throw roleError;
  }

  return { id, email, password };
}

export async function deleteAccount(account: TestAccount | null) {
  if (!account) return;
  await adminClient().auth.admin.deleteUser(account.id);
}

/** Signs in through the real login form so cookies are set exactly as in production. */
export async function signIn(page: Page, account: TestAccount) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((current) => !current.pathname.startsWith("/auth/login"), { timeout: 20_000 });
}
