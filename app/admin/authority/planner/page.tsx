import type { Metadata } from "next";
import { AuthorityActionButton } from "../AuthorityActions";
import { buildWeekPlan, WEEK_DAYS, type WeekDay } from "@/lib/growth/channels/planner";
import { listChannelDrafts, type ChannelDraftRecord } from "@/lib/growth/channels/store";
import PlannerDraftActions from "./PlannerDraftActions";

export const metadata: Metadata = { title: "Growth Planner", robots: { index: false, follow: false } };

function weekDayOf(iso: string): WeekDay | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return WEEK_DAYS[(date.getDay() + 6) % 7];
}

function channelLabel(channel: string): string {
  switch (channel) {
    case "article_brief":
      return "Article brief";
    case "linkedin":
      return "LinkedIn";
    case "x":
      return "X";
    case "reddit":
      return "Reddit";
    case "email":
      return "Email";
    default:
      return channel;
  }
}

function readiness(draft: ChannelDraftRecord) {
  const quality = draft.quality as { pass?: boolean } | undefined;
  return {
    voiceGatePassed: Boolean(quality?.pass),
    approved: draft.status === "approved" || draft.status === "published",
    destinationSet: draft.channel === "x" ? true : Boolean(draft.publishedUrl),
  };
}

export default async function PlannerPage() {
  const [plan, draftsResult] = await Promise.all([buildWeekPlan(), listChannelDrafts({ limit: 100 })]);
  const drafts = draftsResult.items;

  const draftsByDay = new Map<WeekDay, ChannelDraftRecord[]>();
  for (const day of WEEK_DAYS) draftsByDay.set(day, []);
  for (const draft of drafts) {
    const day = weekDayOf(draft.createdAt);
    if (day) draftsByDay.get(day)?.push(draft);
  }

  const pendingCount = drafts.filter((draft) => draft.status === "draft").length;

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth Planner</h1>
          <p>Mon-Sun content plan across article briefs, Reddit, X, and LinkedIn. Nothing here publishes itself.</p>
        </div>
        <div className="authority-topbar-actions">
          <AuthorityActionButton endpoint="/api/growth/channels/planner/run" label="Run today's planner" />
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Planner summary">
        <div className="metric-tile">
          <span>Awaiting review</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="metric-tile">
          <span>Total drafts</span>
          <strong>{draftsResult.configured ? drafts.length : "Not configured"}</strong>
        </div>
      </section>

      {!draftsResult.configured ? (
        <p className="authority-empty">Supabase is not configured, so drafts cannot be loaded or stored.</p>
      ) : null}

      <section className="authority-table" aria-label="Weekly plan">
        <div className="authority-table-head">
          {WEEK_DAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="authority-table-head" style={{ display: "grid", gridTemplateColumns: `repeat(${WEEK_DAYS.length}, 1fr)` }}>
          {plan.days.map((day) => (
            <div key={day.day} className="authority-panel">
              <p className="eyebrow">
                {day.auditFixTasks} audit fix{day.auditFixTasks === 1 ? "" : "es"}
              </p>
              {day.channelTasks.length === 0 ? (
                <p className="authority-empty">No channel tasks planned.</p>
              ) : (
                <ul>
                  {day.channelTasks.map((channel, index) => (
                    <li key={`${channel}-${index}`}>{channelLabel(channel)}</li>
                  ))}
                </ul>
              )}
              <div className="authority-stack">
                {(draftsByDay.get(day.day) ?? []).map((draft) => (
                  <article key={draft.id} className="authority-panel">
                    <strong>{draft.title ?? channelLabel(draft.channel)}</strong>
                    <p>{channelLabel(draft.channel)}</p>
                    <PlannerDraftActions
                      draft={{
                        id: draft.id,
                        channel: draft.channel,
                        status: draft.status,
                        title: draft.title,
                        qualityPass: (draft.quality as { pass?: boolean } | undefined)?.pass ?? null,
                        publishedUrl: draft.publishedUrl,
                      }}
                    />
                    <dl className="authority-detail-grid">
                      <div>
                        <dt>Voice gate</dt>
                        <dd>{readiness(draft).voiceGatePassed ? "Passed" : "Needs fixes"}</dd>
                      </div>
                      <div>
                        <dt>Approved</dt>
                        <dd>{readiness(draft).approved ? "Yes" : "Not yet"}</dd>
                      </div>
                      <div>
                        <dt>Destination</dt>
                        <dd>{readiness(draft).destinationSet ? "Set" : "Not set"}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
