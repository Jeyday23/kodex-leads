"use client"

import { useEffect, useRef } from "react"
import { createParticle, updateParticle, isParticleAlive, Particle } from "@/app/utils/particles"

export function ParticleOrganism() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with closure over ctx
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    handleResize()
    window.addEventListener("resize", handleResize)

    // Center point for organism
    const centerX = canvas.width / 2 / window.devicePixelRatio
    const centerY = canvas.height / 2 / window.devicePixelRatio

    // Animation loop with closure over ctx
    const animate = () => {
      // Clear canvas with slight fade trail
      ctx.fillStyle = "rgba(15, 31, 61, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Spawn new particles occasionally
      if (Math.random() < 0.1) {
        const angle = Math.random() * Math.PI * 2
        const distance = 60
        const x = centerX + Math.cos(angle) * distance
        const y = centerY + Math.sin(angle) * distance
        particlesRef.current.push(createParticle({ x, y }, { size: 2 + Math.random() * 1 }))
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(isParticleAlive)
      particlesRef.current.forEach((p) => {
        const updated = updateParticle(p)
        Object.assign(p, updated)

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, `rgba(168, 85, 247, ${p.life * 0.8})`)
        gradient.addColorStop(1, `rgba(168, 85, 247, 0)`)

        ctx.fillStyle = gradient
        ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4)
      })

      // Draw organism center (pulsing circle)
      const pulseScale = 1 + Math.sin(Date.now() / 1000) * 0.1
      ctx.fillStyle = "rgba(168, 85, 247, 0.6)"
      ctx.beginPath()
      ctx.arc(centerX, centerY, 15 * pulseScale, 0, Math.PI * 2)
      ctx.fill()

      // Draw connecting lines to spawn points
      const spawnDistance = 60
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Date.now() / 5000
        const x = centerX + Math.cos(angle) * spawnDistance
        const y = centerY + Math.sin(angle) * spawnDistance

        ctx.strokeStyle = `rgba(168, 85, 247, 0.3)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.stroke()

        // Draw spawn nodes
        ctx.fillStyle = `rgba(13, 148, 136, 0.5)`
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  )
}
