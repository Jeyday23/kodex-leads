"use client";

import { Box, Container, Grid, Stack, Typography, Card, CardContent } from "@mui/material";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const mockMetrics = [
  { name: "Jan", leads: 120, completed: 45 },
  { name: "Feb", leads: 150, completed: 62 },
  { name: "Mar", leads: 200, completed: 89 },
  { name: "Apr", leads: 280, completed: 145 },
  { name: "May", leads: 350, completed: 198 },
  { name: "Jun", leads: 420, completed: 267 },
];

const StatCard = ({ icon: Icon, title, value, change }: { icon: LucideIcon; title: string; value: string; change: number }) => (
  <Card sx={{ border: "1px solid #e2e8f0" }}>
    <CardContent sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Typography variant="body2" sx={{ color: "#666", fontWeight: 500 }}>
            {title}
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              backgroundColor: "#f0f4ff",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color="#667eea" />
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a202c" }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: change > 0 ? "#10b981" : "#ef4444" }}>
          {change > 0 ? "↑" : "↓"} {Math.abs(change)}% from last month
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  return (
    <Box sx={{ py: 4, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a202c" }}>
              Compliance Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              Track your compliance progress and assessment metrics.
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard icon={Users} title="Total Leads" value="1,247" change={12} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard icon={CheckCircle} title="Completed" value="756" change={8} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard icon={TrendingUp} title="Conversion" value="60.6%" change={3} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard icon={AlertCircle} title="Pending" value="491" change={-5} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Lead Growth Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mockMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="#667eea"
                        strokeWidth={2}
                        dot={{ fill: "#667eea", r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Completion Breakdown
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: "Completed", value: 756, fill: "#10b981" },
                        { name: "Pending", value: 491, fill: "#fbbf24" },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#999" />
                      <YAxis dataKey="name" type="category" stroke="#999" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="value" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
