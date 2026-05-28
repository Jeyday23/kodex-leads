import { createAdminClient } from "@/lib/supabase/server";
import { scrapeJobs } from "@/lib/scrapers/jobs";
import { scrapeStartups } from "@/lib/scrapers/startups";
import { scrapeAICompanies } from "@/lib/scrapers/ai-companies";
import { enrichLeads } from "@/lib/scrapers/enrich";
import { enrichContacts } from "@/lib/scrapers/enrich-contacts";
import { scoreLead, qualifyStatus } from "@/lib/scoring";
import { notifyQualifiedLead } from "@/lib/slack";
import { safeCompare } from "@/lib/security";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || !safeCompare(secret, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const results: Record<string, { found: number; qualified: number; errors: string[] }> = {};

  const scrapers = [
    { name: "jobs", fn: scrapeJobs },
    { name: "startups", fn: scrapeStartups },
    { name: "ai", fn: scrapeAICompanies },
  ] as const;

  for (const scraper of scrapers) {
    const { data: run } = await admin
      .from("scrape_runs")
      .insert({ scraper_type: scraper.name, status: "running" })
      .select("id")
      .single();

    try {
      const result = await scraper.fn();
      let qualified = 0;

      for (const lead of result.leads) {
        const { data: existing } = await admin
          .from("leads")
          .select("id")
          .ilike("company", lead.company)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const score = scoreLead({
          source: lead.source,
          uses_ai: lead.uses_ai ?? false,
          team_size: lead.team_size ?? "unknown",
          funding_stage: "unknown",
          email: lead.email ?? "unknown@unknown.com",
        });
        const status = qualifyStatus(score);
        if (status === "qualified") qualified++;

        const { data: inserted } = await admin
          .from("leads")
          .insert({
            company: lead.company,
            email: lead.email ?? `info@${lead.company.toLowerCase().replace(/\s+/g, "")}.com`,
            source: lead.source,
            source_url: lead.source_url,
            score,
            status,
            uses_ai: lead.uses_ai ?? false,
            team_size: lead.team_size,
            scrape_batch_id: run?.id,
          })
          .select("id, company, score, status")
          .single();

        if (inserted && status === "qualified") {
          await notifyQualifiedLead({
            company: lead.company,
            score,
            source: lead.source,
            uses_ai: lead.uses_ai ?? false,
            team_size: lead.team_size ?? "unknown",
          });
        }
      }

      await admin
        .from("scrape_runs")
        .update({
          status: result.errors.length > 0 ? "completed" : "completed",
          finished_at: new Date().toISOString(),
          leads_found: result.leads.length,
          leads_qualified: qualified,
          errors: result.errors,
        })
        .eq("id", run?.id);

      results[scraper.name] = {
        found: result.leads.length,
        qualified,
        errors: result.errors,
      };
    } catch (err) {
      await admin
        .from("scrape_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          errors: [String(err)],
        })
        .eq("id", run?.id);

      results[scraper.name] = { found: 0, qualified: 0, errors: [String(err)] };
    }
  }

  // Enrichment pass
  const { data: unenriched } = await admin
    .from("leads")
    .select("id, company, email")
    .like("email", "info@%")
    .limit(50);

  if (unenriched && unenriched.length > 0) {
    const enriched = await enrichLeads(
      unenriched.map((l) => ({
        company: l.company,
        domain: l.email.split("@")[1],
      }))
    );

    for (let i = 0; i < enriched.length; i++) {
      if (enriched[i].email) {
        await admin
          .from("leads")
          .update({ email: enriched[i].email })
          .eq("id", unenriched[i].id);
      }
    }

    results.enrich = { found: enriched.filter((e) => e.email).length, qualified: 0, errors: [] };
  }

  // Decision maker enrichment — find contacts for leads with none
  const { data: leadsWithoutContacts } = await admin
    .from("leads")
    .select("id, company, email, team_size")
    .eq("status", "qualified")
    .not("email", "is", null)
    .limit(30);

  if (leadsWithoutContacts && leadsWithoutContacts.length > 0) {
    const leadIdsWithContacts = new Set<string>();
    const { data: existingContacts } = await admin
      .from("contacts")
      .select("lead_id")
      .in("lead_id", leadsWithoutContacts.map((l) => l.id));

    for (const c of existingContacts ?? []) {
      leadIdsWithContacts.add(c.lead_id);
    }

    const needsEnrichment = leadsWithoutContacts.filter(
      (l) => !leadIdsWithContacts.has(l.id)
    );

    if (needsEnrichment.length > 0) {
      try {
        const contacts = await enrichContacts(
          needsEnrichment.map((l) => ({
            lead_id: l.id,
            company: l.company,
            domain: l.email.split("@")[1],
            team_size: l.team_size ?? "unknown",
          }))
        );

        let contactsInserted = 0;
        for (const contact of contacts) {
          const { error } = await admin.from("contacts").insert({
            lead_id: contact.lead_id,
            name: contact.name,
            title: contact.title,
            email: contact.email,
            linkedin_url: contact.linkedin_url,
            enrichment_source: contact.source,
          });
          if (!error) contactsInserted++;
        }

        results.contacts = {
          found: contactsInserted,
          qualified: 0,
          errors: [],
        };
      } catch (err) {
        results.contacts = { found: 0, qualified: 0, errors: [String(err)] };
      }
    }
  }

  const { data: purged } = await admin.rpc("purge_stale_scraped_leads");

  return Response.json({ results, purged: purged ?? 0 });
}
