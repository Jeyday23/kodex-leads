import type { Metadata } from "next";
import { getProviderStatuses } from "@/lib/authority/providers";

export const metadata: Metadata = { title: "Authority Settings", robots: { index: false, follow: false } };

export default function AuthoritySettingsPage() {
  const providers = getProviderStatuses();
  return (
    <main className="main authority-page">
      <section className="hero">
        <p className="eyebrow">Authority Engine</p>
        <h1>Settings</h1>
        <p className="summary">Review provider, country, language and schedule configuration without exposing secrets.</p>
      </section>
      <section className="provider-grid">
        {providers.map((provider) => (
          <article className="metric-tile" key={provider.name}>
            <span>{provider.label}</span>
            <strong>{provider.configured ? "Ready" : "Needs keys"}</strong>
            <p>{provider.configured ? "Server-side environment configured" : `Missing ${provider.missing.join(", ")}`}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
