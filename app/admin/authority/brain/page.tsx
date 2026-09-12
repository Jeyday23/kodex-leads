import type { Metadata } from "next";
import { requireAuthorityPage } from "@/lib/authority/auth";
import { getSeoSupabase } from "@/lib/seo/db";
import { getBrainContextBundle } from "@/lib/growth/context";
import BrainGraph from "./BrainGraph";

export const metadata: Metadata = { title: "Growth Brain", robots: { index: false, follow: false } };

export default async function BrainPage() {
  await requireAuthorityPage("/admin/authority/brain");

  const bundle = await getBrainContextBundle();
  const storeConfigured = getSeoSupabase() !== null;

  return (
    <main className="authority-module">
      <header className="authority-topbar">
        <div>
          <p>Private Kodex System</p>
          <h1>Growth Brain</h1>
          <p>
            One context bundle reused by every Growth Engine generator: company profile and ICP, personas, keywords,
            message pillars, objections, competitors, influencers and per-channel voice.
          </p>
        </div>
      </header>

      {!storeConfigured ? (
        <p className="authority-empty" role="status">
          Supabase not configured, showing seed data. Connect NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to
          edit and persist the Brain.
        </p>
      ) : null}

      <BrainGraph initialBundle={bundle} storeConfigured={storeConfigured} />
    </main>
  );
}
