"use client"

import { motion } from "framer-motion"
import { useState } from "react"

export function CTASection() {
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !company) return

    setLoading(true)
    try {
      const res = await fetch("/api/leads/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      })

      if (res.ok) {
        setSubmitted(true)
        setEmail("")
        setCompany("")
        setTimeout(() => setSubmitted(false), 5000)
      }
    } catch (error) {
      console.error("Submission error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="cta-section">
      <motion.div
        className="cta-container"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h2>Activate the Organism</h2>
        <p>Join founders and compliance teams building the future of autonomous lead generation.</p>

        {submitted ? (
          <motion.div
            className="success-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p>✓ Thanks! We'll be in touch soon.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="cta-form">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Activating..." : "Activate Now"}
            </motion.button>
          </form>
        )}
      </motion.div>

      <style jsx>{`
        .cta-section {
          padding: 6rem 2rem;
          background: linear-gradient(135deg, #0f1f3d 0%, #0a1428 100%);
          position: relative;
          overflow: hidden;
        }

        .cta-container {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }

        h2 {
          font-size: 2.5rem;
          color: #f7f4ef;
          margin-bottom: 1rem;
          text-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
        }

        .cta-container > p {
          color: #d8bfd8;
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        .cta-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        input {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 8px;
          color: #f7f4ef;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        input::placeholder {
          color: rgba(215, 191, 215, 0.5);
        }

        input:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(168, 85, 247, 0.5);
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
        }

        button {
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #a855f7 0%, #0d9488 100%);
          color: #f7f4ef;
          border: none;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        button:hover:not(:disabled) {
          box-shadow: 0 12px 24px rgba(168, 85, 247, 0.4);
          transform: translateY(-2px);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-message {
          padding: 1.5rem;
          background: rgba(13, 148, 136, 0.1);
          border: 1px solid rgba(13, 148, 136, 0.3);
          border-radius: 8px;
          color: #0d9488;
          font-size: 1.1rem;
        }

        @media (max-width: 720px) {
          h2 {
            font-size: 1.8rem;
          }

          .cta-form {
            gap: 0.75rem;
          }
        }
      `}</style>
    </section>
  )
}
