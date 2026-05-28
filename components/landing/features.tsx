"use client";

import { motion } from "framer-motion";
import {
  Users,
  Target,
  BarChart3,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Decision Maker Enrichment",
    description:
      "Every lead comes with real contacts — DPO, CTO, Head of Legal. We find the people who sign compliance budgets.",
  },
  {
    icon: Target,
    title: "Signal-Based Prioritization",
    description:
      "AI scoring surfaces leads most likely to buy: recently funded, hiring compliance roles, using AI in production.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Management",
    description:
      "Track every lead from first contact to closed deal. Kanban view, status tracking, and conversion metrics.",
  },
  {
    icon: Zap,
    title: "One-Click Outreach",
    description:
      "Pre-built email templates with merge fields. LinkedIn profile links. Log every touchpoint without leaving the dashboard.",
  },
  {
    icon: Shield,
    title: "Compliance-Ready Leads",
    description:
      "Every lead is scored against 9 EU regulatory frameworks. You know exactly which services they need before reaching out.",
  },
  {
    icon: Globe,
    title: "EU Market Focus",
    description:
      "GDPR, EU AI Act, NIS2, DORA, ISO 27001, SOC 2, CRA — we track the frameworks that matter to European businesses.",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
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

export function FeaturesSection() {
  return (
    <div id="features" className="flex-1 flex flex-col justify-center">
      <div className="max-w-[1200px] mx-auto w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
            Features
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4">
            Everything you need to prospect smarter
          </h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            Stop cold-emailing generic addresses. Start conversations with the
            people who actually make compliance decisions.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={cardVariant}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="p-6 rounded-xl border border-border bg-white hover:border-purple/40 hover:shadow-xl transition-shadow group"
            >
              <motion.div
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple/10 mb-4"
                whileHover={{ rotate: -10, scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
              >
                <f.icon className="w-5 h-5 text-purple group-hover:text-[#1d4ed8] transition-colors" />
              </motion.div>
              <h3 className="text-lg font-bold text-navy mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
