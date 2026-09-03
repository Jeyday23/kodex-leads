"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "./config";

/**
 * Browser Supabase client. Uses @supabase/ssr so the session is written to
 * cookies rather than localStorage — this is what lets middleware and server
 * components see the signed-in user.
 */
export function createSupabaseBrowserClient() {
  const config = getSupabaseAuthConfig();
  if (!config) {
    throw new Error(
      "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(config.url, config.anonKey);
}
