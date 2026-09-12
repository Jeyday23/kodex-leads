"use client";

import { useMemo, useState } from "react";
import type {
  BrainContextBundle,
  ChannelVoice,
  Competitor,
  GrowthChannel,
  Influencer,
  Keyword,
  MessagePillar,
  Objection,
  Persona,
} from "@/lib/growth/context";
import type { ProposedBrainBundle } from "@/lib/growth/brain/seed-from-website";

type CategoryKey =
  | "profile"
  | "personas"
  | "keywords"
  | "pillars"
  | "objections"
  | "competitors"
  | "influencers"
  | "voices";

interface CategoryMeta {
  key: CategoryKey;
  label: string;
  endpoint: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "profile", label: "Profile", endpoint: "/api/growth/brain/profile" },
  { key: "personas", label: "Personas", endpoint: "/api/growth/brain/personas" },
  { key: "keywords", label: "Keywords", endpoint: "/api/growth/brain/keywords" },
  { key: "pillars", label: "Message pillars", endpoint: "/api/growth/brain/pillars" },
  { key: "objections", label: "Objections", endpoint: "/api/growth/brain/objections" },
  { key: "competitors", label: "Competitors", endpoint: "/api/growth/brain/competitors" },
  { key: "influencers", label: "Influencers", endpoint: "/api/growth/brain/influencers" },
  { key: "voices", label: "Channel voices", endpoint: "/api/growth/brain/voices" },
];

const CHANNELS: GrowthChannel[] = ["linkedin", "x", "reddit", "articles", "email"];

interface VoiceRow extends ChannelVoice {
  id: string;
  channel: GrowthChannel;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      ...options,
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) return { ok: false, error: "Sign in as a Kodex administrator to edit the Brain." };
    if (response.status === 403) return { ok: false, error: "This account is not authorized to edit the Brain." };
    if (!response.ok) {
      const message = payload?.error?.message ?? `Request failed with HTTP ${response.status}.`;
      return { ok: false, error: message };
    }
    return { ok: true, data: payload?.data as T };
  } catch {
    return { ok: false, error: "Could not reach the service. Check deployment health and try again." };
  }
}

function itemLabel(category: CategoryKey, item: unknown): string {
  switch (category) {
    case "personas":
      return (item as Persona).name;
    case "keywords":
      return (item as Keyword).term;
    case "pillars":
      return (item as MessagePillar).title;
    case "objections":
      return (item as Objection).objection.slice(0, 28);
    case "competitors":
      return (item as Competitor).name;
    case "influencers":
      return (item as Influencer).name;
    case "voices":
      return (item as VoiceRow).channel;
    default:
      return "";
  }
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function ArrayField({ label, values, onChange }: { label: string; values: string[]; onChange: (next: string[]) => void }) {
  return (
    <label className="brain-field">
      <span>{label} (one per line)</span>
      <textarea
        rows={Math.min(6, Math.max(2, values.length + 1))}
        value={values.join("\n")}
        onChange={(event) => onChange(event.target.value.split("\n").map((line) => line.trim()).filter(Boolean))}
      />
    </label>
  );
}

function TextField({ label, value, onChange, textarea }: { label: string; value: string; onChange: (next: string) => void; textarea?: boolean }) {
  return (
    <label className="brain-field">
      <span>{label}</span>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export default function BrainGraph({
  initialBundle,
  storeConfigured,
}: {
  initialBundle: BrainContextBundle;
  storeConfigured: boolean;
}) {
  const [bundle, setBundle] = useState(initialBundle);
  const [voiceRows, setVoiceRows] = useState<VoiceRow[]>(() =>
    CHANNELS.map((channel) => ({ id: `seed-${channel}`, channel, ...initialBundle.channelVoices[channel] })),
  );
  const [selected, setSelected] = useState<CategoryKey | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const [seedUrl, setSeedUrl] = useState(bundle.profile.website !== "Not set" ? bundle.profile.website : "");
  const [proposal, setProposal] = useState<{ status: string; proposal?: ProposedBrainBundle; pagesFetched?: string[]; detail?: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const nodePositions = useMemo(() => {
    const cx = 420;
    const cy = 320;
    const radius = 220;
    return CATEGORIES.map((category, index) => {
      const angle = (2 * Math.PI * index) / CATEGORIES.length - Math.PI / 2;
      return { category, ...polar(cx, cy, radius, angle) };
    });
  }, []);

  async function refreshBundle() {
    const result = await apiFetch<BrainContextBundle>("/api/growth/brain/bundle");
    if (result.ok) setBundle(result.data);
    const voices = await apiFetch<VoiceRow[]>("/api/growth/brain/voices");
    if (voices.ok) setVoiceRows(voices.data);
  }

  function itemsFor(category: CategoryKey): Array<{ id: string }> {
    switch (category) {
      case "personas":
        return bundle.personas as unknown as Array<{ id: string }>;
      case "keywords":
        return bundle.keywords as unknown as Array<{ id: string }>;
      case "pillars":
        return bundle.messagePillars as unknown as Array<{ id: string }>;
      case "objections":
        return bundle.objections as unknown as Array<{ id: string }>;
      case "competitors":
        return bundle.competitors as unknown as Array<{ id: string }>;
      case "influencers":
        return bundle.influencers as unknown as Array<{ id: string }>;
      case "voices":
        return voiceRows;
      default:
        return [];
    }
  }

  async function withBusy(action: () => Promise<{ ok: boolean; error?: string }>) {
    if (!storeConfigured) {
      setMessage({ kind: "error", text: "Supabase is not configured; edits cannot be saved." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error ?? "The request failed." });
      return;
    }
    setMessage({ kind: "success", text: "Saved." });
    await refreshBundle();
  }

  async function runSeed() {
    setSeeding(true);
    setMessage(null);
    setProposal(null);
    const result = await apiFetch<{ status: string; proposal?: ProposedBrainBundle; pagesFetched?: string[]; detail?: string }>(
      "/api/growth/brain/seed",
      { method: "POST", body: JSON.stringify({ url: seedUrl }) },
    );
    setSeeding(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setProposal(result.data);
  }

  async function applySeed() {
    if (!proposal?.proposal) return;
    setBusy(true);
    const result = await apiFetch("/api/growth/brain/seed/apply", {
      method: "POST",
      body: JSON.stringify({ proposal: proposal.proposal }),
    });
    setBusy(false);
    if (!result.ok) {
      setMessage({ kind: "error", text: result.error });
      return;
    }
    setMessage({ kind: "success", text: "Proposal applied." });
    setProposal(null);
    await refreshBundle();
  }

  return (
    <div className="authority-stack">
      <section className="authority-panel">
        <h2>Seed from website</h2>
        <p>Fetches the homepage plus up to six internal pages and proposes Brain content. Nothing is written until you apply.</p>
        <div className="brain-seed-row">
          <input value={seedUrl} onChange={(event) => setSeedUrl(event.target.value)} placeholder="https://example.com" />
          <button className="authority-primary" type="button" disabled={seeding || !storeConfigured} onClick={runSeed}>
            {seeding ? "Reading website…" : "Propose"}
          </button>
        </div>
        {proposal ? (
          <div className="brain-proposal">
            {proposal.status === "skipped" ? <p className="authority-empty">Skipped: {proposal.detail}</p> : null}
            {proposal.status === "proposed" && proposal.proposal ? (
              <>
                <p>Pages read: {proposal.pagesFetched?.join(", ")}</p>
                <h3>Proposed changes (diff against current Brain)</h3>
                {proposal.proposal.profile ? (
                  <div>
                    <strong>Profile</strong>
                    <ul>
                      {Object.entries(proposal.proposal.profile).map(([field, value]) => (
                        <li key={field}>
                          {field}: <s>{String((bundle.profile as unknown as Record<string, unknown>)[field] ?? "")}</s> {"->"} {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {(["personas", "keywords", "messagePillars", "objections", "competitors"] as const).map((section) =>
                  proposal.proposal![section].length > 0 ? (
                    <div key={section}>
                      <strong>New {section}</strong>
                      <ul>
                        {proposal.proposal![section].map((entry, index) => (
                          <li key={index}>{JSON.stringify(entry)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                <button className="authority-primary" type="button" disabled={busy} onClick={applySeed}>
                  Apply proposal
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {message ? (
        <p className="authority-empty" role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
        </p>
      ) : null}

      <div className="brain-graph-layout">
        <svg viewBox="0 0 840 640" className="brain-graph-svg" role="img" aria-label="Brain knowledge graph">
          {nodePositions.map(({ category, x, y }) => (
            <line key={`edge-${category.key}`} x1={420} y1={320} x2={x} y2={y} className="brain-edge" />
          ))}

          {selected
            ? itemsFor(selected).map((item, index, all) => {
                const origin = nodePositions.find((node) => node.category.key === selected)!;
                const angle = (2 * Math.PI * index) / Math.max(all.length, 1) - Math.PI / 2;
                const { x, y } = polar(origin.x, origin.y, 70, angle);
                return <line key={`item-edge-${item.id}`} x1={origin.x} y1={origin.y} x2={x} y2={y} className="brain-edge brain-edge-item" />;
              })
            : null}

          <g>
            <circle cx={420} cy={320} r={46} className="brain-node brain-node-center" />
            <text x={420} y={324} textAnchor="middle" className="brain-node-label brain-node-label-center">
              {bundle.profile.name}
            </text>
          </g>

          {nodePositions.map(({ category, x, y }) => (
            <g key={category.key} onClick={() => { setSelected(category.key); setSelectedItemId(null); }} className="brain-node-group">
              <circle cx={x} cy={y} r={34} className={`brain-node ${selected === category.key ? "brain-node-selected" : ""}`} />
              <text x={x} y={y + 4} textAnchor="middle" className="brain-node-label">
                {category.label}
              </text>
            </g>
          ))}

          {selected
            ? itemsFor(selected).map((item, index, all) => {
                const origin = nodePositions.find((node) => node.category.key === selected)!;
                const angle = (2 * Math.PI * index) / Math.max(all.length, 1) - Math.PI / 2;
                const { x, y } = polar(origin.x, origin.y, 70, angle);
                return (
                  <g
                    key={item.id}
                    className="brain-node-group"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedItemId(item.id);
                    }}
                  >
                    <circle cx={x} cy={y} r={16} className={`brain-node brain-node-item ${selectedItemId === item.id ? "brain-node-selected" : ""}`} />
                    <text x={x} y={y + 26} textAnchor="middle" className="brain-node-label brain-node-label-item">
                      {itemLabel(selected, item).slice(0, 16)}
                    </text>
                  </g>
                );
              })
            : null}
        </svg>

        <aside className="authority-panel brain-detail-panel">
          {!selected ? <p>Select a category node to view and edit its content.</p> : null}

          {selected === "profile" ? (
            <ProfileForm bundle={bundle} disabled={busy || !storeConfigured} onSave={(input) => withBusy(() => apiFetch("/api/growth/brain/profile", { method: "PUT", body: JSON.stringify(input) }))} />
          ) : null}

          {selected === "personas" ? (
            <ListEditor
              title="Personas"
              items={bundle.personas}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/personas"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
                  <TextField label="Title" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
                  <ArrayField label="Goals" values={item.goals} onChange={(v) => onChange({ ...item, goals: v })} />
                  <ArrayField label="Pains" values={item.pains} onChange={(v) => onChange({ ...item, pains: v })} />
                  <ArrayField label="Triggers" values={item.triggers} onChange={(v) => onChange({ ...item, triggers: v })} />
                </>
              )}
              blank={{ name: "", title: "", goals: [], pains: [], triggers: [] }}
            />
          ) : null}

          {selected === "keywords" ? (
            <ListEditor
              title="Keywords"
              items={bundle.keywords}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/keywords"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Term" value={item.term} onChange={(v) => onChange({ ...item, term: v })} />
                  <label className="brain-field">
                    <span>Type</span>
                    <select value={item.type} onChange={(event) => onChange({ ...item, type: event.target.value as Keyword["type"] })}>
                      <option value="product">product</option>
                      <option value="problem">problem</option>
                      <option value="competitor">competitor</option>
                    </select>
                  </label>
                  <TextField label="Language" value={item.language} onChange={(v) => onChange({ ...item, language: v })} />
                </>
              )}
              blank={{ term: "", type: "product", language: "en" }}
            />
          ) : null}

          {selected === "pillars" ? (
            <ListEditor
              title="Message pillars"
              items={bundle.messagePillars}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/pillars"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Title" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
                  <TextField label="Claim" value={item.claim} onChange={(v) => onChange({ ...item, claim: v })} textarea />
                  <TextField label="Proof" value={item.proof} onChange={(v) => onChange({ ...item, proof: v })} textarea />
                </>
              )}
              blank={{ title: "", claim: "", proof: "" }}
            />
          ) : null}

          {selected === "objections" ? (
            <ListEditor
              title="Objections"
              items={bundle.objections}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/objections"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Objection" value={item.objection} onChange={(v) => onChange({ ...item, objection: v })} textarea />
                  <TextField label="Response" value={item.response} onChange={(v) => onChange({ ...item, response: v })} textarea />
                </>
              )}
              blank={{ objection: "", response: "" }}
            />
          ) : null}

          {selected === "competitors" ? (
            <ListEditor
              title="Competitors"
              items={bundle.competitors}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/competitors"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
                  <TextField label="Domain" value={item.domain} onChange={(v) => onChange({ ...item, domain: v })} />
                  <TextField label="Summary" value={item.summary} onChange={(v) => onChange({ ...item, summary: v })} textarea />
                </>
              )}
              blank={{ name: "", domain: "", summary: "" }}
            />
          ) : null}

          {selected === "influencers" ? (
            <ListEditor
              title="Influencers"
              items={bundle.influencers}
              selectedId={selectedItemId}
              disabled={busy || !storeConfigured}
              endpoint="/api/growth/brain/influencers"
              onDone={withBusy}
              renderFields={(item, onChange) => (
                <>
                  <TextField label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
                  <TextField label="Handle" value={item.handle} onChange={(v) => onChange({ ...item, handle: v })} />
                  <TextField label="Platform" value={item.platform} onChange={(v) => onChange({ ...item, platform: v })} />
                  <TextField label="Why" value={item.why} onChange={(v) => onChange({ ...item, why: v })} textarea />
                </>
              )}
              blank={{ name: "", handle: "Not set", platform: "Not set", why: "" }}
            />
          ) : null}

          {selected === "voices" ? (
            <VoiceEditor rows={voiceRows} selectedId={selectedItemId} disabled={busy || !storeConfigured} onDone={withBusy} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProfileForm({
  bundle,
  disabled,
  onSave,
}: {
  bundle: BrainContextBundle;
  disabled: boolean;
  onSave: (input: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState(bundle.profile);
  return (
    <form
      className="brain-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: draft.name,
          oneLineDescription: draft.oneLineDescription,
          website: draft.website,
          vertical: draft.vertical,
          headquarters: draft.headquarters,
          marketSummary: draft.marketSummary,
          salesLanguageRules: draft.salesLanguageRules,
        });
      }}
    >
      <h2>Company profile</h2>
      <TextField label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
      <TextField label="One line description" value={draft.oneLineDescription} onChange={(v) => setDraft({ ...draft, oneLineDescription: v })} textarea />
      <TextField label="Website" value={draft.website} onChange={(v) => setDraft({ ...draft, website: v })} />
      <TextField label="Vertical" value={draft.vertical} onChange={(v) => setDraft({ ...draft, vertical: v })} />
      <TextField label="Headquarters" value={draft.headquarters} onChange={(v) => setDraft({ ...draft, headquarters: v })} />
      <TextField label="Market summary" value={draft.marketSummary} onChange={(v) => setDraft({ ...draft, marketSummary: v })} textarea />
      <ArrayField label="Sales language rules" values={draft.salesLanguageRules} onChange={(v) => setDraft({ ...draft, salesLanguageRules: v })} />
      <button className="authority-primary" type="submit" disabled={disabled}>
        Save profile
      </button>
    </form>
  );
}

function ListEditor<T extends { id: string }>({
  title,
  items,
  selectedId,
  disabled,
  endpoint,
  renderFields,
  onDone,
  blank,
}: {
  title: string;
  items: T[];
  selectedId: string | null;
  disabled: boolean;
  endpoint: string;
  renderFields: (item: T, onChange: (next: T) => void) => React.ReactNode;
  onDone: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<void>;
  blank: Omit<T, "id">;
}) {
  const [drafts, setDrafts] = useState<Record<string, T>>(() => Object.fromEntries(items.map((item) => [item.id, item])));
  const [newItem, setNewItem] = useState<T>({ ...(blank as T), id: "__new__" });

  const current = selectedId ? drafts[selectedId] ?? items.find((item) => item.id === selectedId) : null;

  function updateDraft(item: T) {
    setDrafts((prev) => ({ ...prev, [item.id]: item }));
  }

  return (
    <div className="brain-form">
      <h2>{title}</h2>

      {current ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const { id, ...body } = current;
            void onDone(() => apiFetch(`${endpoint}/${id}`, { method: "PATCH", body: JSON.stringify(body) }));
          }}
        >
          <h3>Edit selected</h3>
          {renderFields(current, updateDraft)}
          <div className="brain-form-actions">
            <button className="authority-primary" type="submit" disabled={disabled}>
              Save
            </button>
            <button
              className="authority-link-button"
              type="button"
              disabled={disabled}
              onClick={() => void onDone(() => apiFetch(`${endpoint}/${current.id}`, { method: "DELETE" }))}
            >
              Delete
            </button>
          </div>
        </form>
      ) : (
        <p>Click an item node to edit it, or add a new one below.</p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const body: Record<string, unknown> = { ...newItem };
          delete body.id;
          void onDone(() => apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) }));
          setNewItem({ ...(blank as T), id: "__new__" });
        }}
      >
        <h3>Add new</h3>
        {renderFields(newItem, setNewItem)}
        <button className="authority-primary" type="submit" disabled={disabled}>
          Create
        </button>
      </form>
    </div>
  );
}

function VoiceEditor({
  rows,
  selectedId,
  disabled,
  onDone,
}: {
  rows: VoiceRow[];
  selectedId: string | null;
  disabled: boolean;
  onDone: (action: () => Promise<{ ok: boolean; error?: string }>) => Promise<void>;
}) {
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const [draft, setDraft] = useState<VoiceRow>(selected);

  if (draft.channel !== selected.channel && selectedId) {
    setDraft(selected);
  }

  return (
    <form
      className="brain-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onDone(() =>
          apiFetch("/api/growth/brain/voices", {
            method: "POST",
            body: JSON.stringify({
              channel: draft.channel,
              tone: draft.tone,
              rules: draft.rules,
              bannedTerms: draft.bannedTerms,
              maxLength: draft.maxLength,
              example: draft.example,
            }),
          }),
        );
      }}
    >
      <h2>Voice: {draft.channel}</h2>
      <TextField label="Tone" value={draft.tone} onChange={(v) => setDraft({ ...draft, tone: v })} />
      <ArrayField label="Rules" values={draft.rules} onChange={(v) => setDraft({ ...draft, rules: v })} />
      <ArrayField label="Banned terms" values={draft.bannedTerms} onChange={(v) => setDraft({ ...draft, bannedTerms: v })} />
      <label className="brain-field">
        <span>Max length</span>
        <input type="number" value={draft.maxLength} onChange={(event) => setDraft({ ...draft, maxLength: Number(event.target.value) })} />
      </label>
      <TextField label="Example" value={draft.example} onChange={(v) => setDraft({ ...draft, example: v })} textarea />
      <button className="authority-primary" type="submit" disabled={disabled}>
        Save voice
      </button>
    </form>
  );
}
