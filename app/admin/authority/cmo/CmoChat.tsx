"use client";

import { useMemo, useState } from "react";

type ThreadLike = {
  id: string;
  title: string;
  updatedAt: string;
};

type MessageLike = {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: string;
};

type ActionLike = {
  id: string;
  actionType: string;
  title: string;
  status: "proposed" | "confirmed" | "executed" | "rejected" | "failed";
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message: string } | null;
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? "Request failed.");
  }
  return envelope.data;
}

export default function CmoChat({
  initialThreads,
  storeConfigured,
}: {
  initialThreads: ThreadLike[];
  storeConfigured: boolean;
}) {
  const [threads, setThreads] = useState<ThreadLike[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0]?.id ?? "");
  const [messages, setMessages] = useState<MessageLike[]>([]);
  const [actions, setActions] = useState<ActionLike[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  async function ensureThread(): Promise<string> {
    if (activeThreadId) return activeThreadId;
    const thread = await apiJson<ThreadLike>("/api/growth/cmo/threads", {
      method: "POST",
      body: JSON.stringify({ title: input.slice(0, 80) || "CMO thread" }),
    });
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    return thread.id;
  }

  async function loadThread(threadId: string) {
    setBusy(true);
    setError(null);
    try {
      setActiveThreadId(threadId);
      const data = await apiJson<{
        messages: { items: MessageLike[] };
        actions: { items: ActionLike[] };
      }>(`/api/growth/cmo/threads/${threadId}/messages`);
      setMessages(data.messages.items);
      setActions(data.actions.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load CMO thread.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    const content = input.trim();
    setInput("");
    setMessages((current) => [...current, { role: "user", content }]);
    try {
      const threadId = await ensureThread();
      const data = await apiJson<{
        userMessage: MessageLike | null;
        assistantMessage: MessageLike | null;
        content: string;
        actions: ActionLike[];
      }>(`/api/growth/cmo/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setMessages((current) => [
        ...current.filter((message) => !(message.role === "user" && message.content === content && !message.id)),
        ...(data.userMessage ? [data.userMessage] : [{ role: "user" as const, content }]),
        data.assistantMessage ?? { role: "assistant", content: data.content },
      ]);
      if (data.actions.length > 0) setActions((current) => [...data.actions, ...current]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CMO message failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(actionId: string, decision: "confirm" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const action = await apiJson<ActionLike>(`/api/growth/cmo/actions/${actionId}/${decision}`, { method: "POST" });
      setActions((current) => current.map((item) => (item.id === action.id ? action : item)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update action.");
    } finally {
      setBusy(false);
    }
  }

  if (!storeConfigured) {
    return (
      <section className="authority-panel">
        <h2>CMO storage not configured</h2>
        <p className="authority-empty">Set Supabase server credentials and apply migration 028 to store CMO threads and action approvals.</p>
      </section>
    );
  }

  return (
    <section className="dashboard-grid" style={{ alignItems: "start" }}>
      <aside className="authority-panel">
        <div className="result-heading">
          <h2>Threads</h2>
          <button type="button" className="authority-link-button" onClick={() => { setActiveThreadId(""); setMessages([]); setActions([]); }}>
            New
          </button>
        </div>
        <div className="authority-stack">
          {threads.length === 0 ? <p className="authority-empty">No CMO threads yet.</p> : null}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={thread.id === activeThreadId ? "authority-primary" : "authority-link-button"}
              onClick={() => void loadThread(thread.id)}
            >
              {thread.title}
            </button>
          ))}
        </div>
      </aside>

      <section className="authority-panel">
        <div className="result-heading">
          <div>
            <p className="eyebrow">{activeThread ? activeThread.title : "New thread"}</p>
            <h2>CMO chat</h2>
          </div>
          {busy ? <span className="authority-pill">Working</span> : null}
        </div>

        <div className="authority-stack" style={{ minHeight: 280 }}>
          {messages.length === 0 ? <p className="authority-empty">Ask for a readout or proposal to get started.</p> : null}
          {messages.map((message, index) => (
            <article className="metric-tile" key={message.id ?? `${message.role}-${index}`}>
              <span>{message.role}</span>
              <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
            </article>
          ))}
        </div>

        {actions.length > 0 ? (
          <div className="authority-panel" style={{ marginTop: 16 }}>
            <h2>Proposals</h2>
            <div className="authority-stack">
              {actions.map((action) => (
                <article key={action.id} className="metric-tile">
                  <span>{action.actionType}</span>
                  <strong>{action.title}</strong>
                  <p>Status: {action.status}</p>
                  {action.result && Object.keys(action.result).length > 0 ? (
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(action.result, null, 2)}</pre>
                  ) : null}
                  {action.status === "proposed" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="authority-primary" onClick={() => void decide(action.id, "confirm")}>
                        Confirm
                      </button>
                      <button type="button" className="authority-link-button" onClick={() => void decide(action.id, "reject")}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the CMO assistant..."
            rows={3}
            style={{ flex: 1, resize: "vertical" }}
          />
          <button type="button" className="authority-primary" disabled={busy || !input.trim()} onClick={() => void sendMessage()}>
            Send
          </button>
        </div>
        {error ? <p className="authority-warning">{error}</p> : null}
      </section>
    </section>
  );
}
