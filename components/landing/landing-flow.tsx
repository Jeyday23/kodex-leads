"use client";

import FlowArt, { FlowSection } from "@/components/flow-art";
import { HeroSection } from "./hero";
import { HowItWorksSection } from "./how-it-works";
import { FeaturesSection } from "./features";
import { ToolsSection } from "./tools";
import { SocialProofSection } from "./social-proof";
import { FaqSection } from "./faq";

export function LandingFlow() {
  return (
    <FlowArt aria-label="Kodex Leads">
      <FlowSection aria-label="Hero" className="bg-navy">
        <HeroSection />
      </FlowSection>

      <FlowSection aria-label="How it works" className="bg-white">
        <HowItWorksSection />
      </FlowSection>

      <FlowSection aria-label="Features" className="bg-bg-muted">
        <FeaturesSection />
      </FlowSection>

      <FlowSection aria-label="Free tools" className="bg-white">
        <ToolsSection />
      </FlowSection>

      <FlowSection aria-label="Why Kodex" className="bg-navy">
        <SocialProofSection />
      </FlowSection>

      <FlowSection aria-label="FAQ" className="bg-white">
        <FaqSection />
      </FlowSection>
    </FlowArt>
  );
}
