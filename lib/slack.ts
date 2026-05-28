interface SlackLead {
  company: string;
  score: number;
  source: string;
  uses_ai: boolean;
  team_size: string;
}

export async function notifyQualifiedLead(lead: SlackLead): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const sourceLabels: Record<string, string> = {
    scraper_jobs: "Job board (hiring compliance)",
    scraper_ai: "AI company registry",
    scraper_startups: "Funded startup finder",
    checklist: "Downloaded checklist",
    organic: "Organic signup",
    referral: "Partner referral",
    assessment_eu_ai_act: "EU AI Act Assessment",
    assessment_gdpr: "GDPR Fine Calculator",
    assessment_frameworks: "Compliance Stack Audit",
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `New qualified lead: ${lead.company}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: [
              `*New SQL:* ${lead.company}`,
              `*Score:* ${lead.score}`,
              `*Source:* ${sourceLabels[lead.source] ?? lead.source}`,
              `*AI:* ${lead.uses_ai ? "Yes" : "No"}`,
              `*Size:* ${lead.team_size}`,
              "First to claim in thread gets it.",
            ].join("\n"),
          },
        },
      ],
    }),
  });
}
