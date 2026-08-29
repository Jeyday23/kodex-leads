import Link from "next/link";

const modules = [
  {
    name: "Lead Signal Engine",
    copy: "Find compliance buying signals, score fit, enrich contacts and route high-intent accounts into the pipeline.",
    href: "/admin/leads",
    stat: "Signals",
  },
  {
    name: "SEO Autopilot",
    copy: "Build source-backed compliance pages, apply quality gates and keep weak or unsupported pages out of search.",
    href: "/admin/seo",
    stat: "Guarded",
  },
  {
    name: "Authority Engine",
    copy: "Track prompts, citations, competitors and visibility across connected answer engines.",
    href: "/admin/authority/command",
    stat: "Authority",
  },
  {
    name: "Google Discovery",
    copy: "Submit the sitemap, inspect eligible URLs and close the feedback loop between publishing and indexing.",
    href: "/api/seo/google-discovery",
    stat: "Indexing",
  },
];

const flow = ["Discover", "Score", "Create", "Verify", "Publish", "Index", "Monitor", "Convert"];

export default function HomePage() {
  return (
    <main className="kodex-landing">
      <style>{`
        .kodex-landing {
          --ink: #f5f5f7;
          --muted: #a1a1a6;
          --panel: rgba(255, 255, 255, .055);
          --line: rgba(255, 255, 255, .09);
          --mint: #77f2cf;
          --cyan: #80d7ff;
          position: relative;
          isolation: isolate;
          min-height: calc(100vh - 58px);
          padding: clamp(54px, 8vw, 104px) 20px 96px;
          color: var(--ink);
          overflow: hidden;
          background:
            radial-gradient(circle at 12% 4%, rgba(86, 255, 207, .09), transparent 28%),
            radial-gradient(circle at 86% 9%, rgba(108, 180, 255, .08), transparent 25%),
            #070709;
        }
        .kodex-landing::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 40%);
        }
        .landing-shell { max-width: 1220px; margin: 0 auto; }
        .status-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 38px; }
        .chip {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,.035);
          border-radius: 999px; padding: 7px 10px;
          color: #b7b7bc; font-size: 10px; line-height: 1.2;
          letter-spacing: .055em; text-transform: uppercase;
          backdrop-filter: blur(16px);
        }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 14px rgba(119,242,207,.72); }
        .hero-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: clamp(36px, 6vw, 80px); align-items: end; }
        .eyebrow { margin: 0; color: var(--mint); font-size: 11px; font-weight: 650; letter-spacing: .11em; text-transform: uppercase; }
        .hero-title { margin: 16px 0 22px; max-width: 920px; font-size: clamp(48px, 7.5vw, 94px); font-weight: 680; line-height: .94; letter-spacing: -.065em; }
        .hero-title span { display: block; color: #a6a6ab; font-weight: 560; }
        .hero-copy { max-width: 760px; margin: 0; color: var(--muted); font-size: clamp(17px, 1.65vw, 21px); line-height: 1.52; letter-spacing: -.018em; }
        .cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 30px; }
        .primary-cta, .secondary-cta {
          display: inline-flex; align-items: center; justify-content: center; min-height: 46px;
          border-radius: 999px; padding: 0 17px; text-decoration: none; font-size: 14px; font-weight: 620;
          transition: transform .16s ease, background .16s ease, border-color .16s ease;
        }
        .primary-cta { background: #f5f5f7; color: #111113; }
        .secondary-cta { border: 1px solid var(--line); color: #f1f1f3; background: rgba(255,255,255,.045); }
        .primary-cta:hover, .secondary-cta:hover { transform: translateY(-1px); }
        .secondary-cta:hover { background: rgba(255,255,255,.075); }
        .system-card {
          border: 1px solid var(--line); border-radius: 24px; padding: 22px;
          background: rgba(255,255,255,.045);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 24px 80px rgba(0,0,0,.25);
          backdrop-filter: blur(26px);
        }
        .system-card-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
        .system-card-head strong { font-size: 14px; font-weight: 620; letter-spacing: -.02em; }
        .system-card-head span { color: #7f7f85; font-size: 11px; }
        .contract-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,.065); }
        .contract-row:first-of-type { border-top: 0; }
        .contract-row span { color: #85858b; font-size: 12px; }
        .contract-row strong { color: #d8d8dc; font: 600 11px/1.2 var(--kx-font-mono); letter-spacing: .015em; }
        .contract-row strong.good { color: var(--mint); }
        .flow-wrap { margin-top: 68px; padding: 22px; border: 1px solid var(--line); border-radius: 24px; background: rgba(255,255,255,.035); backdrop-filter: blur(18px); }
        .flow-label { margin-bottom: 14px; color: #727278; font-size: 10px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
        .flow { display: grid; grid-template-columns: repeat(8, 1fr); gap: 7px; }
        .flow-step { position: relative; text-align: center; padding: 10px 6px; border-radius: 999px; background: rgba(255,255,255,.045); color: #b6b6bb; font-size: 10px; font-weight: 620; letter-spacing: .015em; }
        .modules { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
        .module-card {
          position: relative; min-height: 220px; padding: 26px; overflow: hidden;
          border: 1px solid var(--line); border-radius: 26px; background: var(--panel);
          text-decoration: none; color: inherit;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
          transition: transform .18s ease, border-color .18s ease, background .18s ease;
          backdrop-filter: blur(18px);
        }
        .module-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.17); background: rgba(255,255,255,.075); }
        .module-card::after { content: "↗"; position: absolute; top: 24px; right: 25px; color: #717177; font-size: 18px; }
        .module-stat { display: inline-block; margin-bottom: 48px; color: #77777d; font-size: 10px; font-weight: 650; letter-spacing: .065em; text-transform: uppercase; }
        .module-card h2 { margin: 0 0 10px; font-size: 25px; font-weight: 650; letter-spacing: -.04em; }
        .module-card p { margin: 0; max-width: 510px; color: #929298; font-size: 14px; line-height: 1.55; letter-spacing: -.01em; }
        .footer-note { margin-top: 24px; color: #66666c; font-size: 10px; line-height: 1.6; letter-spacing: .04em; text-transform: uppercase; }
        @media (max-width: 860px) {
          .kodex-landing { padding-top: 46px; }
          .hero-grid, .modules { grid-template-columns: 1fr; }
          .system-card { margin-top: 8px; }
          .flow { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 520px) {
          .hero-title { font-size: clamp(45px, 15vw, 64px); }
          .flow { grid-template-columns: repeat(2, 1fr); }
          .module-card { min-height: 190px; }
        }
      `}</style>

      <div className="landing-shell">
        <div className="status-row">
          <span className="chip"><span className="dot" /> staging online</span>
          <span className="chip">public workspace</span>
          <span className="chip">private autonomy controls</span>
        </div>

        <section className="hero-grid">
          <div>
            <p className="eyebrow">Kodex Growth Intelligence</p>
            <h1 className="hero-title">A control layer for compliant growth. <span>Signal in. Authority out.</span></h1>
            <p className="hero-copy">
              Discover buying intent, build source-backed search authority, monitor answer-engine visibility and keep autonomous execution behind an explicit control switch.
            </p>
            <div className="cta-row">
              <Link className="primary-cta" href="/admin/authority/command">Open command center</Link>
              <Link className="secondary-cta" href="/admin/leads">View lead signals</Link>
            </div>
          </div>

          <aside className="system-card" aria-label="Control contract">
            <div className="system-card-head"><strong>Control contract</strong><span>staging</span></div>
            <div className="contract-row"><span>Dashboard</span><strong className="good">PUBLIC</strong></div>
            <div className="contract-row"><span>Manual autonomy</span><strong>PRIVATE KEY</strong></div>
            <div className="contract-row"><span>Scheduled autonomy</span><strong>OPT-IN</strong></div>
            <div className="contract-row"><span>Risk gates</span><strong className="good">ENFORCED</strong></div>
            <div className="contract-row"><span>Publishing</span><strong>MODE-BOUND</strong></div>
          </aside>
        </section>

        <section className="flow-wrap" aria-label="Growth loop">
          <div className="flow-label">Growth loop</div>
          <div className="flow">
            {flow.map((item) => <div className="flow-step" key={item}>{item}</div>)}
          </div>
        </section>

        <section className="modules" aria-label="Kodex modules">
          {modules.map((module) => (
            <Link className="module-card" href={module.href} key={module.name}>
              <span className="module-stat">{module.stat}</span>
              <h2>{module.name}</h2>
              <p>{module.copy}</p>
            </Link>
          ))}
        </section>

        <p className="footer-note">Staging environment · public viewing enabled temporarily · production authentication remains a release gate.</p>
      </div>
    </main>
  );
}
