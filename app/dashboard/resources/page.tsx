import { FileText, Calculator, BookOpen, Download } from "lucide-react";
import Link from "next/link";

const resources = [
  {
    title: "EU AI Act Battle Card",
    desc: "Key talking points, objection handling, and compliance timeline for prospects.",
    icon: FileText,
    action: "Download PDF",
    href: "#",
  },
  {
    title: "GDPR Objection Handling",
    desc: "Common prospect objections about GDPR compliance and how to address them.",
    icon: BookOpen,
    action: "Download PDF",
    href: "#",
  },
  {
    title: "Pricing Calculator",
    desc: "Interactive tool to show prospects their ROI from using Kodex vs. manual compliance.",
    icon: Calculator,
    action: "Open calculator",
    href: "/pricing",
  },
  {
    title: "Partner Playbook",
    desc: "Complete guide to selling Kodex Compliance: positioning, demos, and closing.",
    icon: Download,
    action: "Download PDF",
    href: "#",
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1F3D] mb-1">Resources</h1>
        <p className="text-sm text-[#7a8599]">
          Sales materials and tools to help you close deals
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {resources.map((r) => (
          <div
            key={r.title}
            className="border border-[#dfe3ea] rounded-xl p-6 bg-white"
          >
            <div className="w-10 h-10 rounded-lg bg-[#A855F7]/10 flex items-center justify-center mb-4">
              <r.icon className="w-5 h-5 text-[#A855F7]" />
            </div>
            <h3 className="font-bold text-[#0F1F3D] mb-1">{r.title}</h3>
            <p className="text-sm text-[#7a8599] mb-4">{r.desc}</p>
            <Link
              href={r.href}
              className="text-sm text-[#A855F7] font-medium hover:underline"
            >
              {r.action} →
            </Link>
          </div>
        ))}
      </div>

      <div className="border border-[#dfe3ea] rounded-xl p-6 bg-[#F7F4EF]">
        <p className="text-sm text-[#3d4a5c]">
          Need custom materials?{" "}
          <a
            href="mailto:contact@kodex-compliance.com"
            className="text-[#A855F7] font-medium hover:underline"
          >
            Contact contact@kodex-compliance.com
          </a>
        </p>
      </div>
    </div>
  );
}
