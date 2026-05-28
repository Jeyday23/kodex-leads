import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = createAdminClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, code")
    .eq("code", code)
    .eq("status", "active")
    .single();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kodex-compliance.com";

  const redirectUrl = new URL(siteUrl);
  redirectUrl.searchParams.set("utm_source", "partner");
  redirectUrl.searchParams.set("utm_medium", "referral");
  redirectUrl.searchParams.set("utm_campaign", code);

  const response = NextResponse.redirect(redirectUrl);

  if (partner) {
    response.cookies.set("ref", code, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}
