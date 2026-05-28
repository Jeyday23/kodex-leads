import Link from "next/link";

const toolLinks = [
  { href: "/assess/eu-ai-act", label: "EU AI Act Assessment" },
  { href: "/assess/gdpr", label: "GDPR Fine Calculator" },
  { href: "/assess/frameworks", label: "Compliance Stack Audit" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/imprint", label: "Imprint" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#dfe3ea] bg-white">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-lg font-bold text-[#0F1F3D]">Kodex</span>
              <span className="text-lg font-bold text-[#A855F7]">Leads</span>
            </div>
            <p className="text-sm text-[#7a8599] leading-relaxed">
              Outbound prospecting for EU compliance sales partners. Built by Kodex Compliance.
            </p>
            <p className="text-sm text-[#7a8599] mt-4">
              © {new Date().getFullYear()} Kodex Compliance. All rights
              reserved.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#0D9488] mb-4">
                Tools
              </h4>
              <ul className="space-y-2.5">
                {toolLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#7a8599] hover:text-[#3d4a5c] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-[#0D9488] mb-4">
                Legal
              </h4>
              <ul className="space-y-2.5">
                {legalLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#7a8599] hover:text-[#3d4a5c] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
