"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"

const stages = [
  {
    title: "Regulations",
    description: "Demand signals enter the system",
    icon: "📋",
  },
  {
    title: "Pages",
    description: "Content is analyzed and scored",
    icon: "📄",
  },
  {
    title: "Search Intent",
    description: "Intent patterns are identified",
    icon: "🔍",
  },
  {
    title: "Leads",
    description: "Qualified prospects emerge",
    icon: "🎯",
  },
]

export function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true })

  return (
    <section className="how-it-works" ref={ref}>
      <div className="section-container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          How the Organism Works
        </motion.h2>

        <div className="stages-grid">
          {stages.map((stage, index) => (
            <motion.div
              key={stage.title}
              className="stage-card"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              <div className="stage-icon">{stage.icon}</div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>

              {index < stages.length - 1 && (
                <div className="stage-arrow">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .how-it-works {
          padding: 6rem 2rem;
          background: linear-gradient(180deg, #0a1428 0%, #0f1f3d 100%);
          position: relative;
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

        .stages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          position: relative;
        }

        .stage-card {
          padding: 2rem;
          background: rgba(168, 85, 247, 0.05);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 12px;
          text-align: center;
          position: relative;
          transition: all 0.3s ease;
        }

        .stage-card:hover {
          background: rgba(168, 85, 247, 0.1);
          border-color: rgba(168, 85, 247, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(168, 85, 247, 0.2);
        }

        .stage-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .stage-card h3 {
          font-size: 1.5rem;
          color: #a855f7;
          margin: 1rem 0 0.5rem 0;
        }

        .stage-card p {
          color: #d8bfd8;
          font-size: 0.95rem;
        }

        .stage-arrow {
          position: absolute;
          right: -3rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          color: rgba(13, 148, 136, 0.5);
        }

        @media (max-width: 720px) {
          .stages-grid {
            grid-template-columns: 1fr;
          }

          .stage-arrow {
            display: none;
          }

          h2 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </section>
  )
}
