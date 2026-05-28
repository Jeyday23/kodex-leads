"use server";

import { createClient } from "@/lib/supabase/server";

export async function triggerScrapers() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET not configured");

  const res = await fetch(`${siteUrl}/api/cron`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!res.ok) throw new Error("Scraper run failed");
  return res.json();
}
