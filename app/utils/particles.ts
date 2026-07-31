export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
}

export function createParticle(
  { x, y }: { x: number; y: number },
  opts: { life?: number; size?: number } = {}
): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 2 + Math.random() * 3
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: opts.life ?? 1,
    size: opts.size ?? 2 + Math.random() * 2,
  }
}

export function updateParticle(p: Particle): Particle {
  const decay = 0.01
  return {
    x: p.x + p.vx,
    y: p.y + p.vy,
    vx: p.vx * 0.98,
    vy: p.vy * 0.98,
    life: Math.max(0, p.life - decay),
    size: p.size,
  }
}

export function isParticleAlive(p: Particle): boolean {
  return p.life > 0
}
