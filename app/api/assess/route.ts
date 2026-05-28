import { createAdminClient } from "@/lib/supabase/server";
import { scoreLead, qualifyStatus } from "@/lib/scoring";
import { notifyQualifiedLead } from "@/lib/slack";
import { createOrUpdateContact } from "@/lib/hubspot";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/security";
import { z } from "zod";

const AssessmentSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  company: z.string().min(1).max(200),
  source: z.enum([
    "assessment_eu_ai_act",
    "assessment_gdpr",
    "assessment_frameworks",
  ]),
  assessment_data: z
    .record(z.string().max(100), z.unknown())
    .refine((obj) => JSON.stringify(obj).length < 10_000, {
      message: "Assessment data too large",
    }),
});

export async function POST(request: Request) {
  try {
    if (!validateOrigin(request)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    const { ok } = rateLimit(`assess:${ip}`, 10, 60_000);
    if (!ok) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = AssessmentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, company, source, assessment_data } = parsed.data;
    const admin = createAdminClient();

    const uses_ai = Boolean(assessment_data.uses_ai);
    const team_size =
      typeof assessment_data.team_size === "string"
        ? assessment_data.team_size
        : "1-10";
    const compliance_measures_count = Array.isArray(
      assessment_data.compliance_measures
    )
      ? assessment_data.compliance_measures.length
      : 0;

    const score = scoreLead({
      source,
      uses_ai,
      team_size,
      funding_stage: "unknown",
      email,
      compliance_measures_count,
    });
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
        assessment_data,
      })
      .select("id, score, status")
      .single();

    if (error) {
      return Response.json({ error: "Failed to create lead" }, { status: 500 });
    }

    await admin.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "assessment_submit",
      metadata: { name, source, risk_level: assessment_data.risk_level },
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
