"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"

const sampleLeads = [
  {
    id: "1",
    company: "Compliance Corp",
    confidence: 94,
    intent: "EU AI Act compliance tools",
  },
  {
    id: "2",
    company: "LegalTech Solutions",
    confidence: 87,
    intent: "GDPR audit and remediation",
  },
  {
    id: "3",
    company: "Risk Management Inc",
    confidence: 91,
    intent: "NIS2 framework implementation",
  },
]

export function LiveResults() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

  return (
    <section className="live-results" ref={ref}>
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="eyebrow">Live demonstration</p>
          <h2>See the Organism in Action</h2>
        </motion.div>

        <div className="cards-grid">
          {sampleLeads.map((lead, index) => (
            <motion.div
              key={lead.id}
              className="lead-card"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <div className="card-content">
                <h3>{lead.company}</h3>
                <p className="intent">{lead.intent}</p>

                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${lead.confidence}%` }}
                  />
                </div>
                <p className="confidence-label">
                  {lead.confidence}% confidence
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .live-results {
          padding: 6rem 2rem;
          background: linear-gradient(180deg, #0f1f3d 0%, #0a1428 100%);
        }

        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .eyebrow {
          color: #0d9488;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }

        h2 {
          font-size: 2.5rem;
          color: #f7f4ef;
          margin-top: 0.5rem;
          margin-bottom: 3rem;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .lead-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 16px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .lead-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(168, 85, 247, 0.4);
          box-shadow: 0 20px 40px rgba(168, 85, 247, 0.15);
        }

        .card-content h3 {
          font-size: 1.3rem;
          color: #a855f7;
          margin: 0 0 0.5rem 0;
        }

        .intent {
          color: #d8bfd8;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        .confidence-bar {
          height: 6px;
          background: rgba(168, 85, 247, 0.1);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(
            90deg,
            #0d9488 0%,
            #a855f7 100%
          );
          transition: width 0.6s ease;
        }

        .confidence-label {
          font-size: 0.8rem;
          color: #0d9488;
          margin: 0;
        }

        @media (max-width: 720px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }

          h2 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </section>
  )
}
