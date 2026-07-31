import assert from "node:assert/strict"
import { test } from "node:test"
import { createParticle, updateParticle, isParticleAlive } from "../app/utils/particles"

test('createParticle creates particle with random velocity', () => {
  const particle = createParticle({ x: 100, y: 100 })
  assert.equal(particle.x, 100)
  assert.equal(particle.y, 100)
  assert.ok(particle.vx !== undefined)
  assert.ok(particle.vy !== undefined)
  assert.equal(particle.life, 1)
})

test('updateParticle moves particle and decays life', () => {
  const particle = createParticle({ x: 0, y: 0 })
  const updated = updateParticle(particle)
  assert.notEqual(updated.x, 0)
  assert.ok(updated.life < 1)
})

test('isParticleAlive returns false when life <= 0', () => {
  const deadParticle = { x: 0, y: 0, vx: 0, vy: 0, life: -0.1, size: 2 }
  assert.equal(isParticleAlive(deadParticle), false)
})
