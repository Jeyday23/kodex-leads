"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/assess/eu-ai-act", label: "EU AI Act Assessment" },
  { href: "/assess/gdpr", label: "GDPR Calculator" },
  { href: "/assess/frameworks", label: "Stack Audit" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#dfe3ea]">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-[#0F1F3D]">Kodex</span>
          <span className="text-lg font-bold text-[#A855F7]">Tools</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-[#3d4a5c] hover:text-[#0F1F3D] transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/assess/eu-ai-act"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#A855F7] text-white text-sm font-medium hover:bg-[#9333EA] transition-colors"
          >
            Start Assessment <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && <MobileNav onClose={() => setOpen(false)} />}
    </nav>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  return (
    <div className="md:hidden fixed inset-0 top-14 z-40 bg-white">
      <div className="flex flex-col p-6 gap-4">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className="text-lg text-[#3d4a5c] hover:text-[#0F1F3D] py-2 border-b border-[#dfe3ea]"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/assess/eu-ai-act"
          onClick={onClose}
          className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-3 mt-4",
            "rounded-full bg-[#A855F7] text-white font-medium hover:bg-[#9333EA]"
          )}
        >
          Start Assessment <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
