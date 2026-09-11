"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualSignalForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/growth/signals/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text, url: url || undefined, companyName: companyName || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? `Request failed with HTTP ${response.status}.`);
      }
      const found = payload?.data?.eventsFound ?? 0;
      setMessage(found > 0 ? `Found and classified ${found} signal(s).` : "No keyword, competitor, influencer or brand mention was found in this text.");
      setState("idle");
      setText("");
      setUrl("");
      setCompanyName("");
      router.refresh();
    } catch (reason) {
      setState("failed");
      setMessage(reason instanceof Error ? reason.message : "Could not classify this text.");
    }
  }

  return (
    <form className="authority-stack" onSubmit={submit}>
      <label>
        Pasted text (LinkedIn post, job ad, forum thread...)
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
          minLength={4}
          rows={5}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        Source URL (optional)
        <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} style={{ width: "100%" }} />
      </label>
      <label>
        Company name (optional)
        <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} style={{ width: "100%" }} />
      </label>
      <button className="authority-primary" type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Classifying..." : "Classify text"}
      </button>
      {message ? <p role={state === "failed" ? "alert" : "status"}>{message}</p> : null}
    </form>
  );
}
