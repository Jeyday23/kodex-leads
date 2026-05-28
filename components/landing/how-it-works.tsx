"use client";

import { motion } from "framer-motion";
import { Search, Mail, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Find Decision Makers",
    description:
      "Browse AI-enriched leads with direct contacts — CTOs, DPOs, Heads of Legal. Not info@ addresses.",
  },
  {
    icon: Mail,
    step: "02",
    title: "Reach Out Your Way",
    description:
      "Use built-in email templates or your own approach. Track every touchpoint. One-click LinkedIn connect.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Close & Earn",
    description:
      "When your lead becomes a Kodex customer, you earn 20% recurring commission. We handle onboarding.",
  },
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function HowItWorksSection() {
  return (
    <div id="how-it-works" className="flex-1 flex flex-col justify-center">
      <div className="max-w-[1200px] mx-auto w-full">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
            How It Works
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy">
            Three steps to your first deal
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={fadeUp}
              className="relative p-6 rounded-xl border border-border bg-white"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple/10">
                  <s.icon className="w-5 h-5 text-purple" />
                </div>
                <span className="text-xs font-mono text-text-muted">{s.step}</span>
              </div>
              <h3 className="text-xl font-bold text-navy mb-2">{s.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {s.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
