import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "./config";

/**
 * Server Supabase client bound to the request cookie jar. Returns null when
 * Supabase is not configured so callers can fail closed.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseAuthConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(setCookies) {
        try {
          setCookies.forEach((cookie) => cookieStore.set(cookie.name, cookie.value, cookie.options));
        } catch {
          // Server Components cannot write cookies. Middleware refreshes the
          // session on the next request, so this is safe to ignore here.
        }
      },
    },
  });
}
