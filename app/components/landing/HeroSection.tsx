"use client";

import { Box, Container, Typography, Button, Stack, Chip } from "@mui/material";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #10192d 0%, #0f766e 100%)",
        color: "white",
        py: { xs: 8, md: 12 },
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={4} sx={{ textAlign: "center", maxWidth: 860, mx: "auto" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "center", alignItems: "center" }}>
            {["Free readiness score", "EU AI Act, GDPR, NIS2", "Source-backed next steps"].map((label) => (
              <Chip
                key={label}
                icon={<CheckCircle2 size={16} />}
                label={label}
                sx={{ color: "white", borderColor: "rgba(255,255,255,0.42)" }}
                variant="outlined"
              />
            ))}
          </Stack>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Know your EU compliance risk before it becomes a sales blocker.
          </Typography>

          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: "1.1rem", md: "1.3rem" },
              fontWeight: 400,
              opacity: 0.95,
              lineHeight: 1.6,
            }}
          >
            Kodex gives startups and growth teams a fast readiness score, clear compliance deadlines, and source-backed next steps for the EU AI Act, GDPR and NIS2.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
            <Button
              component={Link}
              href="/assess/eu-ai-act"
              variant="contained"
              sx={{
                backgroundColor: "white",
                color: "#0f766e",
                py: 1.5,
                px: 4,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
              endIcon={<ArrowRight size={20} />}
            >
              Start Free Check
            </Button>

            <Button
              component={Link}
              href="/deadlines/eu-ai-act"
              variant="outlined"
              sx={{
                borderColor: "white",
                color: "white",
                py: 1.5,
                px: 4,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 1,
                "&:hover": {
                  borderColor: "white",
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              See Key Deadlines
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
