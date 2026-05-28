import Link from "next/link";
import { ArrowRight, Shield, Scale, Layers } from "lucide-react";
import { Countdown } from "@/components/countdown";
import {
  AnimatedHero,
  AnimatedStaggerGrid,
} from "@/components/animated";

const tools = [
  {
    href: "/assess/eu-ai-act",
    icon: Shield,
    title: "EU AI Act Readiness",
    description:
      "7-question assessment. Find out your risk classification and get a 66-day action plan before the August 2 deadline.",
    cta: "Start Assessment",
    accent: "bg-purple-50 text-[#A855F7]",
  },
  {
    href: "/assess/gdpr",
    icon: Scale,
    title: "GDPR Fine Calculator",
    description:
      "Estimate your potential fine exposure under Art. 83. See comparable enforcement cases from your industry.",
    cta: "Calculate Risk",
    accent: "bg-teal-50 text-[#0D9488]",
  },
  {
    href: "/assess/frameworks",
    icon: Layers,
    title: "Compliance Stack Audit",
    description:
      "Select your required frameworks. See which controls overlap, what's unique, and how much effort you can save.",
    cta: "Audit Your Stack",
    accent: "bg-navy/5 text-[#0F1F3D]",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-[#0F1F3D] text-white">
        <div className="max-w-[1080px] mx-auto px-6 lg:px-10 py-20 lg:py-28 text-center">
          <AnimatedHero>
            <p className="text-xs font-mono uppercase tracking-widest text-[#0D9488] mb-4">
              Free Compliance Tools by Kodex
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6 text-white">
              Are you ready for
              <br />
              <span className="text-[#A855F7]">August 2?</span>
            </h1>
            <p className="text-lg text-white/70 max-w-xl mx-auto mb-10">
              The EU AI Act enforcement deadline is approaching. Use our free
              tools to assess your compliance posture — no signup required.
            </p>
            <Countdown />
            <div className="mt-10">
              <Link
                href="/assess/eu-ai-act"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#A855F7] text-white font-medium hover:bg-[#9333EA] transition-colors"
              >
                Check Your Readiness <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </AnimatedHero>
        </div>
      </section>

      <section className="max-w-[1080px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
        <AnimatedStaggerGrid className="grid md:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-xl border border-[#dfe3ea] p-6 hover:border-[#A855F7]/40 hover:shadow-lg transition-all"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${tool.accent} mb-4`}
              >
                <tool.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0F1F3D] mb-2">
                {tool.title}
              </h3>
              <p className="text-sm text-[#7a8599] leading-relaxed flex-1 mb-4">
                {tool.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A855F7] group-hover:gap-2.5 transition-all">
                {tool.cta} <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </AnimatedStaggerGrid>
      </section>

      <section className="bg-[#f6f7f9] border-t border-[#dfe3ea]">
        <div className="max-w-[1080px] mx-auto px-6 lg:px-10 py-16 text-center">
          <h2 className="text-2xl font-bold text-[#0F1F3D] mb-3">
            Built by compliance engineers
          </h2>
          <p className="text-[#7a8599] max-w-lg mx-auto mb-8">
            These tools use the same frameworks we deploy at Kodex Compliance.
            Results are instant, free, and GDPR-safe.
          </p>
          <a
            href="https://kodex-compliance.com"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0D9488] hover:text-[#0F1F3D] transition-colors"
          >
            Learn about Kodex Compliance <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </>
  );
}
