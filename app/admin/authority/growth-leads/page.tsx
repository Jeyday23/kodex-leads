import type { Metadata } from "next";
import { listLeadScores } from "@/lib/growth/leads/store";
import LeadScoreForm from "./LeadScoreForm";

export const metadata: Metadata = { title: "Growth Leads", robots: { index: false, follow: false } };

export default async function GrowthLeadsPage() {
  const scores = await listLeadScores(30);

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Explainable lead scoring</h1>
          <p>Every confidence score shows the factors behind it and what would move it, never a bare number.</p>
        </div>
      </header>

      <section className="authority-panel">
        <h2>Score a lead</h2>
        <LeadScoreForm />
      </section>

      <section className="authority-panel">
        <h2>Recently scored</h2>
        {scores.length === 0 ? (
          <p className="authority-empty">
            {process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
              ? "No leads have been scored yet."
              : "Supabase is not configured, so scored leads are not persisted between sessions."}
          </p>
        ) : (
          <ul className="authority-stack">
            {scores.map((score) => (
              <li key={score.id}>
                <strong>{score.leadRef}</strong> - {score.confidence.toFixed(1)} / 100
                {score.rationale ? <p>{score.rationale}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
