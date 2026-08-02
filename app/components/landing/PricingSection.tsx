"use client";

import { Box, Container, Typography, Card, CardContent, Button, Stack, Grid, Chip } from "@mui/material";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started",
    features: ["1 assessment per month", "Basic compliance report", "Email support", "AI-powered guidance"],
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing teams",
    highlighted: true,
    features: [
      "Unlimited assessments",
      "Advanced analytics",
      "Priority email support",
      "Custom compliance paths",
      "Team collaboration",
      "Source verification",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "On-premise option",
      "Advanced security",
    ],
  },
];

export default function PricingSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "white" }}>
      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="overline" sx={{ color: "#667eea", fontWeight: 700, fontSize: "0.9rem" }}>
            PRICING
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 800,
              color: "#1a202c",
            }}
          >
            Simple, Transparent Pricing
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "#666", maxWidth: 500, mx: "auto" }}>
            Choose the plan that fits your compliance needs.
          </Typography>
        </Stack>

        <Grid container spacing={3} sx={{ justifyContent: "center" }}>
          {plans.map((plan, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                sx={{
                  height: "100%",
                  border: plan.highlighted ? "2px solid #667eea" : "1px solid #e2e8f0",
                  backgroundColor: plan.highlighted ? "#f7f8ff" : "white",
                  position: "relative",
                  transform: plan.highlighted ? "scale(1.05)" : "scale(1)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: plan.highlighted
                      ? "0 20px 60px rgba(102, 126, 234, 0.2)"
                      : "0 10px 40px rgba(0,0,0,0.1)",
                  },
                }}
              >
                {plan.highlighted && (
                  <Chip
                    label="MOST POPULAR"
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#667eea",
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  />
                )}
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={3} sx={{ height: "100%", justifyContent: "space-between" }}>
                    <Stack spacing={2}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        {plan.description}
                      </Typography>
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "2.5rem",
                            fontWeight: 800,
                            color: "#1a202c",
                          }}
                        >
                          {plan.price}
                        </Typography>
                        {plan.period && (
                          <Typography variant="body2" sx={{ color: "#666" }}>
                            {plan.period}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    <Stack spacing={2}>
                      <Stack spacing={1.5}>
                        {plan.features.map((feature, i) => (
                          <Stack direction="row" spacing={2} key={i} sx={{ alignItems: "flex-start" }}>
                            <Check size={20} color="#667eea" style={{ marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: "#666" }}>
                              {feature}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        component={Link}
                        href="/assess/eu-ai-act"
                        fullWidth
                        variant={plan.highlighted ? "contained" : "outlined"}
                        sx={{
                          py: 1.5,
                          fontWeight: 600,
                          textTransform: "none",
                          backgroundColor: plan.highlighted ? "#667eea" : undefined,
                          color: plan.highlighted ? "white" : "#667eea",
                          borderColor: "#667eea",
                          "&:hover": {
                            backgroundColor: plan.highlighted ? "#5568d3" : "rgba(102, 126, 234, 0.05)",
                          },
                        }}
                      >
                        Get Started
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
