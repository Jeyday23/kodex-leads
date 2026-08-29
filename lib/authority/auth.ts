import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthorityAdmin {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
}

type AuthorityApiResult =
  | { ok: true; actor: string; role: string }
  | { ok: false; response: Response };

const publicStagingViewer: AuthorityAdmin = {
  id: "public-staging",
  email: "public-staging@kodex.local",
  role: "viewer",
  fullName: "Public Staging Access",
};

export async function getAuthoritySession(): Promise<{ user: AuthorityAdmin | null; supabase: SupabaseClient | null; reason?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { user: null, supabase: null, reason: "Public staging read-only mode." };

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
          // Server components cannot always write cookies; route handlers refresh them on the next request.
        }
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { user: null, supabase, reason: "Public staging read-only mode." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? user.user_metadata?.role ?? "member");
  if (!isAuthorityAdmin(role)) return { user: null, supabase, reason: "Authenticated account is not an Authority administrator." };

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

export async function requireAuthorityPage(_nextPath = "/admin/authority") {
  const session = await getAuthoritySession();
  return session.user ?? publicStagingViewer;
}

export async function requireAuthorityApi(request: Request, options: { allowCron?: boolean } = {}): Promise<AuthorityApiResult> {
  if (options.allowCron && process.env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) {
    return { ok: true, actor: "render-cron", role: "system" };
  }

  const controlSecret = process.env.AUTOPILOT_CONTROL_SECRET;
  if (controlSecret && request.headers.get("x-kodex-control-secret") === controlSecret) {
    return { ok: true, actor: "founder-control", role: "founder" };
  }

  const session = await getAuthoritySession();
  if (session.user && isAuthorityAdmin(session.user.role)) {
    return { ok: true, actor: session.user.email, role: session.user.role };
  }

  return {
    ok: false,
    response: Response.json(
      {
        status: "error",
        error: "Private founder authorization required for this action.",
        code: "FOUNDER_CONTROL_REQUIRED",
      },
      { status: 403 },
    ),
  };
}

export function isAuthorityAdmin(role: string): boolean {
  return ["admin", "administrator", "owner", "founder"].includes(role.toLowerCase());
}
