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
    title: `${label} Readiness Assessment`,
    description: `Capture and score ${label} compliance readiness leads from acquisition traffic.`,
    robots: { index: false, follow: true },
  };
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { framework } = await params;
  const label = displayFramework(framework);

  return (
    <main className="main">
      <section className="hero">
        <p className="eyebrow">Assessment</p>
        <h1>{label} Readiness Assessment</h1>
        <p className="summary">
          Capture visitor context, score lead quality, attach acquisition attribution and route the result toward nurture, sales review or demo booking.
        </p>
      </section>

      <section className="assessment-shell">
        <div>
          <h2>Qualification Logic</h2>
          <p>
            The score weights company size, AI exposure, compliance maturity gaps, urgency and topic fit. High-intent leads are marked for sales review or demo follow-up.
          </p>
        </div>
        <LeadForm framework={framework} />
      </section>
    </main>
  );
}
