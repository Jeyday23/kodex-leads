"use client";

import { Box, Container, Typography, Grid, Card, CardContent, Stack } from "@mui/material";
import { CheckCircle, Zap, BarChart3, Shield, Layers, Brain } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Assessment",
    description: "Automated compliance evaluation using advanced AI to identify gaps and risks.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description: "Track compliance progress with live metrics and actionable insights.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and compliance with data protection regulations.",
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description: "Get immediate recommendations tailored to your business.",
  },
  {
    icon: Layers,
    title: "Multi-Framework Support",
    description: "Support for EU AI Act, GDPR, NIS2, and more frameworks.",
  },
  {
    icon: CheckCircle,
    title: "Source Verification",
    description: "All recommendations backed by official regulatory sources.",
  },
];

export default function FeaturesSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "#f8f9fa" }}>
      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="overline" sx={{ color: "#667eea", fontWeight: 700, fontSize: "0.9rem" }}>
            FEATURES
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 800,
              color: "#1a202c",
            }}
          >
            Compliance Simplified
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#666", maxWidth: 500, mx: "auto" }}>
            Everything you need to understand and meet EU regulatory requirements.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card
                  sx={{
                    height: "100%",
                    border: "1px solid #e2e8f0",
                    backgroundColor: "white",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          backgroundColor: "#667eea",
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={24} color="white" />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#666", lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
