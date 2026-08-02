"use client";

import { Box, Container, Typography, Button, Stack } from "@mui/material";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
        color: "white",
        py: { xs: 8, md: 10 },
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4} sx={{ textAlign: "center" }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            Ready to Get Compliant?
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              fontSize: { xs: "1.1rem", md: "1.2rem" },
              fontWeight: 400,
              opacity: 0.95,
            }}
          >
            Start your free compliance assessment today. No credit card required.
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
              Start Free Assessment
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
              View Compliance Deadlines
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
