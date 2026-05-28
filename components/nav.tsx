"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

const links = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#tools", label: "Free Tools" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-navy">Kodex</span>
          <span className="text-xl font-bold text-purple">Leads</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-text hover:text-navy transition-colors"
            >
              {l.label}
            </a>
          ))}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple text-white text-sm font-medium hover:bg-purple-hover transition-colors"
            >
              Partner Login <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && <MobileNav onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </nav>
  );
}

function MobileNav({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="md:hidden fixed inset-0 top-16 z-40 bg-white"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col p-6 gap-4">
        {links.map((l, i) => (
          <motion.div
            key={l.href}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <a
              href={l.href}
              onClick={onClose}
              className="block text-lg text-text hover:text-navy py-2 border-b border-border"
            >
              {l.label}
            </a>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/login"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 mt-4 w-full rounded-full bg-purple text-white font-medium hover:bg-purple-hover transition-colors"
          >
            Partner Login <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
