"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin).replace(/\/+$/, "");
}

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/login?message=Email confirmed. You can sign in now.`,
      data: { full_name: fullName },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/reset-password-confirm`,
  });

  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) throw error;
  return data;
}
