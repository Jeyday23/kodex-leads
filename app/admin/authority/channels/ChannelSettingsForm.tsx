"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Declared locally rather than imported from lib/growth/channels/store: this
// is a client component, and any import path (type-only included) that
// eventually reaches lib/seo/db.ts is forbidden here - see the note in
// ../planner/PlannerDraftActions.tsx for why.
interface ChannelSettingsSummary {
  channel: string;
  enabled: boolean;
  weeklyTarget: number;
}

export default function ChannelSettingsForm({ settings }: { settings: ChannelSettingsSummary }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { enabled?: boolean; weeklyTarget?: number }) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/growth/channels/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ channel: settings.channel, ...next }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `Could not save settings (HTTP ${response.status}).`);
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authority-stack">
      <label>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(event) => {
            setEnabled(event.target.checked);
            void save({ enabled: event.target.checked });
          }}
        />{" "}
        Enabled
      </label>
      <label>
        Weekly target{" "}
        <input
          type="number"
          min={0}
          max={500}
          value={weeklyTarget}
          disabled={busy}
          onChange={(event) => setWeeklyTarget(Number(event.target.value))}
          onBlur={() => void save({ weeklyTarget })}
        />
      </label>
      {error ? <small role="alert">{error}</small> : null}
    </div>
  );
}
