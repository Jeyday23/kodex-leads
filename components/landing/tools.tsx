"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Scale, Layers } from "lucide-react";

const tools = [
  {
    href: "/assess/eu-ai-act",
    icon: Shield,
    title: "EU AI Act Readiness",
    description:
      "7-question assessment. Find out your risk classification and get an action plan.",
    cta: "Start Assessment",
    accent: "bg-purple/10 text-purple",
  },
  {
    href: "/assess/gdpr",
    icon: Scale,
    title: "GDPR Fine Calculator",
    description:
      "Estimate your potential fine exposure under Art. 83. See comparable enforcement cases.",
    cta: "Calculate Risk",
    accent: "bg-teal/10 text-teal",
  },
  {
    href: "/assess/frameworks",
    icon: Layers,
    title: "Compliance Stack Audit",
    description:
      "Select your frameworks. See which controls overlap and how much effort you save.",
    cta: "Audit Your Stack",
    accent: "bg-navy/10 text-navy",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 },
  },
};

export function ToolsSection() {
  return (
    <div id="tools" className="flex-1 flex flex-col justify-center">
      <div className="max-w-[1200px] mx-auto w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
            Free Tools
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4">
            Try before you partner
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            These are the same tools your prospects will use. Understand the value
            firsthand — no signup required.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {tools.map((tool) => (
            <motion.div
              key={tool.href}
              variants={cardVariant}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link
                href={tool.href}
                className="group flex flex-col rounded-xl border border-border p-6 hover:border-purple/40 hover:shadow-xl transition-shadow h-full bg-white"
              >
                <motion.div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${tool.accent} mb-4`}
                  whileHover={{ rotate: 8, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                >
                  <tool.icon className="w-5 h-5" />
                </motion.div>
                <h3 className="text-lg font-bold text-navy mb-2">
                  {tool.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed flex-1 mb-4">
                  {tool.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-purple">
                  {tool.cta}
                  <motion.span
                    className="inline-block"
                    initial={{ x: 0 }}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.span>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
