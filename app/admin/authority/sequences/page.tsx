import type { Metadata } from "next";
import { listSequences, listOutreachTasks } from "@/lib/growth/sequences/store";
import OutreachTaskQueue from "./OutreachTaskQueue";

export const metadata: Metadata = { title: "Growth Sequences", robots: { index: false, follow: false } };

export default async function GrowthSequencesPage() {
  const sequences = await listSequences();
  const tasks = await listOutreachTasks();
  const pending = tasks.filter((task) => task.status === "queued" || task.status === "approved");
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Outbound sequences</h1>
          <p>Email steps run a deliverability check first. LinkedIn steps are never executed by this system - a human always sends the message and marks it done.</p>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Sequence summary">
        <div className="metric-tile"><span>Sequences</span><strong>{sequences.length}</strong></div>
        <div className="metric-tile"><span>Tasks awaiting action</span><strong>{pending.length}</strong></div>
        <div className="metric-tile"><span>Total tasks</span><strong>{tasks.length}</strong></div>
      </section>

      <section className="authority-panel">
        <h2>Sequences</h2>
        {sequences.length === 0 ? (
          <p className="authority-empty">
            {supabaseConfigured
              ? "No sequences created yet. Create one through the API to start enrolling leads."
              : "Supabase is not configured, so no sequences can be created or listed yet."}
          </p>
        ) : (
          <dl className="authority-detail-grid">
            {sequences.map((sequence) => (
              <div key={sequence.id}>
                <dt>{sequence.name}</dt>
                <dd>{sequence.channel} - {sequence.steps.length} step(s) - cap {sequence.dailyCap}/day - {sequence.status}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 style={{ padding: "0 4px" }}>Approval queue</h2>
        <OutreachTaskQueue initialTasks={pending} />
      </section>
    </main>
  );
}
