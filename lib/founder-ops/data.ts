import "server-only";

export type FounderOpsDeal = {
  id: string;
  company: string;
  stage: string;
  nextAction: string;
  value: string;
  owner: string;
};

export type FounderOpsTask = {
  id: string;
  title: string;
  status: string;
  due: string;
  owner: string;
};

export type FounderOpsSnapshot = {
  airtable: {
    configured: boolean;
    live: boolean;
    error: string | null;
    deals: FounderOpsDeal[];
    tasks: FounderOpsTask[];
  };
  github: {
    configured: boolean;
    live: boolean;
    error: string | null;
    repository: string;
    openIssues: number;
    stars: number;
    defaultBranch: string;
    updatedAt: string | null;
  };
  generatedAt: string;
};

type AirtableRecord = { id: string; fields?: Record<string, unknown> };

const sampleDeals: FounderOpsDeal[] = [
  { id: "sample-deal", company: "Example design partner", stage: "Discovery", nextAction: "Confirm pilot scope", value: "Sample", owner: "Founder" },
];

const sampleTasks: FounderOpsTask[] = [
  { id: "sample-task", title: "Review integration checklist", status: "Open", due: "Sample", owner: "Founder" },
];

export async function getFounderOpsSnapshot(): Promise<FounderOpsSnapshot> {
  const [airtable, github] = await Promise.all([getAirtableSnapshot(), getGitHubSnapshot()]);
  return { airtable, github, generatedAt: new Date().toISOString() };
}

async function getAirtableSnapshot(): Promise<FounderOpsSnapshot["airtable"]> {
  const token = process.env.AIRTABLE_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const dealsTableId = process.env.AIRTABLE_DEALS_TABLE_ID;
  const tasksTableId = process.env.AIRTABLE_TASKS_TABLE_ID;
  const configured = Boolean(token && baseId && dealsTableId && tasksTableId);

  if (!configured) {
    return { configured: false, live: false, error: null, deals: sampleDeals, tasks: sampleTasks };
  }

  try {
    const [dealRecords, taskRecords] = await Promise.all([
      listAirtableRecords(baseId!, dealsTableId!, token!),
      listAirtableRecords(baseId!, tasksTableId!, token!),
    ]);

    return {
      configured: true,
      live: true,
      error: null,
      deals: dealRecords.map(mapDeal),
      tasks: taskRecords.map(mapTask),
    };
  } catch (error) {
    return {
      configured: true,
      live: false,
      error: error instanceof Error ? error.message : "Airtable connection failed.",
      deals: sampleDeals,
      tasks: sampleTasks,
    };
  }
}

async function listAirtableRecords(baseId: string, tableId: string, token: string): Promise<AirtableRecord[]> {
  const url = new URL(`https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`);
  url.searchParams.set("maxRecords", "25");
  url.searchParams.set("pageSize", "25");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = response.status === 401 || response.status === 403
      ? "Check the token scopes and base access."
      : `Airtable returned ${response.status}.`;
    throw new Error(detail);
  }

  const body = (await response.json()) as { records?: AirtableRecord[] };
  return Array.isArray(body.records) ? body.records : [];
}

export function mapDeal(record: AirtableRecord): FounderOpsDeal {
  const fields = record.fields ?? {};
  return {
    id: record.id,
    company: firstText(fields, ["Company", "Company Name", "Account", "Organization", "Name"], "Untitled opportunity"),
    stage: firstText(fields, ["Stage", "Status", "Pipeline Stage"], "Unspecified"),
    nextAction: firstText(fields, ["Next Action", "Next action", "Next Step", "Next step"], "No next action"),
    value: firstText(fields, ["Expected Value", "Deal Value", "Value", "Amount"], "—"),
    owner: firstText(fields, ["Owner", "Assigned To", "Lead Owner"], "Unassigned"),
  };
}

export function mapTask(record: AirtableRecord): FounderOpsTask {
  const fields = record.fields ?? {};
  return {
    id: record.id,
    title: firstText(fields, ["Task", "Title", "Name", "Action"], "Untitled task"),
    status: firstText(fields, ["Status", "State"], "Open"),
    due: firstText(fields, ["Due Date", "Due", "Deadline"], "No due date"),
    owner: firstText(fields, ["Owner", "Assigned To", "Assignee"], "Unassigned"),
  };
}

async function getGitHubSnapshot(): Promise<FounderOpsSnapshot["github"]> {
  const repository = process.env.FOUNDER_OPS_GITHUB_REPOSITORY ?? "Jeyday23/kodex-leads";
  const configured = /^[^/]+\/[^/]+$/.test(repository);
  if (!configured) return emptyGitHub(repository, "Use the owner/repository format.");

  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com/repos/${repository}`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
    const body = await response.json() as Record<string, unknown>;
    return {
      configured: true,
      live: true,
      error: null,
      repository,
      openIssues: numeric(body.open_issues_count),
      stars: numeric(body.stargazers_count),
      defaultBranch: text(body.default_branch, "main"),
      updatedAt: typeof body.updated_at === "string" ? body.updated_at : null,
    };
  } catch (error) {
    return emptyGitHub(repository, error instanceof Error ? error.message : "GitHub connection failed.");
  }
}

function emptyGitHub(repository: string, error: string): FounderOpsSnapshot["github"] {
  return { configured: Boolean(repository), live: false, error, repository, openIssues: 0, stars: 0, defaultBranch: "—", updatedAt: null };
}

function firstText(fields: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    if (key in fields) return text(fields[key], fallback);
  }
  return fallback;
}

function text(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
  if (Array.isArray(value) && value.length) return value.map((item) => text(item, "")).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    return text(candidate.name ?? candidate.email, fallback);
  }
  return fallback;
}

function numeric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
