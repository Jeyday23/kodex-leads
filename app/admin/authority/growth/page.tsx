import type { Metadata } from "next";
import { buildWeekPlan, WEEK_DAYS } from "@/lib/growth/channels/planner";
import { getSeoSupabase, getSeoSupabaseState } from "@/lib/seo/db";

export const metadata: Metadata = { title: "Growth Command", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Availability = "ready" | "empty" | "unavailable";

interface MetricState {
  status: Availability;
  value: string;
  label: string;
  detail: string;
  href?: string;
}

interface AuditMetric {
  key: string;
  label: string;
  status: Availability;
  value: string;
  delta: string;
  measuredAt: string;
}

interface SignalBucket {
  type: string;
  sevenDays: number;
  thirtyDays: number;
}

interface SequenceStats {
  status: Availability;
  sequences: number;
  activeEnrollments: number;
  awaitingTasks: number;
  totalTasks: number;
  detail: string;
}

interface AttentionItem {
  id: string;
  source: string;
  label: string;
  detail: string;
  href: string;
  createdAt: string;
}

interface QueryResult<T> {
  status: Availability;
  rows: T[];
  reason?: string;
}

interface CountResult {
  status: Availability;
  count: number;
  reason?: string;
}

interface SupabaseReadQuery extends PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> {
  eq(column: string, value: string): SupabaseReadQuery;
  gte(column: string, value: string): SupabaseReadQuery;
  in(column: string, values: string[]): SupabaseReadQuery;
  limit(count: number): SupabaseReadQuery;
  order(column: string, options?: { ascending?: boolean }): SupabaseReadQuery;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

export default async function GrowthCommandPage() {
  const supabaseState = getSeoSupabaseState();
  const [seoVisibility, aiVisibility, audits, signals, sequenceStats, plan, attention] = await Promise.all([
    getSeoVisibilityScore(),
    getAiVisibilityScore(),
    getAuditMetrics(),
    getSignalBuckets(),
    getSequenceStats(),
    buildWeekPlan(),
    getAttentionQueue(),
  ]);

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth Command</h1>
          <p>Visibility, audit, signal, outbound and planner status across the Growth Engine.</p>
        </div>
        <div className="authority-topbar-actions">
          <a className="authority-link-button" href="/admin/authority/site-audit">Site Audit</a>
          <a className="authority-link-button" href="/admin/authority/signals">Signals</a>
        </div>
      </header>

      {!supabaseState.ok ? (
        <p className="authority-empty" role="status">{supabaseState.reason}</p>
      ) : null}

      <section className="authority-metrics" aria-label="Growth visibility summary">
        <MetricCard metric={seoVisibility} />
        <MetricCard metric={aiVisibility} />
        <Metric label="Signals in 7 days" value={signals.reduce((total, signal) => total + signal.sevenDays, 0)} />
        <Metric label="Signals in 30 days" value={signals.reduce((total, signal) => total + signal.thirtyDays, 0)} />
        <Metric label="Sequences" value={sequenceStats.status === "ready" || sequenceStats.status === "empty" ? sequenceStats.sequences : "Unavailable"} />
        <Metric label="Needs attention" value={attention.filter((item) => item.source !== "Status").length} />
      </section>

      <section className="authority-split">
        <article className="authority-panel">
          <div className="result-heading">
            <div>
              <p className="eyebrow">Site health</p>
              <h2>Latest audit scores</h2>
            </div>
            <a className="authority-link-button" href="/admin/authority/site-audit">Open audit</a>
          </div>
          {audits.length === 0 ? (
            <p className="authority-empty">No site-audit rows are available yet.</p>
          ) : (
            <dl className="authority-detail-grid">
              {audits.map((audit) => (
                <div key={audit.key}>
                  <dt>{audit.label}</dt>
                  <dd>
                    {audit.value}
                    <span> {audit.delta}</span>
                    <small> {audit.measuredAt}</small>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </article>

        <article className="authority-panel">
          <div className="result-heading">
            <div>
              <p className="eyebrow">Signal mix</p>
              <h2>Leads by signal</h2>
            </div>
            <a className="authority-link-button" href="/admin/authority/signals">Open signals</a>
          </div>
          {signals.length === 0 ? (
            <p className="authority-empty">No signal events are stored for the last 30 days.</p>
          ) : (
            <dl className="authority-detail-grid">
              {signals.map((signal) => (
                <div key={signal.type}>
                  <dt>{signal.type}</dt>
                  <dd>{signal.sevenDays} in 7d / {signal.thirtyDays} in 30d</dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      </section>

      <section className="authority-split">
        <article className="authority-panel">
          <div className="result-heading">
            <div>
              <p className="eyebrow">Outbound</p>
              <h2>Sequence stats</h2>
            </div>
            <a className="authority-link-button" href="/admin/authority/sequences">Open sequences</a>
          </div>
          {sequenceStats.status === "unavailable" ? (
            <p className="authority-empty">{sequenceStats.detail}</p>
          ) : (
            <dl className="authority-detail-grid">
              <div><dt>Sequences</dt><dd>{sequenceStats.sequences}</dd></div>
              <div><dt>Active enrollments</dt><dd>{sequenceStats.activeEnrollments}</dd></div>
              <div><dt>Tasks awaiting action</dt><dd>{sequenceStats.awaitingTasks}</dd></div>
              <div><dt>Total tasks</dt><dd>{sequenceStats.totalTasks}</dd></div>
            </dl>
          )}
        </article>

        <article className="authority-panel">
          <div className="result-heading">
            <div>
              <p className="eyebrow">This week</p>
              <h2>Planner strip</h2>
            </div>
            <a className="authority-link-button" href="/admin/authority/planner">Open planner</a>
          </div>
          <div className="authority-table-head" style={{ display: "grid", gridTemplateColumns: `repeat(${WEEK_DAYS.length}, 1fr)` }}>
            {plan.days.map((day) => (
              <div key={day.day} className="authority-panel">
                <strong>{day.day}</strong>
                <p>{day.channelTasks.length} channel task{day.channelTasks.length === 1 ? "" : "s"}</p>
                <small>{day.auditFixTasks} audit fix{day.auditFixTasks === 1 ? "" : "es"}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="authority-panel">
        <div className="result-heading">
          <div>
            <p className="eyebrow">Founder review</p>
            <h2>Needs your attention</h2>
          </div>
        </div>
        {attention.length === 0 ? (
          <p className="authority-empty">No outreach tasks, channel drafts, CMO proposals or failed jobs currently need attention.</p>
        ) : (
          <div className="authority-stack">
            {attention.map((item) => (
              <a className="authority-priority-item" href={item.href} key={`${item.source}-${item.id}`}>
                <strong>{item.label}</strong>
                <span>{item.source} - {item.detail}{item.createdAt ? ` - ${formatDate(item.createdAt)}` : ""}</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ metric }: { metric: MetricState }) {
  const body = (
    <article>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.detail}</small>
    </article>
  );
  return metric.href ? <a href={metric.href}>{body}</a> : body;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

async function getSeoVisibilityScore(): Promise<MetricState> {
  const rows = await selectRows<{
    impressions?: number | string | null;
    clicks?: number | string | null;
    average_position?: number | string | null;
  }>("seo_metrics", "impressions, clicks, average_position, metric_date", (query) =>
    query.gte("metric_date", daysAgo(30)).order("metric_date", { ascending: false }).limit(500),
  );

  if (rows.status === "unavailable") {
    return unavailableMetric("SEO visibility", rows.reason ?? "SEO metrics unavailable.", "/admin/seo");
  }
  if (rows.rows.length === 0) {
    return emptyMetric("SEO visibility", "No Search Console metric rows in the last 30 days.", "/admin/seo");
  }

  let impressions = 0;
  let clicks = 0;
  let weightedPosition = 0;
  for (const row of rows.rows) {
    const rowImpressions = toNumber(row.impressions) ?? 0;
    const rowClicks = toNumber(row.clicks) ?? 0;
    const position = toNumber(row.average_position);
    impressions += rowImpressions;
    clicks += rowClicks;
    if (position !== null) weightedPosition += position * Math.max(rowImpressions, 1);
  }

  const averagePosition = weightedPosition > 0 ? weightedPosition / Math.max(impressions, rows.rows.length) : null;
  if (impressions === 0 && clicks === 0 && averagePosition === null) {
    return emptyMetric("SEO visibility", "Stored SEO metric rows have no impressions, clicks or position yet.", "/admin/seo");
  }

  const positionScore = averagePosition === null ? 0 : Math.max(0, Math.min(100, 101 - averagePosition));
  const ctrScore = impressions > 0 ? Math.min(100, (clicks / impressions) * 1000) : 0;
  const score = Math.round(positionScore * 0.7 + ctrScore * 0.3);
  return {
    status: "ready",
    label: "SEO visibility",
    value: `${score}/100`,
    detail: `${impressions} impressions, ${clicks} clicks in 30d`,
    href: "/admin/seo",
  };
}

async function getAiVisibilityScore(): Promise<MetricState> {
  const rows = await selectRows<{
    visibility_score?: number | string | null;
    citation_rate?: number | string | null;
    mention_rate?: number | string | null;
    score_date?: string | null;
  }>("visibility_scores", "visibility_score, citation_rate, mention_rate, score_date", (query) =>
    query.order("score_date", { ascending: false }).limit(1),
  );

  if (rows.status === "unavailable") {
    return unavailableMetric("AI visibility", rows.reason ?? "AI visibility scores unavailable.", "/admin/authority/observatory");
  }
  const row = rows.rows[0];
  const score = toNumber(row?.visibility_score);
  if (!row || score === null) {
    return emptyMetric("AI visibility", "No LLM visibility score has been stored yet.", "/admin/authority/observatory");
  }

  return {
    status: "ready",
    label: "AI visibility",
    value: `${Math.round(score)}/100`,
    detail: `${toPercent(row.citation_rate)} citations, ${toPercent(row.mention_rate)} mentions`,
    href: "/admin/authority/observatory",
  };
}

async function getAuditMetrics(): Promise<AuditMetric[]> {
  const rows = await selectRows<{
    id?: string;
    kind?: string | null;
    device?: string | null;
    score?: number | string | null;
    measured_at?: string | null;
  }>("growth_site_audits", "id, kind, device, score, measured_at", (query) =>
    query.order("measured_at", { ascending: false }).limit(200),
  );

  if (rows.status === "unavailable") {
    return [{
      key: "unavailable",
      label: "Site audits",
      status: "unavailable",
      value: "Unavailable",
      delta: rows.reason ?? "Table unavailable",
      measuredAt: "",
    }];
  }

  const grouped = new Map<string, typeof rows.rows>();
  for (const row of rows.rows) {
    const key = `${row.kind ?? "unknown"}:${row.device ?? ""}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.entries()].slice(0, 6).map(([key, group]) => {
    const latest = group[0];
    const previous = group[1];
    const score = toNumber(latest?.score);
    const previousScore = toNumber(previous?.score);
    return {
      key,
      label: auditLabel(latest?.kind, latest?.device),
      status: score === null ? "empty" : "ready",
      value: score === null ? "No score" : `${Math.round(score)}/100`,
      delta: score === null || previousScore === null ? "no prior delta" : formatDelta(score - previousScore),
      measuredAt: latest?.measured_at ? formatDate(latest.measured_at) : "",
    };
  });
}

async function getSignalBuckets(): Promise<SignalBucket[]> {
  const rows = await selectRows<{ type?: string | null; detected_at?: string | null }>(
    "growth_signal_events",
    "type, detected_at",
    (query) => query.gte("detected_at", daysAgo(30)).order("detected_at", { ascending: false }).limit(1000),
  );
  if (rows.status !== "ready" && rows.status !== "empty") return [];

  const sevenDayCutoff = new Date(daysAgo(7)).getTime();
  const buckets = new Map<string, SignalBucket>();
  for (const row of rows.rows) {
    const type = row.type ?? "unknown";
    const bucket = buckets.get(type) ?? { type, sevenDays: 0, thirtyDays: 0 };
    bucket.thirtyDays += 1;
    const detectedAt = row.detected_at ? new Date(row.detected_at).getTime() : 0;
    if (detectedAt >= sevenDayCutoff) bucket.sevenDays += 1;
    buckets.set(type, bucket);
  }
  return [...buckets.values()].sort((a, b) => b.thirtyDays - a.thirtyDays);
}

async function getSequenceStats(): Promise<SequenceStats> {
  const [sequences, enrollments, tasks] = await Promise.all([
    countRows("growth_sequences"),
    selectRows<{ state?: string | null }>("growth_sequence_enrollments", "state", (query) => query.limit(1000)),
    selectRows<{ status?: string | null }>("growth_outreach_tasks", "status", (query) => query.limit(1000)),
  ]);

  if ([sequences.status, enrollments.status, tasks.status].some((status) => status === "unavailable")) {
    return {
      status: "unavailable",
      sequences: 0,
      activeEnrollments: 0,
      awaitingTasks: 0,
      totalTasks: 0,
      detail: "Sequence tables are unavailable or Supabase is not configured.",
    };
  }

  const activeEnrollments = enrollments.rows.filter((row) => row.state === "active" || row.state === "awaiting_approval").length;
  const awaitingTasks = tasks.rows.filter((row) => row.status === "queued" || row.status === "approved").length;
  return {
    status: sequences.count === 0 && tasks.rows.length === 0 ? "empty" : "ready",
    sequences: sequences.count,
    activeEnrollments,
    awaitingTasks,
    totalTasks: tasks.rows.length,
    detail: sequences.count === 0 ? "No sequences have been created yet." : "Sequence tables are ready.",
  };
}

async function getAttentionQueue(): Promise<AttentionItem[]> {
  const [tasks, drafts, cmoActions, failures] = await Promise.all([
    selectRows<{ id?: string; kind?: string | null; status?: string | null; due_at?: string | null }>(
      "growth_outreach_tasks",
      "id, kind, status, due_at, created_at",
      (query) => query.in("status", ["queued", "approved"]).order("due_at", { ascending: true }).limit(8),
    ),
    selectRows<{ id?: string; channel?: string | null; title?: string | null; created_at?: string | null }>(
      "growth_channel_drafts",
      "id, channel, title, created_at",
      (query) => query.eq("status", "draft").order("created_at", { ascending: false }).limit(8),
    ),
    selectRows<{ id?: string; kind?: string | null; created_at?: string | null }>(
      "growth_cmo_actions",
      "id, kind, created_at",
      (query) => query.eq("status", "proposed").order("created_at", { ascending: false }).limit(8),
    ),
    selectRows<{ id?: string; error?: string | null; provider?: string | null; created_at?: string | null }>(
      "job_failures",
      "id, error, provider, created_at",
      (query) => query.order("created_at", { ascending: false }).limit(8),
    ),
  ]);

  const items: AttentionItem[] = [];
  for (const task of tasks.rows) {
    items.push({
      id: task.id ?? `task-${items.length}`,
      source: "Outreach",
      label: `${task.kind ?? "Task"} awaiting ${task.status === "approved" ? "completion" : "approval"}`,
      detail: task.due_at ? `due ${formatDate(task.due_at)}` : "no due date",
      href: "/admin/authority/sequences",
      createdAt: task.due_at ?? "",
    });
  }
  for (const draft of drafts.rows) {
    items.push({
      id: draft.id ?? `draft-${items.length}`,
      source: "Channels",
      label: draft.title ?? `${draft.channel ?? "Channel"} draft`,
      detail: "awaiting approve/reject decision",
      href: "/admin/authority/planner",
      createdAt: draft.created_at ?? "",
    });
  }
  for (const action of cmoActions.rows) {
    items.push({
      id: action.id ?? `cmo-${items.length}`,
      source: "CMO",
      label: action.kind ?? "CMO proposal",
      detail: "awaiting confirmation",
      href: "/admin/authority/cmo",
      createdAt: action.created_at ?? "",
    });
  }
  for (const failure of failures.rows) {
    items.push({
      id: failure.id ?? `failure-${items.length}`,
      source: "Failures",
      label: failure.provider ? `${failure.provider} job failed` : "Background job failed",
      detail: truncate(failure.error ?? "No error message stored.", 120),
      href: "/admin/authority/failures",
      createdAt: failure.created_at ?? "",
    });
  }

  return items
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 12);
}

async function selectRows<T extends Record<string, unknown>>(
  table: string,
  columns: string,
  apply?: (query: SupabaseReadQuery) => SupabaseReadQuery,
): Promise<QueryResult<T>> {
  const supabase = getSeoSupabase();
  if (!supabase) return { status: "unavailable", rows: [], reason: "Supabase is not configured." };

  try {
    let query = supabase.from(table).select(columns) as unknown as SupabaseReadQuery;
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return { status: "unavailable", rows: [], reason: error.message };
    const rows = (data ?? []) as T[];
    return { status: rows.length === 0 ? "empty" : "ready", rows };
  } catch (error) {
    return { status: "unavailable", rows: [], reason: error instanceof Error ? error.message : String(error) };
  }
}

async function countRows(table: string): Promise<CountResult> {
  const supabase = getSeoSupabase();
  if (!supabase) return { status: "unavailable", count: 0, reason: "Supabase is not configured." };

  try {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) return { status: "unavailable", count: 0, reason: error.message };
    return { status: count === 0 ? "empty" : "ready", count: count ?? 0 };
  } catch (error) {
    return { status: "unavailable", count: 0, reason: error instanceof Error ? error.message : String(error) };
  }
}

function unavailableMetric(label: string, detail: string, href?: string): MetricState {
  return { status: "unavailable", label, value: "Unavailable", detail, href };
}

function emptyMetric(label: string, detail: string, href?: string): MetricState {
  return { status: "empty", label, value: "No data", detail, href };
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPercent(value: unknown): string {
  const number = toNumber(value);
  if (number === null) return "0%";
  return `${Math.round(number)}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return DATE_FORMAT.format(date);
}

function formatDelta(value: number): string {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${Math.round(value)} pts`;
}

function auditLabel(kind: unknown, device: unknown): string {
  const kindLabel = String(kind ?? "Audit").replace(/_/g, " ");
  return `${titleCase(kindLabel)}${device ? ` ${device}` : ""}`;
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}...`;
}
