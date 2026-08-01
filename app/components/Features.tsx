"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { useState } from "react"

const features = [
  {
    id: "google",
    title: "Google",
    icon: "🌐",
    description: "Search optimization",
    details: [
      "Sitemap generation",
      "Canonical URL optimization",
      "Search Console integration",
      "Core Web Vitals monitoring",
    ],
  },
  {
    id: "llms",
    title: "LLMs",
    icon: "🧠",
    description: "AI model readiness",
    details: [
      "llms.txt specification",
      "Answer-first page structure",
      "ChatGPT, Claude, Perplexity sync",
      "AI sitemap generation",
    ],
  },
  {
    id: "leads",
    title: "Leads",
    icon: "🎯",
    description: "B2B lead capture",
    details: [
      "Prospect discovery",
      "Confidence scoring",
      "Lead persistence",
      "Slack & HubSpot routing",
    ],
  },
]

export function Features() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <section className="features" ref={ref}>
      <div className="section-container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Three Pillars of Autonomy
        </motion.h2>

        <div className="pillars-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              className="pillar"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              onMouseEnter={() => setExpanded(feature.id)}
              onMouseLeave={() => setExpanded(null)}
            >
              <div className="pillar-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>

              <motion.ul
                className="pillar-details"
                initial={{ opacity: 0, height: 0 }}
                animate={
                  expanded === feature.id
                    ? { opacity: 1, height: "auto" }
                    : { opacity: 0, height: 0 }
                }
                transition={{ duration: 0.3 }}
              >
                {feature.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </motion.ul>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .features {
          padding: 6rem 2rem;
          background: linear-gradient(180deg, #0a1428 0%, #0f1f3d 100%);
        }

        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        h2 {
          font-size: 2.5rem;
          color: #f7f4ef;
          text-align: center;
          margin-bottom: 3rem;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .pillar {
          padding: 2.5rem;
          background: rgba(168, 85, 247, 0.03);
          border: 2px solid rgba(168, 85, 247, 0.1);
          border-radius: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .pillar:hover {
          background: rgba(168, 85, 247, 0.08);
          border-color: rgba(168, 85, 247, 0.3);
          box-shadow: 0 20px 40px rgba(168, 85, 247, 0.1);
        }

        .pillar-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          display: inline-block;
          animation: hover-lift 0.6s ease infinite;
          animation-play-state: paused;
        }

        .pillar:hover .pillar-icon {
          animation-play-state: running;
        }

        .pillar h3 {
          font-size: 1.8rem;
          color: #a855f7;
          margin: 1rem 0 0.5rem 0;
        }

        .pillar > p {
          color: #d8bfd8;
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }

        .pillar-details {
          list-style: none;
          padding: 0;
          margin-top: 1rem;
          text-align: left;
        }

        .pillar-details li {
          color: #0d9488;
          font-size: 0.9rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(13, 148, 136, 0.2);
        }

        .pillar-details li:last-child {
          border-bottom: none;
        }

        @media (max-width: 720px) {
          .pillars-grid {
            grid-template-columns: 1fr;
          }

          h2 {
            font-size: 1.8rem;
          }

          .pillar-details {
            display: none;
          }
        }
      `}</style>
    </section>
  )
}
