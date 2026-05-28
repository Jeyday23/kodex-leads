import { test as setup, expect } from "@playwright/test";

const SUPABASE_URL = "http://127.0.0.1:54321";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SERVICE_ROLE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
const TEST_EMAIL = "test@kodex.dev";
const TEST_PASSWORD = "testpass123456";

async function adminFetch(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      ...(init?.headers ?? {}),
    },
  });
}

setup("authenticate test partner", async ({ page }) => {
  // 1. Create auth user via Admin API
  const createRes = await adminFetch("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Test Partner" },
    }),
  });

  let userId: string;
  if (createRes.ok) {
    userId = (await createRes.json()).id;
  } else {
    const listRes = await adminFetch("/auth/v1/admin/users?page=1&per_page=50");
    const list = await listRes.json();
    const existing = list.users?.find(
      (u: { email: string }) => u.email === TEST_EMAIL
    );
    if (!existing) throw new Error("Failed to create or find test user");
    userId = existing.id;
  }

  // 2. Insert partner row matching the auth user's UUID
  await adminFetch("/rest/v1/partners", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: userId,
      name: "Test Partner",
      email: TEST_EMAIL,
      code: "TEST01",
      role: "admin",
    }),
  });

  // 3. Claim some leads for this partner with various outreach states
  const claimedLeads = [
    { id: "20000000-0000-0000-0000-000000000001", outreach_status: "not_contacted" },
    { id: "20000000-0000-0000-0000-000000000002", outreach_status: "emailed" },
    { id: "20000000-0000-0000-0000-000000000003", outreach_status: "replied" },
    { id: "20000000-0000-0000-0000-000000000004", outreach_status: "meeting_booked" },
    { id: "20000000-0000-0000-0000-000000000005", outreach_status: "converted" },
  ];

  for (const lead of claimedLeads) {
    await adminFetch(`/rest/v1/leads?id=eq.${lead.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        partner_id: userId,
        outreach_status: lead.outreach_status,
      }),
    });
  }

  // 4. Sign in via GoTrue password grant
  const signInRes = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    }
  );
  if (!signInRes.ok)
    throw new Error(`Sign-in failed: ${await signInRes.text()}`);
  const session = await signInRes.json();

  // 5. Inject auth cookies that @supabase/ssr expects
  const sessionPayload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: "bearer",
    user: session.user,
  });

  const encoded = Buffer.from(sessionPayload).toString("base64url");
  const CHUNK_SIZE = 3180;
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + CHUNK_SIZE));
  }

  const cookiePrefix = "sb-127-auth-token";
  const cookies = chunks.map((chunk, i) => ({
    name: `${cookiePrefix}.${i}`,
    value: `base64-${chunk}`,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));

  await page.context().addCookies(cookies);

  // 6. Navigate to dashboard and verify auth
  await page.goto("http://localhost:3000/dashboard");

  // Fallback: if redirected to login, use magic link via Inbucket
  if (page.url().includes("/login")) {
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const mailRes = await fetch("http://127.0.0.1:54324/api/v1/mailbox/test");
    const mails = await mailRes.json();

    if (mails.length > 0) {
      const latestId = mails[mails.length - 1].id;
      const msgRes = await fetch(
        `http://127.0.0.1:54324/api/v1/mailbox/test/${latestId}`
      );
      const msg = await msgRes.json();
      const linkMatch =
        msg.body?.text?.match(/http[s]?:\/\/[^\s"<]+\/auth\/v1\/verify[^\s"<]*/) ||
        msg.body?.html?.match(/href="(http[s]?:\/\/[^\s"<]+\/auth\/v1\/verify[^"]*)"/);

      if (linkMatch) {
        await page.goto(linkMatch[1] || linkMatch[0]);
        await page.waitForURL("**/dashboard**", { timeout: 15_000 });
      }
    }
  }

  await page.context().storageState({ path: "./tests/e2e/.auth/session.json" });
  expect(page.url()).toContain("/dashboard");
});
