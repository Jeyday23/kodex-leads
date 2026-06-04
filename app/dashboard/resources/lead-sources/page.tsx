import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Search,
  Zap,
  Target,
  Briefcase,
  TrendingUp,
  Users,
  ExternalLink,
  Copy,
} from "lucide-react";

const AUTOMATED_SOURCES = [
  {
    name: "Arbeitnow",
    url: "https://www.arbeitnow.com",
    icon: Briefcase,
    what: "EU job board with compliance and data protection roles",
    look_for:
      "Companies hiring for DPO, GDPR Specialist, Data Protection Officer, Compliance Manager. These companies know they need compliance but lack internal capability — ideal prospects.",
  },
  {
    name: "EU-Startups",
    url: "https://www.eu-startups.com",
    icon: TrendingUp,
    what: "News and funding announcements for EU startups",
    look_for:
      "Recently funded companies (Seed, Series A, Series B). Investors increasingly require compliance as a condition of funding. These companies have budget and urgency.",
  },
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    icon: Zap,
    what: "New product launches including AI/ML tools",
    look_for:
      "AI-powered products launching from EU-based teams. Filter for Artificial Intelligence, Machine Learning, and Developer Tools categories.",
  },
  {
    name: "GitHub Trending",
    url: "https://github.com/trending",
    icon: Globe,
    what: "Trending open-source AI/ML repositories",
    look_for:
      "AI and ML repos with EU-based maintainers. Check contributor profiles for EU locations — these developers often work at or run companies that need EU AI Act compliance.",
  },
];

const MANUAL_CHANNELS = [
  {
    name: "LinkedIn Sales Navigator",
    url: "https://www.linkedin.com/sales",
    icon: Users,
    tips: [
      "Search for companies hiring: DPO, GDPR, Data Protection Officer, Compliance Officer",
      "Filter by location: Germany, Netherlands, France, Ireland, EU",
      "Filter by company size: 11-200 employees (sweet spot for Kodex)",
      "Look for CTOs and founders at AI startups — they make compliance decisions",
      "Use Boolean: \"data protection\" OR \"GDPR\" OR \"compliance\" AND \"hiring\"",
    ],
  },
  {
    name: "Crunchbase",
    url: "https://www.crunchbase.com",
    icon: TrendingUp,
    tips: [
      "Filter: Location = Europe, Funding = Seed / Series A / Series B",
      "Industry: Artificial Intelligence, Machine Learning, SaaS",
      "Recently funded (last 6 months) = compliance budget available",
      "Check \"Technology\" field for AI/ML indicators",
    ],
  },
  {
    name: "GDPR Enforcement Tracker",
    url: "https://www.enforcementtracker.com",
    icon: Target,
    tips: [
      "Browse recent fines to identify which industries are being targeted",
      "Use specific cases in outreach emails to create urgency",
      "Filter by country to find enforcement trends in your target market",
      "Reference fine amounts when prospects say \"we're too small to get fined\"",
    ],
  },
  {
    name: "Indeed / StepStone / LinkedIn Jobs",
    url: "https://www.indeed.com",
    icon: Briefcase,
    tips: [
      "Search: \"Data Protection Officer\" or \"Compliance Manager\" in EU cities",
      "Companies posting these roles need compliance help NOW",
      "Check the company profile — if they use AI, they need EU AI Act compliance too",
      "StepStone (stepstone.de) is strong for DACH market leads",
    ],
  },
];

const SEARCH_TERMS = [
  { term: "\"data protection officer\" hiring EU", where: "LinkedIn, Indeed" },
  { term: "\"GDPR compliance\" startup", where: "Google, LinkedIn" },
  { term: "\"AI startup\" funded Europe 2025", where: "Crunchbase, Google" },
  { term: "\"compliance officer\" SaaS Berlin", where: "LinkedIn, StepStone" },
  { term: "\"series A\" artificial intelligence EU", where: "Crunchbase" },
  { term: "\"ISO 27001\" certification hiring", where: "LinkedIn, Indeed" },
  { term: "\"EU AI Act\" readiness", where: "Google, LinkedIn" },
  { term: "\"NIS2\" compliance Germany", where: "Google, LinkedIn" },
];

const SIGNAL_STACK = [
  { signal: "Uses AI in production", points: "+25 pts", color: "bg-red-100 text-red-700" },
  { signal: "Team size 11–200", points: "+15–20 pts", color: "bg-amber-100 text-amber-700" },
  { signal: "Recently funded (Seed–Series B)", points: "+15 pts", color: "bg-amber-100 text-amber-700" },
  { signal: "Hiring compliance roles", points: "Strong signal", color: "bg-purple-100 text-purple-700" },
  { signal: "No existing compliance", points: "+15 pts", color: "bg-red-100 text-red-700" },
  { signal: "Business email domain", points: "+5 pts", color: "bg-emerald-100 text-emerald-700" },
];

export default function LeadSourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/resources"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-navy transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resources
        </Link>
        <h1 className="text-2xl font-bold text-navy mb-1">
          Prospecting Sources
        </h1>
        <p className="text-sm text-text-muted">
          Where to find compliance-ready leads — automated and manual channels
        </p>
      </div>

      {/* Automated Sources */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Automated Sources
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          The Kodex Leads system scrapes these sources automatically. New leads
          appear in the Prospects tab daily. You can also browse them directly
          for manual research.
        </p>
        <div className="space-y-3">
          {AUTOMATED_SOURCES.map((s) => (
            <div
              key={s.name}
              className="border border-border rounded-xl p-5 bg-white"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                  <s.icon className="w-4 h-4 text-purple" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-navy">{s.name}</p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-purple hover:underline"
                    >
                      Visit <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-text-muted mb-2">{s.what}</p>
                  <p className="text-sm text-navy">{s.look_for}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Prospecting */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Manual Prospecting Channels
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Use these channels to find leads beyond what the scrapers cover.
          Manually sourced leads often convert at higher rates because you can
          qualify them before outreach.
        </p>
        <div className="space-y-4">
          {MANUAL_CHANNELS.map((ch) => (
            <div
              key={ch.name}
              className="border border-border rounded-xl p-5 bg-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center shrink-0">
                  <ch.icon className="w-4 h-4 text-purple" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-navy">{ch.name}</p>
                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple hover:underline"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <ul className="space-y-2">
                {ch.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-navy">
                    <span className="text-purple mt-1 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Search Terms */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Copy className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">
            Search Terms That Work
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Copy these into LinkedIn, Google, or job boards to find prospects fast.
        </p>
        <div className="border border-border rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-muted border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-text-muted">
                  Search term
                </th>
                <th className="text-left px-4 py-3 font-medium text-text-muted">
                  Best on
                </th>
              </tr>
            </thead>
            <tbody>
              {SEARCH_TERMS.map((s) => (
                <tr
                  key={s.term}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">
                    <code className="text-xs bg-bg-muted px-2 py-1 rounded text-navy">
                      {s.term}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{s.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signal Stacking */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple" />
          <h2 className="text-lg font-bold text-navy">Signal Stacking</h2>
        </div>
        <p className="text-sm text-text-muted mb-4">
          Leads matching multiple signals convert at the highest rate. When
          prospecting manually, prioritise companies that hit 3 or more of these
          criteria — they score 40+ in the system and appear as qualified
          prospects.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {SIGNAL_STACK.map((s) => (
            <div
              key={s.signal}
              className="flex items-center justify-between border border-border rounded-xl p-4 bg-white"
            >
              <span className="text-sm text-navy">{s.signal}</span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}
              >
                {s.points}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-purple/5 border border-purple/20 rounded-xl p-4">
          <p className="text-sm text-navy">
            <span className="font-medium">Example high-value lead:</span> A
            Berlin-based Series A startup (team of 45) that uses generative AI
            and has no compliance measures. Score: 25 + 20 + 15 + 15 + 10 ={" "}
            <span className="font-bold text-purple">85 points</span> — top of
            the Prospects queue.
          </p>
        </div>
      </div>
    </div>
  );
}
