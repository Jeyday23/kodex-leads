"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const points = [
  "Built by compliance engineers, not marketers",
  "GDPR-safe lead handling with 90-day auto-purge",
  "Covers GDPR, EU AI Act, NIS2, DORA, ISO 27001, SOC 2, CRA, BDSG, and more",
  "Every lead scored against real regulatory signals",
];

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const pointVariant = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 18 },
  },
};

export function SocialProofSection() {
  return (
    <div className="flex-1 flex flex-col justify-center text-white">
      <div className="max-w-[1200px] mx-auto w-full">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          >
            <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
              Why Kodex Leads
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              We practice what we preach
            </h2>
            <p className="text-white/60 mb-12 max-w-xl mx-auto">
              Our prospecting platform follows the same compliance standards we
              help companies achieve.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 gap-4 text-left"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {points.map((point) => (
              <motion.div
                key={point}
                variants={pointVariant}
                whileHover={{ scale: 1.03, x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-start gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-default"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.3 }}
                >
                  <CheckCircle className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                </motion.div>
                <p className="text-sm text-white/80 leading-relaxed">{point}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
