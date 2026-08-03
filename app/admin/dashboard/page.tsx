"use client";

import { Box, Container, Grid, Stack, Typography, Card, CardContent, CircularProgress } from "@mui/material";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboardMetrics } from "@/app/hooks/useDashboardMetrics";

const StatCard = ({
  icon: Icon,
  title,
  value,
  change,
  loading,
}: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  change: number;
  loading?: boolean;
}) => (
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
            {loading ? <CircularProgress size={20} /> : <Icon size={20} color="#667eea" />}
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1a202c" }}>
          {loading ? "-" : value}
        </Typography>
        <Typography variant="caption" sx={{ color: change > 0 ? "#10b981" : "#ef4444" }}>
          {loading ? "Loading..." : `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}% from last month`}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { data, loading, error } = useDashboardMetrics();

  const metrics = data?.metrics || {
    totalLeads: 0,
    completed: 0,
    conversion: 0,
    pending: 0,
  };

  const monthlyTrend = data?.monthlyTrend || [];
  const breakdownData = [
    { name: "Completed", value: metrics.completed, fill: "#10b981" },
    { name: "Pending", value: metrics.pending, fill: "#fbbf24" },
  ];

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
              {error && <span style={{ color: "#ef4444", marginLeft: 8 }}>Error: {error}</span>}
            </Typography>
          </Stack>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                icon={Users}
                title="Total Leads"
                value={metrics.totalLeads.toLocaleString()}
                change={12}
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                icon={CheckCircle}
                title="High Quality"
                value={metrics.completed.toLocaleString()}
                change={8}
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                icon={TrendingUp}
                title="Conversion"
                value={`${metrics.conversion}%`}
                change={3}
                loading={loading}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                icon={AlertCircle}
                title="Pending"
                value={metrics.pending.toLocaleString()}
                change={-5}
                loading={loading}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Lead Growth Trend (6 Months)
                  </Typography>
                  {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyTrend}>
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
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ border: "1px solid #e2e8f0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Quality Breakdown
                  </Typography>
                  {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={breakdownData} layout="vertical">
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
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
