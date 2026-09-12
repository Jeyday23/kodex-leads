import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/config";
import { getSeoSupabase } from "@/lib/seo/db";
import { getAllAuditTrends, getLatestAudits } from "@/lib/growth/audit/history";
import { isPagespeedConfigured } from "@/lib/growth/audit/pagespeed";
import { SiteAuditView } from "./SiteAuditView";

export const metadata: Metadata = { title: "Kodex Site Audit", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TREND_DAYS = 30;

export default async function SiteAuditPage() {
  const url = getSiteUrl();
  const supabaseConfigured = getSeoSupabase() !== null;

  const [audits, trends] = supabaseConfigured
    ? await Promise.all([getLatestAudits(url), getAllAuditTrends(url, TREND_DAYS)])
    : [[], {}];

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Site Audit</h1>
        </div>
      </header>
      <SiteAuditView
        url={url}
        audits={audits}
        trends={trends}
        trendDays={TREND_DAYS}
        supabaseConfigured={supabaseConfigured}
        pagespeedConfigured={isPagespeedConfigured()}
      />
    </main>
  );
}
