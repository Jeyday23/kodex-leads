import type { Metadata } from "next";
import { getChannelSettings, listChannelDrafts } from "@/lib/growth/channels/store";
import { listRedditOpportunities } from "@/lib/growth/channels/store";
import { getGrowthLlmStatus } from "@/lib/growth/llm";
import ChannelSettingsForm from "./ChannelSettingsForm";

export const metadata: Metadata = { title: "Growth Channels", robots: { index: false, follow: false } };

function channelLabel(channel: string): string {
  switch (channel) {
    case "article_brief":
      return "Articles";
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

export default async function ChannelsPage() {
  const [settings, draftsResult, redditResult] = await Promise.all([
    getChannelSettings(),
    listChannelDrafts({ limit: 200 }),
    listRedditOpportunities(200),
  ]);
  const llmStatus = getGrowthLlmStatus();

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth Channels</h1>
          <p>One agent card per channel. Drafts only - see the Brain for voice, keywords, and message pillars behind every draft.</p>
        </div>
        <div className="authority-topbar-actions">
          <a className="authority-link-button" href="/admin/authority/brain">
            Open the Brain
          </a>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Provider status">
        <div className="metric-tile">
          <span>Content generator</span>
          <strong>{llmStatus.configured ? `Live via ${llmStatus.preferred}` : "Not configured"}</strong>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Channel agent cards">
        {settings.map((setting) => {
          const draftsReady = draftsResult.configured
            ? draftsResult.items.filter((draft) => draft.channel === setting.channel && draft.status === "draft").length
            : null;
          const opportunities = setting.channel === "reddit" && redditResult.configured ? redditResult.items.length : null;

          return (
            <article className="authority-panel" key={setting.channel}>
              <div className="result-heading">
                <div>
                  <p className="eyebrow">{channelLabel(setting.channel)} agent</p>
                  <h2>{channelLabel(setting.channel)}</h2>
                </div>
                <span className="authority-pill">{llmStatus.configured ? "Provider live" : "Provider not configured"}</span>
              </div>

              <dl className="authority-detail-grid">
                <div>
                  <dt>Drafts ready</dt>
                  <dd>{draftsReady === null ? "Not configured" : draftsReady}</dd>
                </div>
                {setting.channel === "reddit" ? (
                  <div>
                    <dt>Open opportunities</dt>
                    <dd>{opportunities === null ? "Not configured" : opportunities}</dd>
                  </div>
                ) : null}
              </dl>

              <ChannelSettingsForm settings={{ channel: setting.channel, enabled: setting.enabled, weeklyTarget: setting.weeklyTarget }} />
            </article>
          );
        })}
      </section>
    </main>
  );
}
