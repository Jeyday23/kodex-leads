import { createAdminClient, createClient } from "@/lib/supabase/server";
import { scoreLead, qualifyStatus } from "@/lib/scoring";
import { notifyQualifiedLead } from "@/lib/slack";
import { createOrUpdateContact } from "@/lib/hubspot";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/security";
import { z } from "zod";

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().min(1).max(200),
  team_size: z.enum(["1-10", "11-50", "51-200", "200+"]),
  uses_ai: z.boolean(),
  source: z
    .enum([
      "organic",
      "checklist",
      "scraper_jobs",
      "scraper_startups",
      "scraper_ai",
      "referral",
      "assessment_eu_ai_act",
      "assessment_gdpr",
      "assessment_frameworks",
    ])
    .default("organic"),
});

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`leads:${ip}`, 10, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = CreateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, company, team_size, uses_ai, source } = parsed.data;
    const admin = createAdminClient();

    const score = scoreLead({ source, uses_ai, team_size, funding_stage: "unknown", email });
    const status = qualifyStatus(score);

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        email,
        company,
        team_size,
        uses_ai,
        source,
        score,
        status,
      })
      .select("id, score, status")
      .single();

    if (error) {
      return Response.json({ error: "Failed to create lead" }, { status: 500 });
    }

    await admin.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "form_submit",
      metadata: { name, source },
    });

    if (status === "qualified") {
      await Promise.allSettled([
        notifyQualifiedLead({ company, score, source, uses_ai, team_size }),
        createOrUpdateContact({
          email,
          company,
          team_size,
          lead_score: score,
          source,
        }),
      ]);
    }

    return Response.json(lead, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
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

    const { data: leads } = await admin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    return Response.json(leads ?? []);
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
