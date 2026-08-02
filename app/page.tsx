"use client";

import { Box, Container, Typography, Button, Grid, Card, CardContent, Chip } from "@mui/material";
import { ArrowRight, CheckCircle, Zap, BarChart3, Shield, Layers } from "lucide-react";
import HeroSection from "./components/landing/HeroSection";
import FeaturesSection from "./components/landing/FeaturesSection";
import PricingSection from "./components/landing/PricingSection";
import CTASection from "./components/landing/CTASection";

export default function Home() {
  return (
    <Box sx={{ width: "100%", overflow: "hidden" }}>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
    </Box>
  );
}
