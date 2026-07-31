"use client"

import { motion } from "framer-motion"
import { ParticleOrganism } from "./ParticleOrganism"

export function OrganismHero() {
  return (
    <section className="hero hero-organism">
      <div className="hero-canvas-container">
        <ParticleOrganism />
      </div>

      <motion.div
        className="hero-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          Kodex Leads
        </motion.h1>
        <motion.p
          className="hero-subheading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          Autonomous SEO That Works for You
        </motion.p>

        <motion.div
          className="scroll-indicator"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          initial={{ opacity: 0 }}
        >
          <div className="scroll-arrow">↓</div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .hero-organism {
          position: relative;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(135deg, #0f1f3d 0%, #0a1428 100%);
        }

        .hero-canvas-container {
          position: absolute;
          inset: 0;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        h1 {
          font-size: 3.5rem;
          font-weight: 700;
          color: #f7f4ef;
          text-align: center;
          margin: 0;
          text-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
        }

        .hero-subheading {
          font-size: 1.25rem;
          color: #d8bfd8;
          text-align: center;
          margin-top: 1rem;
          max-width: 600px;
        }

        .scroll-indicator {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
        }

        .scroll-arrow {
          font-size: 1.5rem;
          color: rgba(168, 85, 247, 0.6);
        }

        @media (max-width: 720px) {
          h1 {
            font-size: 2rem;
          }

          .hero-subheading {
            font-size: 1rem;
          }
        }
      `}</style>
    </section>
  )
}
