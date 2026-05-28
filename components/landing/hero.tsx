"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import ShaderBackground from "@/components/ui/shader-background";

export function HeroSection() {
  return (
    <div className="relative text-white flex-1 flex items-center">
      <ShaderBackground className="absolute inset-0 w-full h-full" />

      <div className="relative z-10 max-w-[1200px] mx-auto w-full py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              <span className="text-xs font-mono uppercase tracking-widest text-teal">
                Partner Sales Platform
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          >
            Compliance is complex.{" "}
            <br className="hidden sm:block" />
            <span className="text-purple">Finding the right people</span>{" "}
            <br className="hidden sm:block" />
            shouldn&apos;t be.
          </motion.h1>

          <motion.p
            className="text-lg text-white/70 max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            Every company in the EU needs compliance. Most don&apos;t know where to
            start. We connect you directly with decision makers who need help — so
            you can focus on closing deals, not chasing inboxes.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-purple text-white font-medium hover:bg-[#9333EA] transition-colors"
              >
                Become a Partner <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white font-medium hover:bg-white/5 transition-colors"
              >
                See How It Works
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { value: "20%", label: "Commission" },
              { value: "9", label: "EU Frameworks" },
              { value: "Direct", label: "Decision Makers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-purple">{stat.value}</p>
                <p className="text-xs text-white/50 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
