const FREEMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "aol.com", "icloud.com", "mail.com", "protonmail.com",
  "gmx.de", "web.de", "t-online.de", "freenet.de",
]);

function isFreemailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return FREEMAIL_DOMAINS.has(domain ?? "");
}

export interface LeadForScoring {
  source: string;
  uses_ai: boolean;
  team_size: string;
  funding_stage: string;
  email: string;
  compliance_measures_count?: number;
}

export function scoreLead(lead: LeadForScoring): number {
  let score = 0;

  if (lead.source === "scraper_jobs") score += 10;
  if (lead.source === "scraper_ai") score += 10;
  if (lead.uses_ai) score += 25;
  if (lead.team_size === "11-50") score += 20;
  if (lead.team_size === "51-200") score += 15;
  if (["seed", "series-a", "series-b"].includes(lead.funding_stage))
    score += 15;
  if (lead.source === "checklist") score += 10;
  if (!isFreemailDomain(lead.email)) score += 5;

  const assessmentSources = [
    "assessment_eu_ai_act",
    "assessment_gdpr",
    "assessment_frameworks",
  ];
  if (assessmentSources.includes(lead.source)) score += 10;

  if (
    assessmentSources.includes(lead.source) &&
    lead.uses_ai &&
    lead.compliance_measures_count === 0
  ) {
    score += 15;
  }

  return score;
}

export function qualifyStatus(score: number): "qualified" | "new" {
  return score >= 40 ? "qualified" : "new";
}
