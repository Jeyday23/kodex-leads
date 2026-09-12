"use client";

// Client tab view for the Growth Engine site-audit admin page. Deliberately
// does NOT import from lib/growth/audit/history.ts or run-audit.ts: those
// modules reach lib/seo/db.ts (a privileged server module), and
// tests/server-module-boundaries.test.ts forbids any client component from
// reaching it - even through a type-only import, since the boundary check
// walks import specifiers without distinguishing `import type`. Prop shapes
// below are declared locally instead, and populated by the server page from
// the real history/run-audit types.

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AuthorityActionButton } from "../AuthorityActions";
import type { PsiCategoryScores, PsiMetricResult, PsiRunStatus } from "@/lib/growth/audit/pagespeed";
import type { CacheabilitySummary, RenderBlockingSummary, TechnicalAuditStatus } from "@/lib/growth/audit/technical";
import type { GeoCheckResult } from "@/lib/growth/audit/geo-checklist";
import type { SiteFileResult } from "@/lib/growth/audit/site-files";

type AuditKindLocal = "lighthouse" | "technical" | "geo" | "site_files";
type AuditDeviceLocal = "mobile" | "desktop" | null;

export interface AuditRowLike {
  id: string;
  url: string;
  kind: AuditKindLocal;
  device: AuditDeviceLocal;
  score: number | null;
  payload: unknown;
  issues: unknown;
  measuredAt: string;
}

export interface TrendPointLike {
  measuredAt: string;
  score: number | null;
}

interface LighthousePayload {
  status: PsiRunStatus;
  categories: PsiCategoryScores;
  metrics: PsiMetricResult[];
  detail?: string;
}

interface TechnicalPayload {
  status: TechnicalAuditStatus;
  httpStatus: number | null;
  server: string | null;
  contentEncoding: string | null;
  byteSize: number | null;
  ttfbMs: number | null;
  cacheability: CacheabilitySummary;
  renderBlocking: RenderBlockingSummary;
  detail?: string;
}

interface GeoPayload {
  checks: GeoCheckResult[];
}

interface SiteFilesPayload {
  robotsTxt: SiteFileResult;
  llmsTxt: SiteFileResult;
  sitemapXml: SiteFileResult;
}

interface AuditIssueLike {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  fix: string;
}

type Tab = "seo" | "technical" | "geo";

export function SiteAuditView({
  url,
  audits,
  trends,
  trendDays,
  supabaseConfigured,
  pagespeedConfigured,
}: {
  url: string;
  audits: AuditRowLike[];
  trends: Record<string, TrendPointLike[]>;
  trendDays: number;
  supabaseConfigured: boolean;
  pagespeedConfigured: boolean;
}) {
  const [tab, setTab] = useState<Tab>("seo");

  const mobile = audits.find((row) => row.kind === "lighthouse" && row.device === "mobile");
  const desktop = audits.find((row) => row.kind === "lighthouse" && row.device === "desktop");
  const technical = audits.find((row) => row.kind === "technical");
  const geo = audits.find((row) => row.kind === "geo");
  const siteFiles = audits.find((row) => row.kind === "site_files");

  const allIssues = useMemo(() => {
    const collected: AuditIssueLike[] = [];
    for (const row of audits) {
      if (Array.isArray(row.issues)) collected.push(...(row.issues as AuditIssueLike[]));
    }
    return collected;
  }, [audits]);

  if (!supabaseConfigured) {
    return (
      <section className="authority-panel">
        <h2>Supabase not configured</h2>
        <p className="authority-empty">
          Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to store and view site audits for {url}.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="authority-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <p className="authority-empty" style={{ margin: 0 }}>Audited URL</p>
          <strong>{url}</strong>
          {!pagespeedConfigured ? (
            <p className="authority-empty" style={{ marginTop: 6 }}>
              PAGESPEED_API_KEY is not set. Lighthouse scores still run against the public PageSpeed Insights quota.
            </p>
          ) : null}
        </div>
        <AuthorityActionButton endpoint="/api/growth/audit/run" label="Run audit" body={{ url }} />
      </section>

      <nav className="authority-nav" aria-label="Site audit tabs" style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {(["seo", "technical", "geo"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "authority-primary" : "authority-link-button"}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
          >
            {id === "seo" ? "SEO" : id === "technical" ? "Technical" : "GEO"}
          </button>
        ))}
      </nav>

      {tab === "seo" ? (
        <SeoTab mobile={mobile} desktop={desktop} trends={trends} trendDays={trendDays} />
      ) : null}
      {tab === "technical" ? <TechnicalTab technical={technical} issues={allIssues} trends={trends} trendDays={trendDays} /> : null}
      {tab === "geo" ? <GeoTab geo={geo} siteFiles={siteFiles} trends={trends} trendDays={trendDays} /> : null}
    </>
  );
}

function ScoreRing({ label, score }: { label: string; score: number | null }) {
  const value = score ?? 0;
  const color = score === null ? "#c9c2d1" : score >= 90 ? "#2f8a4b" : score >= 50 ? "#b8860b" : "#b3261e";
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - value / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${label} score ${score ?? "not available"}`}>
        <circle cx="44" cy="44" r="34" fill="none" stroke="#eeeaf2" strokeWidth="8" />
        {score !== null ? (
          <circle
            cx="44"
            cy="44"
            r="34"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
          />
        ) : null}
        <text x="44" y="49" textAnchor="middle" fontSize="20" fontWeight="700" fill="#2a2530">
          {score ?? "—"}
        </text>
      </svg>
      <span className="authority-empty">{label}</span>
    </div>
  );
}

function TrendLine({ title, points }: { title: string; points: TrendPointLike[] }) {
  if (points.length < 2) {
    return (
      <div className="authority-panel">
        <h2>{title}</h2>
        <p className="authority-empty">Not enough history yet. Run at least two audits to see a trend.</p>
      </div>
    );
  }

  const data = points.map((point) => ({
    date: new Date(point.measuredAt).toLocaleDateString(),
    score: point.score,
  }));

  return (
    <div className="authority-panel">
      <h2>{title}</h2>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eeeaf2" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis domain={[0, 100]} fontSize={11} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#6a4fb3" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function payloadOf<T>(row: AuditRowLike | undefined): T | null {
  if (!row) return null;
  return row.payload as T;
}

function SeoTab({
  mobile,
  desktop,
  trends,
  trendDays,
}: {
  mobile?: AuditRowLike;
  desktop?: AuditRowLike;
  trends: Record<string, TrendPointLike[]>;
  trendDays: number;
}) {
  const mobilePayload = payloadOf<LighthousePayload>(mobile);
  const desktopPayload = payloadOf<LighthousePayload>(desktop);

  if (!mobile && !desktop) {
    return (
      <section className="authority-panel">
        <h2>No audit yet</h2>
        <p className="authority-empty">Run an audit to see Lighthouse scores and Core Web Vitals.</p>
      </section>
    );
  }

  return (
    <>
      <section className="authority-panel">
        <h2>Lighthouse scores</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          <ScoreRing label="Performance (mobile)" score={mobilePayload?.categories.performance ?? null} />
          <ScoreRing label="Performance (desktop)" score={desktopPayload?.categories.performance ?? null} />
          <ScoreRing label="Accessibility" score={mobilePayload?.categories.accessibility ?? null} />
          <ScoreRing label="Best practices" score={mobilePayload?.categories.bestPractices ?? null} />
          <ScoreRing label="SEO" score={mobilePayload?.categories.seo ?? null} />
        </div>
        {mobilePayload?.status === "failed" ? <p className="authority-warning">Mobile run failed: {mobilePayload.detail}</p> : null}
        {desktopPayload?.status === "failed" ? <p className="authority-warning">Desktop run failed: {desktopPayload.detail}</p> : null}
      </section>

      <section className="authority-panel">
        <h2>Core Web Vitals (mobile)</h2>
        <div className="dashboard-grid">
          {(mobilePayload?.metrics ?? []).map((metric) => (
            <article className="metric-tile" key={metric.id}>
              <span>{metric.label}</span>
              <strong>{metric.displayValue ?? (metric.value === null ? "—" : metric.value)}</strong>
              <p>{metric.pass === null ? "Not measured" : metric.pass ? "Passes threshold" : `Above ${metric.threshold}${metric.unit === "ms" ? "ms" : ""} threshold`}</p>
            </article>
          ))}
        </div>
      </section>

      <TrendLine title={`Performance trend, mobile (${trendDays}d)`} points={trends["lighthouse:mobile"] ?? []} />
      <TrendLine title={`Performance trend, desktop (${trendDays}d)`} points={trends["lighthouse:desktop"] ?? []} />
    </>
  );
}

function TechnicalTab({
  technical,
  issues,
  trends,
  trendDays,
}: {
  technical?: AuditRowLike;
  issues: AuditIssueLike[];
  trends: Record<string, TrendPointLike[]>;
  trendDays: number;
}) {
  const payload = payloadOf<TechnicalPayload>(technical);
  const technicalIssues = issues.filter((issue) => issue.id.startsWith("technical_"));

  if (!technical || !payload) {
    return (
      <section className="authority-panel">
        <h2>No audit yet</h2>
        <p className="authority-empty">Run an audit to see technical health.</p>
      </section>
    );
  }

  if (payload.status === "failed") {
    return (
      <section className="authority-panel">
        <h2>Technical audit failed</h2>
        <p className="authority-warning">{payload.detail}</p>
      </section>
    );
  }

  const rows: Array<[string, string]> = [
    ["HTTP status", String(payload.httpStatus ?? "—")],
    ["Server header", payload.server ?? "Not set"],
    ["Content encoding", payload.contentEncoding ?? "Not set"],
    ["Page size", payload.byteSize !== null ? `${Math.round(payload.byteSize / 1024)} KB` : "—"],
    ["TTFB", payload.ttfbMs !== null ? `${payload.ttfbMs} ms` : "—"],
    ["Cache-Control", payload.cacheability.cacheControl ?? "Not set"],
    ["Cacheable", payload.cacheability.cacheable ? "Yes" : "No"],
    ["Render-blocking scripts", String(payload.renderBlocking.blockingScriptCount)],
    ["Head stylesheets", String(payload.renderBlocking.headStylesheetCount)],
  ];

  return (
    <>
      <section className="authority-panel">
        <h2>Technical health</h2>
        <div className="queue-table">
          {rows.map(([label, value]) => (
            <div className="queue-row" key={label} style={{ gridTemplateColumns: "1fr 1fr" }}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="authority-panel">
        <h2>Issues</h2>
        {technicalIssues.length === 0 ? (
          <p className="authority-empty">No technical issues found.</p>
        ) : (
          technicalIssues.map((issue) => (
            <div className="authority-priority-item" key={issue.id}>
              <span>
                <strong>{issue.message}</strong>
                <br />
                <small>{issue.fix}</small>
              </span>
              <span className={`authority-status-dot ${issue.severity === "high" ? "critical" : issue.severity === "medium" ? "warning" : "ok"}`} />
            </div>
          ))
        )}
      </section>

      <TrendLine title={`Technical score trend (${trendDays}d)`} points={trends["technical:"] ?? []} />
    </>
  );
}

function GeoTab({
  geo,
  siteFiles,
  trends,
  trendDays,
}: {
  geo?: AuditRowLike;
  siteFiles?: AuditRowLike;
  trends: Record<string, TrendPointLike[]>;
  trendDays: number;
}) {
  const geoPayload = payloadOf<GeoPayload>(geo);
  const filesPayload = payloadOf<SiteFilesPayload>(siteFiles);

  if (!geoPayload) {
    return (
      <section className="authority-panel">
        <h2>No audit yet</h2>
        <p className="authority-empty">Run an audit to see the GEO citation-readiness checklist.</p>
      </section>
    );
  }

  return (
    <>
      <section className="authority-panel">
        <h2>GEO citation-readiness checklist</h2>
        {geoPayload.checks.map((check) => (
          <div className="authority-priority-item" key={check.id}>
            <span>
              <strong>{check.label}</strong>
              <br />
              <small>{check.detail}</small>
              {check.status === "fix" ? (
                <>
                  <br />
                  <small>Fix: {check.fix}</small>
                </>
              ) : null}
            </span>
            <span className={`authority-status-dot ${check.status === "pass" ? "ok" : "warning"}`} />
          </div>
        ))}
      </section>

      <section className="authority-panel">
        <h2>Site files</h2>
        {filesPayload ? (
          <div className="dashboard-grid">
            <SiteFileTile label="robots.txt" file={filesPayload.robotsTxt} />
            <SiteFileTile label="llms.txt" file={filesPayload.llmsTxt} />
            <SiteFileTile label="sitemap.xml" file={filesPayload.sitemapXml} />
          </div>
        ) : (
          <p className="authority-empty">Site file status not available yet.</p>
        )}
      </section>

      <TrendLine title={`GEO readiness trend (${trendDays}d)`} points={trends["geo:"] ?? []} />
    </>
  );
}

function SiteFileTile({ label, file }: { label: string; file: SiteFileResult }) {
  return (
    <article className="metric-tile">
      <span>{label}</span>
      <strong>{file.present ? "Reachable" : "Missing"}</strong>
      <p>{file.present ? `HTTP ${file.status}` : file.detail ?? "Not reachable"}</p>
    </article>
  );
}
