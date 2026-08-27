import { requireAuthorityPage } from "@/lib/authority/auth";
import { getFounderOpsSnapshot } from "@/lib/founder-ops/data";
import { RefreshButton } from "./refresh-button";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function FounderOpsPage() {
  const user = await requireAuthorityPage();
  const snapshot = await getFounderOpsSnapshot();
  const liveDeals = snapshot.airtable.live;
  const liveTasks = snapshot.airtable.live;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Founder operations · private admin workspace</p>
          <h1>Decisions, pipeline and delivery.</h1>
          <p className={styles.subtitle}>A focused command view for {user.fullName ?? user.email}. Data refreshes every 60 seconds.</p>
        </div>
        <RefreshButton />
      </header>

      <section className={styles.statusGrid} aria-label="Connection status">
        <StatusCard label="Airtable" live={snapshot.airtable.live} detail={snapshot.airtable.live ? "Pipeline and tasks are live" : snapshot.airtable.error ?? "Add the four Airtable environment variables"} />
        <StatusCard label="GitHub" live={snapshot.github.live} detail={snapshot.github.live ? snapshot.github.repository : snapshot.github.error ?? "Connection unavailable"} />
        <StatusCard label="Last refresh" live detail={formatDate(snapshot.generatedAt)} />
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <PanelHeading title="Deal pipeline" count={snapshot.airtable.deals.length} live={liveDeals} />
          <div className={styles.rows}>
            {snapshot.airtable.deals.length === 0 ? <EmptyRow text="No Airtable opportunities found." /> : snapshot.airtable.deals.map((deal) => (
              <div className={styles.row} key={deal.id}>
                <div><strong>{deal.company}</strong><span>{deal.nextAction}</span></div>
                <div className={styles.rowMeta}><span>{deal.stage}</span><b>{deal.value}</b></div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <PanelHeading title="Execution queue" count={snapshot.airtable.tasks.length} live={liveTasks} />
          <div className={styles.rows}>
            {snapshot.airtable.tasks.length === 0 ? <EmptyRow text="No Airtable tasks found." /> : snapshot.airtable.tasks.map((task) => (
              <div className={styles.row} key={task.id}>
                <div><strong>{task.title}</strong><span>{task.owner}</span></div>
                <div className={styles.rowMeta}><span>{task.status}</span><b>{task.due}</b></div>
              </div>
            ))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.githubPanel}`}>
          <PanelHeading title="Product health" count={snapshot.github.openIssues} live={snapshot.github.live} countLabel="open issues" />
          <div className={styles.githubMetrics}>
            <Metric label="Repository" value={snapshot.github.repository} />
            <Metric label="Default branch" value={snapshot.github.defaultBranch} />
            <Metric label="Stars" value={String(snapshot.github.stars)} />
            <Metric label="Updated" value={snapshot.github.updatedAt ? formatDate(snapshot.github.updatedAt) : "Unavailable"} />
          </div>
          <a className={styles.repoLink} href={`https://github.com/${snapshot.github.repository}`} rel="noreferrer" target="_blank">Open repository ↗</a>
        </article>
      </section>

      <footer className={styles.footer}>Secrets remain server-side. Sample rows are visibly marked and disappear as soon as Airtable connects.</footer>
    </main>
  );
}

function StatusCard({ label, live, detail }: { label: string; live: boolean; detail: string }) {
  return <article className={styles.statusCard}><span className={live ? styles.liveDot : styles.setupDot} /><div><strong>{label}</strong><p>{detail}</p></div></article>;
}

function PanelHeading({ title, count, live, countLabel = "items" }: { title: string; count: number; live: boolean; countLabel?: string }) {
  return <header className={styles.panelHeading}><div><p>{live ? "Live source" : "Sample fallback"}</p><h2>{title}</h2></div><span className={live ? styles.liveBadge : styles.sampleBadge}>{live ? `${count} ${countLabel}` : "SAMPLE"}</span></header>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyRow({ text }: { text: string }) {
  return <div className={styles.empty}>{text}</div>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(value));
}
