import { OrganismHero } from "./components/OrganismHero"
import { HowItWorks } from "./components/HowItWorks"
import { CTASection } from "./components/CTASection"

export default function Home() {
  return (
    <main className="organism-page">
      <OrganismHero />
      <HowItWorks />
      <CTASection />
    </main>
  )
}
