import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError } from "./api";

export interface AuthorityAdmin {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
}

export async function getAuthoritySession(): Promise<{ user: AuthorityAdmin | null; supabase: SupabaseClient | null; reason?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, supabase: null, reason: "Supabase auth is not configured." };

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(setCookies) {
        try {
          setCookies.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options));
        } catch {
          // Server components cannot always write cookies; middleware or route handlers refresh them on the next request.
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, supabase, reason: "Unauthenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? user.user_metadata?.role ?? "member");
  if (!isAuthorityAdmin(role)) return { user: null, supabase, reason: "Forbidden." };

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email,
      role,
      fullName: typeof profile?.full_name === "string" ? profile.full_name : user.user_metadata?.full_name,
    },
  };
}

export async function requireAuthorityPage(nextPath = "/admin/authority") {
  const session = await getAuthoritySession();
  const next = encodeURIComponent(nextPath);
  if (session.reason === "Unauthenticated.") redirect(`/auth/login?next=${next}`);
  if (!session.user) redirect(`/auth/login?next=${next}&error=admin-required`);
  return session.user;
}

export async function requireAuthorityApi(request: Request, options: { allowCron?: boolean } = {}) {
  if (options.allowCron && process.env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) {
    return { ok: true as const, actor: "render-cron", role: "system" };
  }

  const session = await getAuthoritySession();
  if (session.reason === "Unauthenticated.") return { ok: false as const, response: apiError("Authentication required.", 401) };
  if (!session.user) return { ok: false as const, response: apiError(session.reason ?? "Forbidden.", 403) };
  return { ok: true as const, actor: session.user.email, role: session.user.role };
}

export function isAuthorityAdmin(role: string): boolean {
  return ["admin", "administrator", "owner", "founder"].includes(role.toLowerCase());
}
