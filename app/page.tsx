import Link from "next/link";

const modules = [
  {
    name: "Lead Signal Engine",
    copy: "Finds compliance buying signals, scores fit, enriches contacts and routes high-intent accounts into the pipeline.",
    href: "/admin/leads",
    stat: "LIVE",
  },
  {
    name: "SEO Autopilot",
    copy: "Builds source-backed compliance pages, applies quality gates and keeps weak or unsupported pages out of search.",
    href: "/admin/seo",
    stat: "GUARDED",
  },
  {
    name: "Authority Engine",
    copy: "Tracks prompts, citations, competitors and visibility across ChatGPT, Claude and Perplexity.",
    href: "/admin/authority/command",
    stat: "3 LLMs",
  },
  {
    name: "Google Discovery",
    copy: "Submits the sitemap, inspects eligible URLs and closes the feedback loop between publishing and indexing.",
    href: "/api/seo/google-discovery",
    stat: "GSC",
  },
];

const flow = ["Discover", "Score", "Create", "Verify", "Publish", "Index", "Monitor", "Convert"];

export default function HomePage() {
  return (
    <main className="kodex-landing">
      <style>{`
        .kodex-landing {
          --ink: #edf7f4;
          --muted: #8ba6a0;
          --panel: rgba(9, 19, 22, .72);
          --line: rgba(121, 255, 222, .16);
          --mint: #78ffd6;
          --cyan: #73d8ff;
          --rose: #d58ca8;
          position: relative;
          isolation: isolate;
          min-height: calc(100vh - 140px);
          padding: 64px 20px 96px;
          color: var(--ink);
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 16%, rgba(52, 255, 198, .14), transparent 28%),
            radial-gradient(circle at 83% 20%, rgba(87, 175, 255, .13), transparent 26%),
            linear-gradient(180deg, #071013 0%, #091215 46%, #071013 100%);
        }
        .kodex-landing::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: .22;
          background-image:
            linear-gradient(rgba(120,255,214,.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120,255,214,.08) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, black 0%, transparent 82%);
        }
        .landing-shell { max-width: 1180px; margin: 0 auto; }
        .status-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
        .chip {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid var(--line); background: rgba(7,17,19,.72);
          border-radius: 999px; padding: 7px 11px;
          color: #a9c5be; font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 18px var(--mint); }
        .hero-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 32px; align-items: end; }
        .eyebrow { color: var(--mint); font: 700 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .16em; text-transform: uppercase; }
        .hero-title { margin: 14px 0 18px; max-width: 850px; font-size: clamp(46px, 8vw, 92px); line-height: .92; letter-spacing: -.055em; }
        .hero-title span { background: linear-gradient(90deg, var(--mint), var(--cyan) 58%, #ccb6ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .hero-copy { max-width: 780px; color: var(--muted); font-size: clamp(17px, 2vw, 21px); line-height: 1.58; }
        .cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
        .primary-cta, .secondary-cta {
          display: inline-flex; align-items: center; justify-content: center; min-height: 48px;
          border-radius: 13px; padding: 0 18px; text-decoration: none; font-weight: 800;
        }
        .primary-cta { background: var(--mint); color: #06110e; box-shadow: 0 0 30px rgba(120,255,214,.2); }
        .secondary-cta { border: 1px solid var(--line); color: var(--ink); background: rgba(255,255,255,.025); }
        .terminal {
          border: 1px solid var(--line); border-radius: 18px; padding: 18px; background: rgba(3,10,12,.78);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.03), 0 24px 70px rgba(0,0,0,.28);
        }
        .terminal-head { display: flex; gap: 6px; margin-bottom: 16px; }
        .terminal-head i { width: 8px; height: 8px; border-radius: 50%; background: #3b5450; }
        .terminal code { display: block; white-space: pre-wrap; color: #8aa39d; font: 500 12px/1.8 ui-monospace, SFMono-Regular, Menlo, monospace; }
        .terminal .ok { color: var(--mint); }
        .flow-wrap { margin-top: 54px; padding: 18px; border: 1px solid var(--line); border-radius: 18px; background: rgba(7,17,20,.6); }
        .flow-label { margin-bottom: 13px; color: #78958e; font: 700 10px/1 ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
        .flow { display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; }
        .flow-step { position: relative; text-align: center; padding: 11px 6px; border: 1px solid rgba(120,255,214,.1); border-radius: 10px; background: rgba(120,255,214,.025); color: #b4cbc5; font: 700 11px/1.2 ui-monospace, monospace; }
        .modules { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 18px; }
        .module-card {
          position: relative; min-height: 210px; padding: 24px; overflow: hidden;
          border: 1px solid var(--line); border-radius: 20px; background: var(--panel);
          text-decoration: none; color: inherit; transition: transform .18s ease, border-color .18s ease, background .18s ease;
        }
        .module-card:hover { transform: translateY(-3px); border-color: rgba(120,255,214,.38); background: rgba(12,25,28,.88); }
        .module-card::after { content: "↗"; position: absolute; top: 20px; right: 22px; color: #56726b; font-size: 20px; }
        .module-stat { display: inline-block; margin-bottom: 38px; padding: 6px 9px; border-radius: 8px; background: rgba(120,255,214,.08); color: var(--mint); font: 800 10px/1 ui-monospace, monospace; letter-spacing: .1em; }
        .module-card h2 { margin: 0 0 10px; font-size: 24px; letter-spacing: -.025em; }
        .module-card p { margin: 0; max-width: 510px; color: var(--muted); line-height: 1.55; }
        .footer-note { margin-top: 22px; color: #658078; font: 600 11px/1.6 ui-monospace, monospace; }
        @media (max-width: 820px) {
          .kodex-landing { padding-top: 38px; }
          .hero-grid, .modules { grid-template-columns: 1fr; }
          .terminal { margin-top: 8px; }
          .flow { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="landing-shell">
        <div className="status-row">
          <span className="chip"><span className="dot" /> staging online</span>
          <span className="chip">open access</span>
          <span className="chip">EU-native growth stack</span>
        </div>

        <section className="hero-grid">
          <div>
            <p className="eyebrow">Kodex Growth Intelligence / v0.2</p>
            <h1 className="hero-title">Turn compliance signals into <span>search authority + revenue.</span></h1>
            <p className="hero-copy">
              One control layer for lead discovery, source-backed SEO, Google indexing feedback and LLM citation visibility—built around the compliance market Kodex already understands.
            </p>
            <div className="cta-row">
              <Link className="primary-cta" href="/admin/seo">Launch command center →</Link>
              <Link className="secondary-cta" href="/admin/leads">Open lead inbox</Link>
            </div>
          </div>

          <aside className="terminal" aria-label="System status">
            <div className="terminal-head"><i /><i /><i /></div>
            <code>
              <span className="ok">$ kodex --status</span>{"\n"}
              lead_engine ........ online{"\n"}
              seo_autopilot ...... guarded{"\n"}
              google_discovery ... connected{"\n"}
              llm_visibility ..... armed{"\n"}
              auth_gate .......... bypassed/staging{"\n"}
              <span className="ok">system_ready = true</span>
            </code>
          </aside>
        </section>

        <section className="flow-wrap" aria-label="Growth loop">
          <div className="flow-label">Autonomous growth loop</div>
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

        <p className="footer-note">STAGING MODE // public access enabled temporarily // secure auth should be restored before production.</p>
      </div>
    </main>
  );
}
