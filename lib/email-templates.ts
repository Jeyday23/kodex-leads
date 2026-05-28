export interface TemplateVars {
  company: string;
  contact_name: string;
  title: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "eu-ai-act-deadline",
    name: "EU AI Act Deadline",
    subject: "{{company}} — 66 days until EU AI Act enforcement",
    body: `Hi {{contact_name}},

The EU AI Act enforcement deadline hits August 2. Companies using AI in the EU need to have risk assessments, technical documentation, and human oversight procedures in place by then.

I work with startups like {{company}} to get compliance-ready in weeks, not months. We handle the heavy lifting — risk classification, documentation, conformity assessment — so your team can focus on building.

Would a 15-minute call this week make sense? I can walk you through what applies to {{company}} specifically.

Best,`,
  },
  {
    id: "hiring-signal",
    name: "Hiring Compliance Role",
    subject: "Saw {{company}} is hiring for compliance",
    body: `Hi {{contact_name}},

I noticed {{company}} is hiring for a compliance-related role. That tells me you're taking regulatory requirements seriously — which puts you ahead of most companies your size.

Before you onboard someone full-time, it might be worth exploring whether an automated compliance platform could handle 80% of what you're hiring for. Our clients typically go from zero to audit-ready in under a month.

Happy to share a quick comparison of build vs. buy for {{company}}'s specific situation. Worth a 10-minute call?

Best,`,
  },
  {
    id: "assessment-followup",
    name: "Assessment Follow-up",
    subject: "Your {{company}} compliance assessment results",
    body: `Hi {{contact_name}},

Thanks for completing the compliance readiness assessment for {{company}}. Based on your answers, there are a few areas where you could close gaps quickly before the August deadline.

Rather than going through it over email, I'd love to spend 15 minutes walking you through the specific findings and what they mean for {{company}}. I can also share what similar companies in your space have done.

When works this week?

Best,`,
  },
];

export function renderTemplate(
  template: EmailTemplate,
  vars: TemplateVars
): { subject: string; body: string } {
  function replace(text: string): string {
    return text
      .replace(/\{\{company\}\}/g, vars.company)
      .replace(/\{\{contact_name\}\}/g, vars.contact_name)
      .replace(/\{\{title\}\}/g, vars.title);
  }

  return {
    subject: replace(template.subject),
    body: replace(template.body),
  };
}
