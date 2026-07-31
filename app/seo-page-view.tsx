import type { SeoContentPage } from "@/lib/seo/types";
import { displayFramework } from "@/lib/seo/config";
import { canonicalForSeoPage } from "@/lib/seo/urls";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { SEO_EVENT_NAMES } from "@/lib/seo/attribution";

export function SeoPageView({ page }: { page: SeoContentPage }) {
  const jsonLd = [articleJsonLd(page), breadcrumbJsonLd(page)];

  return (
    <main
      className="main"
      data-seo-event={SEO_EVENT_NAMES.pageView}
      data-content-id={page.id}
      data-framework={page.framework ?? undefined}
      data-page-type={page.pageType}
      data-search-intent={page.searchIntent ?? undefined}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <p className="eyebrow">{displayFramework(page.framework)} / {page.pageType}</p>
        <h1>{page.title}</h1>
        <p className="summary">{page.body.summary}</p>
        <div className="meta-row">
          <span className="pill">Quality score {page.qualityScore}</span>
          <span className="pill">{page.reviewStatus}</span>
          <span className="pill">{page.jurisdiction ?? "Global"}</span>
          <span className="pill">{page.primaryKeyword ?? "Regulatory search"}</span>
        </div>
        {page.noindex ? <p className="notice">This page is visible for review but remains noindex until approved for publication.</p> : null}
      </section>

      <div className="content-grid">
        <article className="article">
          {page.body.sections.map((section) => (
            <section className="section" key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </article>

        <aside className="side-panel" aria-label="Page controls and sources">
          {page.body.nextAction ? (
            <a className="cta" href={page.body.nextAction.href}>
              {page.body.nextAction.label}
            </a>
          ) : null}

          {page.body.keyFacts?.length ? (
            <section>
              <h2>Key Facts</h2>
              <ul className="facts">
                {page.body.keyFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2>Internal Links</h2>
            <ul className="links">
              {page.internalLinks.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Sources</h2>
            <ul className="sources">
              {page.sources.map((source) => (
                <li key={source.sourceUrl}>
                  <a href={source.sourceUrl}>{source.authority}: {source.title}</a>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Canonical</h2>
            <p>{canonicalForSeoPage(page)}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
