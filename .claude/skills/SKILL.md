---
name: kodex-frontend-design
description: Use when building or editing any UI component, page, or layout in the Kodex projects. Enforces the Kodex design system — typography, spacing, colors, animation, and component patterns.
---

# Kodex Frontend Design System

Every UI decision follows these tokens. No random values.

## Color Tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `navy` | `#0F1F3D` | Headings, dark backgrounds, primary text |
| `purple` | `#A855F7` | Primary accent, CTAs, links, highlights |
| `purple-hover` | `#9333EA` | Hover state for purple elements |
| `teal` | `#0D9488` | Secondary accent, labels, badges |
| `ivory` | `#F7F4EF` | Warm light backgrounds |
| `text` | `#3d4a5c` | Body copy |
| `text-muted` | `#7a8599` | Secondary text, captions |
| `border` | `#dfe3ea` | Borders, dividers |
| `bg-muted` | `#f6f7f9` | Section backgrounds |

Use Tailwind theme tokens (`bg-navy`, `text-purple`, etc.) defined in `globals.css`. Never use raw hex in components.

## Typography Scale

Base: Geist Sans (`--font-geist-sans`). Mono: Geist Mono (`--font-geist-mono`).

| Element | Class | Size |
|---------|-------|------|
| Display | `text-5xl lg:text-6xl font-bold` | 48/60px |
| H1 | `text-4xl lg:text-5xl font-bold` | 36/48px |
| H2 | `text-3xl lg:text-4xl font-bold` | 30/36px |
| H3 | `text-xl font-bold` | 20px |
| Body | `text-base` | 16px |
| Small | `text-sm` | 14px |
| Caption | `text-xs font-mono uppercase tracking-widest` | 12px, monospace label |

Leading: `leading-tight` for headings, `leading-relaxed` for body.

## Spacing System (8px grid)

All spacing uses multiples of 8px via Tailwind's scale:

| Tailwind | px | Use for |
|----------|----|---------|
| `2` | 8px | Tight gaps (icon + text) |
| `3` | 12px | Small padding |
| `4` | 16px | Component padding |
| `6` | 24px | Card padding, section gaps |
| `8` | 32px | Between sections (mobile) |
| `10` | 40px | Section padding |
| `16` | 64px | Major section spacing (mobile) |
| `20` | 80px | Major section spacing (desktop) |
| `24` | 96px | Hero padding |

Section pattern: `py-16 lg:py-24` (64px mobile, 96px desktop).
Container: `max-w-[1200px] mx-auto px-6 lg:px-10`.

## Animation — Framer Motion

**Always use Framer Motion** for all animations. Never use CSS transitions for entrance/scroll animations.

### Standard patterns

```tsx
import { motion } from "framer-motion";

// Fade up on scroll (use for any section entering viewport)
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>

// Stagger children (use for card grids, feature lists)
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

<motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {items.map(item => (
    <motion.div key={item.id} variants={fadeUp}>...</motion.div>
  ))}
</motion.div>

// Hover lift (use for cards, interactive elements)
<motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>

// Scale tap (use for buttons)
<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
```

### Rules
- `viewport={{ once: true }}` — elements animate once, never re-trigger
- `margin: "-80px"` — trigger slightly before element enters viewport
- Respect `prefers-reduced-motion`: wrap in `useReducedMotion()` hook, set `transition={{ duration: 0 }}` when reduced
- Keep durations between 0.3s–0.6s. Nothing slower than 0.8s.
- Ease: `"easeOut"` for entrances, `"easeInOut"` for hover/tap

## Component Patterns

### Buttons
```
Primary:   rounded-full bg-purple text-white font-medium px-8 py-3.5 hover:bg-purple-hover
Secondary: rounded-full border border-border text-navy font-medium px-8 py-3.5 hover:border-purple/40
Ghost:     text-sm font-medium text-purple hover:text-purple-hover
```
Always wrap in `motion.button` or `motion(Link)` with `whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}`.

### Cards
```
rounded-xl border border-border p-6 hover:border-purple/40 hover:shadow-lg
```
Wrap in `motion.div` with `whileHover={{ y: -4 }}`.

### Section Labels
```
<p className="text-xs font-mono uppercase tracking-widest text-teal mb-4">Section Label</p>
```

### Section Headers
```
<h2 className="text-3xl lg:text-4xl font-bold text-navy mb-4">Title</h2>
<p className="text-text-muted max-w-2xl mx-auto">Subtitle</p>
```

## Anti-Patterns — DO NOT

- Use random hex codes — use tokens only
- Use CSS `@keyframes` or `transition` for scroll reveals — use Framer Motion
- Use font sizes outside the type scale
- Use spacing values not on the 8px grid
- Create generic "AI startup" aesthetic (no gradients-for-the-sake-of-gradients, no floating orbs, no mesh backgrounds)
- Use stock photos — prefer icons (Lucide) and clean illustrations
- Use more than 2 font weights per element (bold + regular)
- Animate everything — be selective, animate what draws attention to value
