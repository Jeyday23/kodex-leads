import type { ReactNode } from "react";
import { requireAuthorityPage } from "@/lib/authority/auth";
import { getAuthoritySystemStatus } from "@/lib/authority/status";

export const dynamic = "force-dynamic";

const nav = [
  ["Founder Ops", "/admin/founder-ops", "◆"],
  ["Command", "/admin/authority/command", "⌁"],
  ["Opportunities", "/admin/authority/opportunities", "◎"],
  ["Editorial", "/admin/authority/editorial", "▦"],
  ["Content", "/admin/authority/content", "▤"],
  ["Knowledge", "/admin/authority/knowledge", "◇"],
  ["Observatory", "/admin/authority/observatory", "◉"],
  ["Publications", "/admin/authority/publications", "↗"],
  ["Revisions", "/admin/authority/revisions", "↻"],
  ["Technical SEO", "/admin/authority/technical-seo", "⌘"],
  ["Outreach", "/admin/authority/outreach", "✉"],
];

export default async function AuthorityLayout({ children }: { children: ReactNode }) {
  const user = await requireAuthorityPage();
  const status = await getAuthoritySystemStatus();

  return (
    <section className="authority-shell">
      <aside className="authority-sidebar">
        <a className="authority-brand" href="/admin/authority/command">
          <span>K</span>
          <strong>KODEX <small>Authority Engine</small></strong>
        </a>
        <p className="authority-nav-label">Workspace</p>
        <nav className="authority-nav" aria-label="Authority Engine navigation">
          {nav.map(([label, href, icon]) => (
            <a href={href} key={href}><span>{icon}</span>{label}</a>
          ))}
        </nav>
        <div className="authority-sidebar-footer">
          <div className="authority-system-card">
            <span className={`authority-status-dot ${status.level}`} />
            <strong>{status.label}</strong>
            <small>Last sync {status.lastSyncLabel}</small>
          </div>
          <div className="authority-user-card">
            <span>{initials(user.fullName ?? user.email)}</span>
            <strong>{user.fullName ?? user.email}<small>{user.role}</small></strong>
          </div>
        </div>
      </aside>
      <div className="authority-workspace">{children}</div>
    </section>
  );
}

function initials(value: string): string {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "K";
}
