const HUBSPOT_BASE = "https://api.hubapi.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

interface HubSpotContact {
  email: string;
  company: string;
  team_size: string;
  lead_score: number;
  source: string;
}

export async function createOrUpdateContact(contact: HubSpotContact) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      properties: {
        email: contact.email,
        company: contact.company,
        hs_lead_status: contact.lead_score >= 40 ? "QUALIFIED" : "NEW",
        jobtitle: contact.source,
        num_employees: contact.team_size,
      },
    }),
  });

  if (res.status === 409) {
    const existing = await res.json();
    const contactId = existing.message?.match(/ID: (\d+)/)?.[1];
    if (contactId) {
      await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          properties: {
            hs_lead_status: contact.lead_score >= 40 ? "QUALIFIED" : "NEW",
            num_employees: contact.team_size,
          },
        }),
      });
    }
  }
}

interface HubSpotDeal {
  name: string;
  contactEmail: string;
  stage: string;
  amount: number;
  ownerId?: string;
}

export async function createDeal(deal: HubSpotDeal) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;

  await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      properties: {
        dealname: deal.name,
        dealstage: deal.stage,
        amount: deal.amount.toString(),
        hubspot_owner_id: deal.ownerId,
      },
    }),
  });
}
