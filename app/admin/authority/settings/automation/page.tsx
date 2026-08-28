import type { Metadata } from "next";
import { AuthorityActionButton } from "../../AuthorityActions";
import { getAutopilotStatus } from "@/lib/authority/autonomous-ranking";

export const metadata: Metadata = { title: "Authority Automation Settings", robots: { index: false, follow: false } };

export default async function AuthorityAutomationSettingsPage() {
  const status = await getAutopilotStatus();
  return (
    <main className="authority-module">
      <header className="authority-topbar"><div><p>Settings</p><h1>Automation</h1></div></header>
      <section className="authority-panel">
        <h2>Current policy</h2>
        <p>Mode: <strong>{status.mode}</strong></p>
        <p>Default production mode is <strong>draft_only</strong> until an admin changes it.</p>
        <div className="authority-action-row">
          <AuthorityActionButton endpoint="/api/authority/autopilot/status" method="PATCH" body={{ mode: "off" }} label="Set off" />
          <AuthorityActionButton endpoint="/api/authority/autopilot/status" method="PATCH" body={{ mode: "draft_only" }} label="Set draft only" />
          <AuthorityActionButton endpoint="/api/authority/autopilot/status" method="PATCH" body={{ mode: "guarded" }} label="Set guarded" />
          <AuthorityActionButton endpoint="/api/authority/autopilot/status" method="PATCH" body={{ mode: "controlled" }} label="Set controlled" />
        </div>
      </section>
    </main>
  );
}
