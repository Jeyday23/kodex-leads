"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does the commission work?",
    a: "You earn 20% recurring commission on every deal your referred lead converts to. Kodex handles all customer onboarding and support — you focus on the introduction.",
  },
  {
    q: "What kind of leads will I find?",
    a: "EU companies that show compliance buying signals: recently funded startups, companies hiring for compliance roles, businesses using AI in production, and firms in regulated industries. Each lead is enriched with direct decision-maker contacts.",
  },
  {
    q: "Do I need compliance expertise?",
    a: "It helps, but it's not required. Our free assessment tools let prospects self-qualify, and the dashboard gives you talking points for each framework. You're connecting companies with solutions, not delivering the compliance work yourself.",
  },
  {
    q: "How are leads sourced?",
    a: "We combine public data signals (funding rounds, job postings, tech stacks) with AI-powered enrichment to identify companies with compliance needs. All data handling follows GDPR legitimate interest guidelines with a 90-day auto-purge on uncontacted leads.",
  },
  {
    q: "Is there a cost to join?",
    a: "The partner program is free to join. You get access to the prospecting dashboard, enriched leads, email templates, and pipeline tools at no cost. You earn when your leads convert.",
  },
  {
    q: "What compliance frameworks do you cover?",
    a: "GDPR, EU AI Act, ISO 27001, SOC 2, NIS2, DORA, CRA, BDSG, and more. The platform scores leads against all of these, so you know exactly which services each prospect needs.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left"
      >
        <span className="text-base font-medium text-navy pr-4">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-muted leading-relaxed pb-5">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  return (
    <div id="faq" className="flex-1 flex flex-col justify-center">
      <div className="max-w-[800px] mx-auto w-full">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">
            FAQ
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-navy">
            Common questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
