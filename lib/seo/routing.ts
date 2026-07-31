import "server-only";
import type { LeadCaptureInput, LeadScoreResult } from "./types";
import type { RoutingStatus } from "./local-store";

interface RouteLeadInput {
  leadId: string;
  lead: LeadCaptureInput;
  score: LeadScoreResult;
}

function status(channel: RoutingStatus["channel"], statusValue: RoutingStatus["status"], detail?: string): RoutingStatus {
  return { channel, status: statusValue, detail, at: new Date().toISOString() };
}

export async function routeQualifiedLead(input: RouteLeadInput): Promise<RoutingStatus[]> {
  const results: RoutingStatus[] = [status("local", "stored", "Lead persisted in the active storage backend.")];
  const shouldRoute = input.score.grade === "high" || input.score.grade === "sales-ready";

  if (!shouldRoute) {
    results.push(status("slack", "skipped", "Lead score is below outbound routing threshold."));
    results.push(status("hubspot", "skipped", "Lead score is below outbound routing threshold."));
    return results;
  }

  results.push(await sendSlackLead(input));
  results.push(await sendHubSpotLead(input));
  return results;
}

async function sendSlackLead(input: RouteLeadInput): Promise<RoutingStatus> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return status("slack", "skipped", "SLACK_WEBHOOK_URL is not configured.");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `SEO lead: ${input.lead.companyName} scored ${input.score.score}/100 (${input.score.grade}) for ${input.lead.framework}. Email: ${input.lead.email}.`,
      }),
    });
    if (!response.ok) return status("slack", "failed", `Slack HTTP ${response.status}`);
    return status("slack", "sent", "Lead notification sent.");
  } catch (error) {
    return status("slack", "failed", error instanceof Error ? error.message : "Unknown Slack error.");
  }
}

async function sendHubSpotLead(input: RouteLeadInput): Promise<RoutingStatus> {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) return status("hubspot", "skipped", "HUBSPOT_PRIVATE_APP_TOKEN is not configured.");

  try {
    const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email: input.lead.email,
          company: input.lead.companyName,
          lifecyclestage: input.score.grade === "sales-ready" ? "salesqualifiedlead" : "marketingqualifiedlead",
          hs_lead_status: input.score.recommendedAction,
          kodex_framework: input.lead.framework,
          kodex_lead_score: String(input.score.score),
          kodex_landing_page: input.lead.landingPage,
        },
      }),
    });
    if (!response.ok) return status("hubspot", "failed", `HubSpot HTTP ${response.status}: ${await response.text()}`);
    return status("hubspot", "sent", "Contact created.");
  } catch (error) {
    return status("hubspot", "failed", error instanceof Error ? error.message : "Unknown HubSpot error.");
  }
}
