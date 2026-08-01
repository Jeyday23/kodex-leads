import { OrganismHero } from "./components/OrganismHero"
import { HowItWorks } from "./components/HowItWorks"
import { LiveResults } from "./components/LiveResults"
import { Features } from "./components/Features"
import { CTASection } from "./components/CTASection"

export default function Home() {
  return (
    <main className="organism-page">
      <OrganismHero />
      <HowItWorks />
      <LiveResults />
      <Features />
      <CTASection />
    </main>
  )
}
