import type { Metadata } from "next";
import { LeadForm } from "./lead-form";
import { displayFramework } from "@/lib/seo/config";

interface AssessmentPageProps {
  params: Promise<{ framework: string }>;
}

export async function generateMetadata({ params }: AssessmentPageProps): Promise<Metadata> {
  const { framework } = await params;
  const label = displayFramework(framework);
  return {
    title: `${label} Readiness Check`,
    description: `Answer a few questions and get a practical ${label} readiness score with the next steps to prioritize.`,
    robots: { index: false, follow: true },
  };
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { framework } = await params;
  const label = displayFramework(framework);

  return (
    <main className="main">
      <section className="assessment-hero">
        <p className="eyebrow">Free readiness check</p>
        <h1>Find your {label} gaps in 2 minutes.</h1>
        <p className="summary">
          Answer six short questions. Kodex scores your current exposure, shows what to prioritize, and gives you a clear next step without requiring a sales call.
        </p>
        <div className="assessment-proof" aria-label="What happens next">
          <span>Instant score</span>
          <span>Source-backed guidance</span>
          <span>No credit card</span>
        </div>
      </section>

      <section className="assessment-shell">
        <aside className="assessment-guide" aria-label="Assessment process">
          <p className="eyebrow">How it works</p>
          <h2>Your result is built from practical operating signals.</h2>
          <p>
            We look at company size, AI usage, compliance maturity and urgency, then turn that into a readiness grade you can act on.
          </p>
          <ol className="assessment-steps">
            <li>
              <strong>Tell us your context</strong>
              <span>Pick the closest answers for your company and timeline.</span>
            </li>
            <li>
              <strong>Get a readiness score</strong>
              <span>See whether you are researching, need a plan, or should move now.</span>
            </li>
            <li>
              <strong>Use the next action</strong>
              <span>Continue with a deadline page, deeper assessment, or follow-up.</span>
            </li>
          </ol>
        </aside>
        <LeadForm framework={framework} />
      </section>
    </main>
  );
}
