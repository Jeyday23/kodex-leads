import type { Metadata } from "next";
import { getAllSeoPages } from "@/lib/seo/content";
import { displayFramework } from "@/lib/seo/config";
import { evaluateQuality } from "@/lib/seo/quality-gate";
import { pathForSeoPage } from "@/lib/seo/urls";
import { listLocalAuditEvents, listRevisionTasks } from "@/lib/seo/local-store";
import { getAiProviderStatuses } from "@/lib/seo/llm-providers";
import { SeoCommandCenter } from "@/app/seo-command-center";

export const metadata: Metadata = {
  title: "SEO Automation Queue",
  description: "Review automated SEO page quality, publication state and conversion readiness.",
  robots: { index: false, follow: false },
};

export default async function SeoAdminPage() {
  const pages = await getAllSeoPages();
  const auditEvents = await listLocalAuditEvents(8);
  const revisionTasks = await listRevisionTasks(8);
  const aiProviders = getAiProviderStatuses();
  const evaluated = pages.map((page) => {
    const quality = evaluateQuality({
      authoritativeSources: page.sources.length,
      unsupportedClaims: page.body.sections.reduce((count, section) => count + (section.claims?.length ?? 0), 0),
      similarityScore: 0,
      internalLinks: page.internalLinks.length,
      hasConversionAction: Boolean(page.body.nextAction || page.targetTool),
      hasCanonical: true,
      datesValidated: page.sources.every((source) => Boolean(source.publishedAt || source.effectiveAt)),
      hasParentHub: page.pageType === "hub" || page.internalLinks.some((link) => link.relationship === "parent" || link.relationship === "cluster"),
      legalInterpretation: page.legalInterpretation,
    });
    return { page, quality };
  });

  return (
    <main className="main">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>SEO Automation Queue</h1>
        <p className="summary">
          Monitor which pages can publish automatically, which require editorial review, and which need remediation before search exposure.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="SEO status summary">
        <div className="metric-tile">
          <span>Total pages</span>
          <strong>{pages.length}</strong>
        </div>
        <div className="metric-tile">
          <span>Published</span>
          <strong>{pages.filter((page) => page.reviewStatus === "published").length}</strong>
        </div>
        <div className="metric-tile">
          <span>Review</span>
          <strong>{pages.filter((page) => page.reviewStatus === "review").length}</strong>
        </div>
        <div className="metric-tile">
          <span>Indexable</span>
          <strong>{pages.filter((page) => !page.noindex && page.qualityScore >= 80).length}</strong>
        </div>
      </section>

      <section className="provider-grid" aria-label="AI provider integration status">
        {aiProviders.map((provider) => (
          <article className="metric-tile" key={provider.id}>
            <span>{provider.label}</span>
            <strong>{provider.configured ? "Ready" : "Needs keys"}</strong>
            <p>{provider.configured ? provider.endpoint : `Missing ${provider.missing.join(", ")}`}</p>
          </article>
        ))}
      </section>

      <section className="conversion-band" aria-label="LLM automation controls">
        <div>
          <p className="eyebrow">Answer-engine automation</p>
          <h2>ChatGPT, Claude and Perplexity checks run from one protected endpoint.</h2>
          <p>
            Configure provider keys and model names, then call `/api/seo/llm-sync` with the cron bearer token to queue provider-specific page revision tasks and citation checks.
          </p>
        </div>
        <a className="cta" href="/api/seo/ai-sitemap">Open AI Sitemap</a>
      </section>

      <section className="admin-command-panel" aria-label="Internal SEO command center">
        <SeoCommandCenter />
      </section>

      <section className="article audit-list" aria-label="Answer-engine revision tasks">
        <h2>Queued Revision Tasks</h2>
        {revisionTasks.length === 0 ? (
          <p>No answer-engine revision tasks queued yet.</p>
        ) : (
          revisionTasks.map((task) => (
            <article className="section" key={task.id}>
              <p className="eyebrow">{task.source} / {task.status}</p>
              <h2>{task.targetQuery}</h2>
              <p>{task.recommendedChange}</p>
            </article>
          ))
        )}
      </section>

      <section className="queue-table" aria-label="SEO page queue">
        <div className="queue-row queue-head">
          <span>Page</span>
          <span>Framework</span>
          <span>Status</span>
          <span>Decision</span>
          <span>Score</span>
        </div>
        {evaluated.map(({ page, quality }) => (
          <article className="queue-row" key={page.id}>
            <a href={pathForSeoPage(page)}>{page.title}</a>
            <span>{displayFramework(page.framework)}</span>
            <span>{page.reviewStatus}{page.noindex ? " / noindex" : ""}</span>
            <span>{quality.decision}</span>
            <span>{quality.score}</span>
          </article>
        ))}
      </section>

      <section className="article audit-list" aria-label="Recent SEO audit events">
        <h2>Recent Audit Events</h2>
        {auditEvents.length === 0 ? (
          <p>No local audit events yet.</p>
        ) : (
          auditEvents.map((event) => (
            <article className="section" key={event.id}>
              <p className="eyebrow">{event.eventType}</p>
              <p>{event.createdAt}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
