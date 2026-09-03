import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${request.nextUrl.origin}/auth/login?reason=signed-out`, {
    status: 303,
  });
}
