"use client";

import { Box, Container, Typography, Grid, Card, CardContent, Stack } from "@mui/material";
import { CheckCircle, Zap, BarChart3, Shield, Layers, Brain } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Fast Readiness Score",
    description: "Answer plain-language questions and get a practical score in minutes.",
  },
  {
    icon: BarChart3,
    title: "Priority Next Steps",
    description: "See whether to research, document controls, or move into a deeper review.",
  },
  {
    icon: Shield,
    title: "Official Sources",
    description: "Guidance links back to EU and regulator sources instead of unsupported claims.",
  },
  {
    icon: Zap,
    title: "No-Call First Step",
    description: "Start with a self-serve assessment before deciding whether you need help.",
  },
  {
    icon: Layers,
    title: "Multiple Frameworks",
    description: "Cover EU AI Act, GDPR and NIS2 entry points from one place.",
  },
  {
    icon: CheckCircle,
    title: "Lead and Admin Workflow",
    description: "Qualified results can route into admin review, follow-up and reporting.",
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
            A clearer first step for messy compliance questions
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#666", maxWidth: 500, mx: "auto" }}>
            The app is designed to move a visitor from uncertainty to a scored next action.
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
