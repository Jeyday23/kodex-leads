"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import ShaderBackground from "@/components/ui/shader-background";

const spring = { type: "spring" as const, stiffness: 80, damping: 20 };

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * ease));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target]);

  return <span ref={ref}>{value}{suffix}</span>;
}

export function HeroSection() {
  return (
    <div className="relative text-white flex-1 flex items-center">
      <ShaderBackground className="absolute inset-0 w-full h-full" />

      <div className="relative z-10 max-w-[1200px] mx-auto w-full py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 mb-8"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              <span className="text-xs font-mono uppercase tracking-widest text-teal">
                Partner Sales Platform
              </span>
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
          >
            Compliance is complex.{" "}
            <br className="hidden sm:block" />
            <motion.span
              className="text-purple inline-block"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: 0.4 }}
            >
              Finding the right people
            </motion.span>{" "}
            <br className="hidden sm:block" />
            shouldn&apos;t be.
          </motion.h1>

          <motion.p
            className="text-lg text-white/70 max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.35 }}
          >
            Every company in the EU needs compliance. Most don&apos;t know where to
            start. We connect you directly with decision makers who need help — so
            you can focus on closing deals, not chasing inboxes.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.45 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-purple text-white font-medium hover:bg-purple-hover transition-colors"
              >
                Become a Partner <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.6 }}
          >
            {[
              { value: 20, suffix: "%", label: "Commission" },
              { value: 9, suffix: "", label: "EU Frameworks" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <p className="text-2xl font-bold text-purple">
                  <CountUp target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-white/50 mt-1">{stat.label}</p>
              </motion.div>
            ))}
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <p className="text-2xl font-bold text-purple">Direct</p>
              <p className="text-xs text-white/50 mt-1">Decision Makers</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
