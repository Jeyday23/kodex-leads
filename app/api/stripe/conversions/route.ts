import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`stripe-conversions:${ip}`, 5, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: partner } = await admin
      .from("partners")
      .select("role")
      .eq("id", user.id)
      .single();

    if (partner?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripe();
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
    });

    let synced = 0;
    const conversions = [];

    for (const session of sessions.data) {
      const partnerCode = session.metadata?.partnerCode;
      if (!partnerCode || !session.customer) continue;

      const { data: partnerRecord } = await admin
        .from("partners")
        .select("id, commission_rate")
        .eq("code", partnerCode)
        .single();

      if (!partnerRecord) continue;

      const plan = session.metadata?.plan ?? "starter";
      const mrr = (session.amount_total ?? 0) / 100;
      const commissionAmount = mrr * (partnerRecord.commission_rate ?? 0.15);

      const { error } = await admin.from("conversions").upsert(
        {
          stripe_session_id: session.id,
          stripe_customer_id:
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id,
          partner_id: partnerRecord.id,
          plan,
          mrr,
          commission_amount: commissionAmount,
        },
        { onConflict: "stripe_session_id" }
      );

      if (!error) {
        synced++;
        conversions.push({
          session_id: session.id,
          partner_code: partnerCode,
          plan,
          mrr,
        });
      }
    }

    return Response.json({ synced, conversions });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
