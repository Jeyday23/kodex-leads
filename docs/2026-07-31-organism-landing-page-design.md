# The Organism Landing Page Design

**Date**: 2026-07-31  
**Status**: Approved  
**Direction**: "Living Compliance System" — autonomous B2B SaaS landing page showing the system as a living organism with particle flows and neural networks.

## Visual Direction

**Hero Concept**: A pulsing, animated organism in the center of the screen. Regulations enter as glowing particles, flow through neural-like networks, and exit as qualified leads. The page itself demonstrates what Kodex Leads does: work autonomously without you.

**Color Palette** (from Kodex brand):
- Primary: Purple #A855F7 (neural networks, glows)
- Secondary: Navy #0F1F3D (background, depth)
- Accent: Teal #0D9488 (particle flows, success states)
- Neutral: Ivory #F7F4EF (text, cards)

**Motion Language**:
- Particle systems flow continuously
- Pulsing/breathing animations for core organism
- Scroll-triggered reveals on sections below
- Hover states trigger localized particle bursts
- Staggered animations for lead cards

## Page Structure

### 1. Hero Section: The Living Organism
- Full-width dark background
- Centered SVG/Canvas particle system (organism visualization)
- Particles continuously flow through network nodes
- Simple copy overlay: "Kodex Leads — Autonomous SEO That Works for You"
- Subtle scroll indicator at bottom
- Height: 100vh

### 2. How It Works: Four Stages
- Four columns revealing sequentially on scroll
- Each stage: input → process → output
- Particle flow visualizes the transformation
- Stages: Regulations → Pages → Search Intent → Leads

### 3. Live Results Section
- "See It In Action" heading
- 3-4 lead card examples cascade in on scroll
- Cards have glass-morphism effect (semi-transparent, frosted glass)
- Hover states trigger subtle particle effects
- Each card shows: company name, confidence score, recommended landing page

### 4. Three Pillars: Google / LLMs / Leads
- Interactive hover reveals mechanism behind each pillar
- Icons with animated pulse states
- Short copy explaining autonomy

### 5. CTA Section: "Activate the Organism"
- Dark background with gradient
- Large button with particle burst on hover
- Form: Email + Company Name (simple lead capture)
- Success state: particles celebrate

## Technical Implementation

**Dependencies to Add**:
- framer-motion (^11.0.0) — orchestrate animations
- lucide-react (^1.0.0) — SVG icons

**New Components**:
- ParticleOrganism.tsx — Canvas-based particle system (center hero)
- OrganismHero.tsx — Full hero section
- StageReveal.tsx — "How It Works" stage
- LeadCard.tsx — Interactive lead card with glass-morphism
- Features.tsx — Three pillars with hover reveals
- CTASection.tsx — Final call-to-action

**CSS Approach**:
- CSS custom properties for all animations (duration, easing, delays)
- Glassmorphism via backdrop-filter + semi-transparent backgrounds
- Gradient overlays for depth
- No utility CSS bloat — semantic, custom styles

**Animation Timing**:
- Particle speed: medium (creates "busy but purposeful" feeling)
- Scroll reveals: 600ms enter animations
- Hover states: 200ms snappy responses
- Breathing pulses: 3-4 second cycles

## Success Criteria

- ✅ Page loads with particle system animated immediately
- ✅ Particles flow smoothly (60fps, no jank)
- ✅ Scroll reveals trigger at right moments
- ✅ Hover states feel responsive and intentional
- ✅ Lead capture form functional
- ✅ Mobile responsive (720px breakpoint)
- ✅ LCP < 2.5s, CLS < 0.1
- ✅ No console errors
- ✅ Passes accessibility audit (WCAG AA minimum)

## Build Order

1. Add Framer Motion dependency
2. Create ParticleOrganism (canvas particle system)
3. Create OrganismHero with particle system
4. Build "How It Works" section
5. Build "Live Results" with lead cards
6. Build "Three Pillars" features
7. Build "Activate" CTA
8. Add responsive breakpoints
9. Performance optimization
10. Test locally, iterate on feel

---

**Design approved**: Jeremiah Matador  
**Implementation**: Claude Code  
