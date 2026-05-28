import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kodex Leads",
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-navy mb-8">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: May 28, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-text [&_h2]:text-navy [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4">
          <h2>1. Data Controller</h2>
          <p>
            Kodex Compliance ("we", "us") is the data controller for personal data
            processed through this platform. Contact:{" "}
            <a href="mailto:privacy@kodex-compliance.com" className="text-purple hover:underline">
              privacy@kodex-compliance.com
            </a>
          </p>

          <h2>2. Data We Collect</h2>
          <p><strong>From assessment tools (voluntary):</strong> Name, email, company name, team size, compliance responses.</p>
          <p><strong>From public sources (legitimate interest):</strong> Company names, public job postings, funding data, publicly listed business contacts (name, title, business email).</p>
          <p><strong>From partners:</strong> Name, email, referral code, commission data.</p>
          <p><strong>Automatically:</strong> IP address (for rate limiting, not stored), cookies strictly necessary for authentication.</p>

          <h2>3. Legal Basis (GDPR Art. 6)</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Consent (Art. 6(1)(a)):</strong> Assessment tool submissions.</li>
            <li><strong>Contract (Art. 6(1)(b)):</strong> Partner account management and commission tracking.</li>
            <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Processing publicly available business data to connect companies with compliance service providers. We have conducted a Legitimate Interest Assessment (LIA) documenting that this processing is necessary, proportionate, and balanced against data subject rights.</li>
          </ul>

          <h2>4. Data Retention</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Scraped leads that remain uncontacted are automatically purged after <strong>90 days</strong>.</li>
            <li>Assessment submissions are retained for 12 months, then anonymized.</li>
            <li>Partner data is retained for the duration of the partnership plus 7 years (tax obligations).</li>
          </ul>

          <h2>5. Your Rights (GDPR Art. 15–22)</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access</strong> your personal data (Art. 15)</li>
            <li><strong>Rectify</strong> inaccurate data (Art. 16)</li>
            <li><strong>Erase</strong> your data ("right to be forgotten") (Art. 17)</li>
            <li><strong>Restrict</strong> processing (Art. 18)</li>
            <li><strong>Data portability</strong> (Art. 20)</li>
            <li><strong>Object</strong> to processing based on legitimate interest (Art. 21)</li>
          </ul>
          <p>
            To exercise these rights, email{" "}
            <a href="mailto:privacy@kodex-compliance.com" className="text-purple hover:underline">
              privacy@kodex-compliance.com
            </a>. We will respond within 30 days.
          </p>

          <h2>6. Data Processors & Transfers</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> (database, EU region) — data processing agreement in place.</li>
            <li><strong>Render</strong> (hosting) — application server.</li>
            <li><strong>Stripe</strong> (payments) — commission processing, SCCs in place.</li>
            <li><strong>HubSpot</strong> (CRM) — qualified lead sync, DPA in place.</li>
            <li><strong>Hunter.io / Apollo.io</strong> (enrichment) — public business contact lookup.</li>
          </ul>
          <p>Where data is transferred outside the EU/EEA, we rely on Standard Contractual Clauses (SCCs) or adequacy decisions.</p>

          <h2>7. Cookies</h2>
          <p>We use only strictly necessary cookies for authentication (Supabase session). No tracking or analytics cookies are set without your consent.</p>

          <h2>8. Automated Decision-Making</h2>
          <p>Lead scoring is automated but does not produce legal effects on individuals. Scores determine whether a company appears in partner dashboards, not decisions about individuals.</p>

          <h2>9. Supervisory Authority</h2>
          <p>You have the right to lodge a complaint with a supervisory authority, in particular in the EU Member State of your habitual residence, place of work, or place of the alleged infringement.</p>

          <h2>10. Changes</h2>
          <p>We may update this policy. Material changes will be communicated via email to registered partners.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
