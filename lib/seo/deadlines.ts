export interface ComplianceDeadline {
  id: string;
  framework: string;
  label: string;
  date: string;
  displayDate: string;
  description: string;
}

export const complianceDeadlines: ComplianceDeadline[] = [
  {
    id: "eu-ai-act-high-risk",
    framework: "eu-ai-act",
    label: "EU AI Act high-risk obligations",
    date: "2026-08-02T00:00:00.000Z",
    displayDate: "August 2, 2026",
    description: "High-risk AI system obligations become fully enforceable.",
  },
  {
    id: "dora-operational-resilience",
    framework: "dora",
    label: "DORA operational resilience",
    date: "2027-01-17T00:00:00.000Z",
    displayDate: "January 17, 2027",
    description: "Ongoing financial digital operational resilience supervision remains active.",
  },
];

export function getNextDeadline(referenceDate = new Date()): ComplianceDeadline | null {
  const upcoming = complianceDeadlines
    .filter((deadline) => new Date(deadline.date).getTime() >= startOfDay(referenceDate).getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] ?? null;
}

export function daysUntilDeadline(deadlineDate: string, referenceDate = new Date()): number {
  const deadline = startOfDay(new Date(deadlineDate)).getTime();
  const reference = startOfDay(referenceDate).getTime();
  return Math.max(0, Math.ceil((deadline - reference) / 86_400_000));
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
