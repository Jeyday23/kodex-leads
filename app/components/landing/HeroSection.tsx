"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
        <Stack spacing={4} sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            EU Compliance Made Simple
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
            Automated compliance assessments, deadline intelligence, and source-backed readiness
            paths for growth teams.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center" }}>
            <Button
              component={Link}
              href="/assess/eu-ai-act"
              variant="contained"
              sx={{
                backgroundColor: "white",
                color: "#667eea",
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
              Start Assessment
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
              View Deadlines
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
