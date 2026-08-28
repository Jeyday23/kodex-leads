import Link from "next/link";

const walkthrough = [
  {
    n: "01",
    title: "Check system health",
    text: "Open Authority Command first. Confirm the provider status, database availability, discovery history and monitoring history. Degraded does not automatically mean broken; it can mean a cycle has never completed.",
    href: "/admin/authority/command",
    label: "Open Command",
  },
  {
    n: "02",
    title: "Keep autonomy in Draft only",
    text: "Enter your private control key in Authority Settings and keep Draft only selected for early testing. This allows opportunity discovery and drafting while automatic publication remains disabled.",
    href: "/admin/authority/settings",
    label: "Open autonomy settings",
  },
  {
    n: "03",
    title: "Run one controlled cycle",
    text: "Press Run now once. Then inspect Opportunities and Content. Verify that the topics, source signals, claims and generated drafts are relevant before moving to any more permissive mode.",
    href: "/admin/authority/opportunities",
    label: "Inspect opportunities",
  },
  {
    n: "04",
    title: "Review the lead engine",
    text: "Open Leads to check prospect signals and confidence. The purpose is prioritization: trace a lead back to its signal before acting on it, and do not treat generated fit reasons as verified company facts.",
    href: "/admin/leads",
    label: "Open Leads",
  },
  {
    n: "05",
    title: "Inspect SEO output",
    text: "Use the SEO workspace to review drafts, quality gates and indexability. A content asset should have verified sources, useful intent coverage and no conflicting high-risk claim before publication is considered.",
    href: "/admin/seo",
    label: "Open SEO",
  },
  {
    n: "06",
    title: "Run monitoring",
    text: "Monitoring creates the visibility feedback loop. With at least one LLM provider configured, run the monitoring workflow and then return to Command to confirm a monitoring record and updated sync status.",
    href: "/admin/authority/observatory",
    label: "Open Observatory",
  },
  {
    n: "07",
    title: "Understand the master stop",
    text: "Off is the master stop. Scheduled workers now require both AUTOPILOT_SCHEDULE_ENABLED=true and a stored mode that is not Off. Keep the Render flag false until manual test runs consistently produce acceptable output.",
    href: "/admin/authority/settings",
    label: "Review policy",
  },
  {
    n: "08",
    title: "Only then increase autonomy",
    text: "Move from Draft only to Guarded when you are satisfied with source quality and drafts. Controlled should be the final step because it permits the complete pipeline within configured ceilings and risk gates.",
    href: "/admin/authority/settings",
    label: "Choose a mode",
  },
];

export const metadata = {
  title: "Walkthrough",
  description: "Step-by-step guide to operating Kodex Growth Intelligence safely and effectively.",
};

export default function TutorialPage() {
  return (
    <main className="kx-tutorial-page">
      <section className="kx-tutorial-hero">
        <span className="eyebrow">Operator guide / staging</span>
        <h1>Learn the system without guessing.</h1>
        <p>
          This walkthrough is the recommended first-run sequence for Kodex Growth Intelligence. It is designed to show what the engine can do while keeping publication and scheduled autonomy under your control.
        </p>
      </section>

      <section className="kx-tutorial-grid" aria-label="Kodex walkthrough steps">
        {walkthrough.map((item) => (
          <article className="kx-tutorial-card" key={item.n}>
            <span>{item.n}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
            <Link href={item.href}>{item.label} →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
