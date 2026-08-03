import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorityDashboardData } from "@/lib/authority/monitoring";

export const metadata: Metadata = { title: "Observatory Run", robots: { index: false, follow: false } };

export default async function ObservatoryRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAuthorityDashboardData();
  const run = data.runs.find((item) => item.id === id);
  if (!run) notFound();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Monitoring run</p><h1>{run.prompt.label}</h1></div><a className="authority-primary" href="/admin/authority/observatory/runs">Back to runs</a></header>
      <section className="authority-panel"><h2>Prompt snapshot</h2><p>{run.prompt.prompt}</p><p>Status: {run.status}</p></section>
      {run.responses.map((response) => (
        <section className="authority-panel" key={response.provider}>
          <h2>{response.provider} / {response.model}</h2>
          <p>Latency: {response.latencyMs}ms. Confidence: {response.extractionConfidence}.</p>
          <pre>{response.answer}</pre>
        </section>
      ))}
    </main>
  );
}
