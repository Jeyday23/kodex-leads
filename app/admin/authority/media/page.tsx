import MediaActions from "./MediaActions";
import { listMediaJobs } from "@/lib/media/store";
import { mediaProviderReadiness } from "@/lib/media/provider";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const [jobs, readiness] = await Promise.all([listMediaJobs(), Promise.resolve(mediaProviderReadiness())]);
  return (
    <main className="authority-page">
      <header className="authority-page-header">
        <div><span className="authority-kicker">Authority production</span><h1>Media studio</h1><p>Turn approved research and content into audited image/video drafts. Generation never publishes automatically.</p></div>
      </header>
      <section className="authority-card">
        <div className="authority-card-head"><div><span className="authority-kicker">Provider readiness</span><h2>{readiness.provider}</h2></div><span className="authority-pill">{readiness.ready ? "ready" : "needs setup"}</span></div>
        <p>{readiness.detail}</p>
        <small>Every asset keeps its source brief, prompt, provider/model, request id, result, reviewer and decision.</small>
      </section>
      <MediaActions initialJobs={jobs} />
    </main>
  );
}
