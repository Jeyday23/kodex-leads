import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/supabase/config";

export interface AuthorityAdmin {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
}

type AuthorityApiResult =
  | { ok: true; actor: string; role: string }
  | { ok: false; response: Response };

export type AuthoritySessionReason =
  | "auth-unavailable"
  | "signin-required"
  | "not-authorized";

export interface AuthoritySession {
  user: AuthorityAdmin | null;
  supabase: SupabaseClient | null;
  reason?: AuthoritySessionReason;
}

/**
 * Resolves the current Authority administrator.
 *
 * Fails closed in every branch: a missing Supabase configuration, an anonymous
 * visitor, or an authenticated non-admin all resolve to `user: null`. There is
 * no anonymous viewer fallback.
 */
export async function getAuthoritySession(): Promise<AuthoritySession> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user: null, supabase: null, reason: "auth-unavailable" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, supabase, reason: "signin-required" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Role comes from the profiles table. user_metadata is client-writable at
  // signup and must never be trusted for authorization.
  const role = String(profile?.role ?? "member");
  if (!isAdminRole(role)) return { user: null, supabase, reason: "not-authorized" };

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email,
      role,
      fullName: typeof profile?.full_name === "string" ? profile.full_name : null,
    },
  };
}

/**
 * Page guard. Redirects instead of returning, so a page body can never render
 * for an unauthorized visitor.
 */
export async function requireAuthorityPage(nextPath = "/admin/authority"): Promise<AuthorityAdmin> {
  const session = await getAuthoritySession();
  if (session.user) return session.user;

  const params = new URLSearchParams({
    next: nextPath,
    reason: session.reason ?? "signin-required",
  });
  redirect(`/auth/login?${params.toString()}`);
}

/**
 * API guard. `allowCron` permits Render's scheduled jobs to authenticate with
 * CRON_SECRET — server-to-server automation only. Browser callers must present
 * a real authenticated admin session.
 */
export async function requireAuthorityApi(
  request: Request,
  options: { allowCron?: boolean } = {},
): Promise<AuthorityApiResult> {
  if (options.allowCron && isCronRequest(request)) {
    return { ok: true, actor: "render-cron", role: "system" };
  }

  const session = await getAuthoritySession();
  if (session.user) {
    return { ok: true, actor: session.user.email, role: session.user.role };
  }

  const unauthenticated = session.reason !== "not-authorized";
  return {
    ok: false,
    response: Response.json(
      {
        status: "error",
        error: unauthenticated
          ? "Sign in as a Kodex administrator to perform this action."
          : "This account is not authorized for Authority Engine actions.",
        code: unauthenticated ? "AUTHENTICATION_REQUIRED" : "ADMIN_ROLE_REQUIRED",
      },
      { status: unauthenticated ? 401 : 403 },
    ),
  };
}

/**
 * Server automation check. CRON_SECRET is only ever presented by Render cron
 * jobs and workers; it is never exposed to the browser.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header) return false;
  return timingSafeEqual(header, `Bearer ${secret}`);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export function isAuthorityAdmin(role: string): boolean {
  return isAdminRole(role);
}
