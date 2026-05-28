import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprint — Kodex Leads",
};

export default function ImprintPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-navy mb-8">Imprint</h1>
        <p className="text-sm text-text-muted mb-6">Angaben gemäß § 5 TMG / Information pursuant to § 5 TMG</p>

        <div className="prose prose-sm max-w-none space-y-6 text-text [&_h2]:text-navy [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4">
          <h2>Company</h2>
          <p>
            Kodex Compliance<br />
            c/o CODE University of Applied Sciences<br />
            Lohmühlenstraße 65<br />
            12435 Berlin, Germany
          </p>

          <h2>Contact</h2>
          <p>
            Email:{" "}
            <a href="mailto:hello@kodex-compliance.com" className="text-purple hover:underline">
              hello@kodex-compliance.com
            </a>
          </p>

          <h2>Represented by</h2>
          <p>Jeremiah Matador, Founder</p>

          <h2>Responsible for content (§ 55 Abs. 2 RStV)</h2>
          <p>
            Jeremiah Matador<br />
            Kodex Compliance<br />
            c/o CODE University of Applied Sciences<br />
            Lohmühlenstraße 65<br />
            12435 Berlin, Germany
          </p>

          <h2>Dispute Resolution</h2>
          <p>
            The European Commission provides a platform for online dispute resolution
            (OS). We are not obligated and not willing to participate in dispute
            resolution proceedings before a consumer arbitration board.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
