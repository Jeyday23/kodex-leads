"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/+$/, "");
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Confirmation links land on the callback route, which exchanges the code
      // for a cookie session before redirecting.
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/auth/login`,
      data: { full_name: fullName },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/auth/reset-password-confirm`,
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw error;
  return data;
}
