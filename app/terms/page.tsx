import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Kodex Leads",
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-navy mb-8">Terms of Service</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: May 28, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-text [&_h2]:text-navy [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4">
          <h2>1. Overview</h2>
          <p>
            Kodex Leads is operated by Kodex Compliance. These terms govern your use
            of the platform, including free compliance assessment tools and the partner
            sales dashboard.
          </p>

          <h2>2. Free Tools</h2>
          <p>
            The EU AI Act Assessment, GDPR Fine Calculator, and Compliance Stack Audit
            are provided for informational purposes only. They do not constitute legal
            advice. Results are estimates based on the information you provide.
          </p>

          <h2>3. Partner Accounts</h2>
          <p>
            Partner accounts are approved by Kodex Compliance. Partners receive access
            to qualified leads and earn commissions on conversions. Partners must:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Represent compliance services accurately</li>
            <li>Not resell or share lead data with third parties</li>
            <li>Comply with GDPR when contacting leads</li>
            <li>Not use automated tools to bulk-extract lead data</li>
          </ul>

          <h2>4. Lead Data</h2>
          <p>
            Leads provided through the platform are sourced from public data and
            voluntary submissions. Partners may use lead data solely for direct
            outreach related to compliance services. Data must not be exported,
            scraped, or used for purposes unrelated to the Kodex partnership.
          </p>

          <h2>5. Commissions</h2>
          <p>
            Commission rates are set per partner agreement (default 15%). Commissions
            are calculated on verified conversions tracked via Stripe. Payment terms
            are Net 30 from conversion confirmation.
          </p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Attempt to access other partners' data</li>
            <li>Reverse-engineer or scrape the platform</li>
            <li>Submit false or misleading assessment data</li>
            <li>Use the platform for spam or unsolicited bulk email</li>
          </ul>

          <h2>7. Limitation of Liability</h2>
          <p>
            Kodex Compliance provides the platform "as is". We are not liable for
            business decisions made based on lead scores, assessment results, or
            compliance recommendations. Our total liability is limited to commissions
            earned in the preceding 12 months.
          </p>

          <h2>8. Termination</h2>
          <p>
            Either party may terminate the partnership with 30 days written notice.
            Kodex Compliance may suspend accounts immediately for Terms violations.
            Upon termination, partners must cease using any lead data obtained through
            the platform.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These terms are governed by German law. Disputes shall be resolved in the
            courts of Berlin, Germany.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:legal@kodex-compliance.com" className="text-purple hover:underline">
              legal@kodex-compliance.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
