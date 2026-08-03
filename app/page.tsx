import Link from "next/link";

const systemLinks = [
  { href: "/admin/authority/command", label: "Authority Command", description: "Run discovery, autopilot, monitoring and retry jobs." },
  { href: "/admin/seo", label: "SEO Queue", description: "Review indexable pages, quality gates and answer-engine tasks." },
  { href: "/api/seo/ai-sitemap", label: "AI Sitemap", description: "Canonical inventory for LLM retrieval and visibility checks." },
  { href: "/learn/eu-ai-act/high-risk-obligations", label: "Live Content", description: "Inspect a public source-backed page that can earn recognition." },
];

const pipeline = [
  "Discover search and LLM visibility gaps",
  "Research official sources",
  "Draft or revise source-backed pages",
  "Block unsupported claims",
  "Publish only approved/indexable assets",
  "Monitor mentions, citations and competitors",
];

export default function Home() {
  return (
    <main className="main">
      <section className="internal-hero">
        <p className="eyebrow">Private SEO Authority System</p>
        <h1>Kodex visibility autopilot.</h1>
        <p className="summary">
          This workspace is for building recognition, search visibility and LLM trust around Kodex. It finds opportunities, creates source-backed content, checks answer engines and tracks whether Kodex is being cited.
        </p>
        <div className="hero-actions">
          <Link className="cta" href="/admin/authority/command">Open command center</Link>
          <Link className="secondary-link" href="/api/seo/ai-sitemap">View AI sitemap</Link>
        </div>
      </section>

      <section className="internal-grid" aria-label="System entry points">
        {systemLinks.map((link) => (
          <Link className="internal-tile" href={link.href} key={link.href}>
            <span>{link.label}</span>
            <p>{link.description}</p>
          </Link>
        ))}
      </section>

      <section className="internal-panel" aria-label="Autonomous SEO pipeline">
        <div>
          <p className="eyebrow">Goal</p>
          <h2>Make Kodex easier for search engines and LLMs to understand, trust and recommend.</h2>
        </div>
        <ol className="internal-pipeline">
          {pipeline.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>
    </main>
  );
}
