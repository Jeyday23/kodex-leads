"use client";

import React, { useState } from "react";
import { useDashboardMetrics } from "@/app/hooks/useDashboardMetrics";

interface Agent {
  id: string;
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "in-progress" | "scanning";
  badge?: string;
  metric?: string;
}

interface Lead {
  id: string;
  company: string;
  score: number;
  tags: string[];
  location: string;
  activity: string;
}

interface ContentMetric {
  label: string;
  value: string | number;
  icon: string;
  type?: "metric" | "badge";
  subtext?: string;
}

export default function DashboardPage() {
  const { data, loading } = useDashboardMetrics();
  const [agentModeActive, setAgentModeActive] = useState(true);

  const metrics = data?.metrics || {
    totalLeads: 0,
    completed: 0,
    conversion: 0,
    pending: 0,
  };

  const agentFeed: Agent[] = [
    {
      id: "1",
      icon: "public",
      title: "Posting regulatory summary to r/Compliance",
      description: 'Automated outreach for "EU AI Act Implementation Guide". Contextual response generated for thread #8421.',
      timestamp: "Just now",
      status: "success",
      badge: "SUCCESS",
      metric: "Engagement Score: 8.4/10",
    },
    {
      id: "2",
      icon: "database",
      title: "Indexing LLM Directories (Perplexity/ChatGPT)",
      description: 'Pushing 4 new authority signals to verified knowledge silos for "GDPR for SMBs" cluster.',
      timestamp: "2m ago",
      status: "in-progress",
      badge: "IN-PROGRESS",
      metric: "64% Latency: 12ms",
    },
    {
      id: "3",
      icon: "search_check",
      title: "Scanning LinkedIn for GDPR leads",
      description: "Filtering decision-makers in German Fintech sector. 12 potential leads identified with high intent triggers.",
      timestamp: "15m ago",
      status: "scanning",
      badge: "SCANNING",
      metric: "Processed 240/1200 profiles",
    },
  ];

  const leads: Lead[] = [
    {
      id: "1",
      company: "Finserv Solutions Ltd",
      score: 94,
      tags: ["GDPR", "EU AI ACT"],
      location: "London, UK",
      activity: "Active 5m ago",
    },
    {
      id: "2",
      company: "Berlin AI Dynamics",
      score: 88,
      tags: ["COMPLIANCE", "SaaS"],
      location: "Berlin, DE",
      activity: "Active 1h ago",
    },
    {
      id: "3",
      company: "Nordic Cloud Systems",
      score: 82,
      tags: ["PRIVACY"],
      location: "Oslo, NO",
      activity: "Active 3h ago",
    },
  ];

  const contentMetrics: ContentMetric[] = [
    { label: "SEO OPTIMIZATION", value: "94/100", icon: "trending_up", type: "metric" },
    { label: "READABILITY", value: "Grade 11", icon: "spellcheck", type: "metric" },
  ];

  const seoHealthMetrics = [
    {
      title: "EU AI Act compliance",
      volume: "Vol: 12.4k/mo",
      rank: "#2",
      change: "+4 positions",
      icon: "keyboard_double_arrow_up",
    },
    {
      title: "GDPR for SMBs",
      volume: "Vol: 5.2k/mo",
      rank: "#5",
      change: "+1 position",
      icon: "keyboard_arrow_up",
    },
    {
      title: "Data privacy audits",
      volume: "Vol: 2.1k/mo",
      rank: "#12",
      change: "Stable",
      icon: "remove",
    },
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/20 text-green-400";
      case "in-progress":
        return "bg-blue-500/20 text-blue-400 animate-pulse";
      case "scanning":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "check_circle";
      case "in-progress":
        return "loop";
      case "scanning":
        return "schedule";
      default:
        return "help";
    }
  };

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sovereign Intelligence | Command Center</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --color-inverse-on-surface: #2f3034;
            --color-on-background: #e2e2e6;
            --color-primary-fixed-dim: #b9c7e1;
            --color-secondary-fixed: #ffdada;
            --color-on-error-container: #ffdad6;
            --color-on-error: #690005;
            --color-on-surface: #e2e2e6;
            --color-surface-variant: #333538;
            --color-surface: #111316;
            --color-secondary-fixed-dim: #ffb3b5;
            --color-surface-container-highest: #333538;
            --color-on-surface-variant: #c5c6cd;
            --color-surface-dim: #111316;
            --color-inverse-surface: #e2e2e6;
            --color-on-tertiary-fixed: #0e1c2e;
            --color-surface-container-high: #282a2d;
            --color-secondary-container: #861f2e;
            --color-on-primary: #243145;
            --color-on-tertiary: #243144;
            --color-background: #111316;
            --color-tertiary: #bac7e0;
            --color-tertiary-fixed: #d6e3fc;
            --color-surface-container-lowest: #0c0e11;
            --color-on-secondary-fixed: #40000c;
            --color-tertiary-fixed-dim: #bac7e0;
            --color-on-tertiary-container: #77849a;
            --color-error-container: #93000a;
            --color-on-primary-fixed-variant: #3a475c;
            --color-outline-variant: #44474c;
            --color-on-secondary: #660419;
            --color-on-tertiary-fixed-variant: #3a475c;
            --color-outline: #8f9097;
            --color-secondary: #ffb3b5;
            --color-surface-tint: #b9c7e1;
            --color-surface-bright: #37393d;
            --color-on-secondary-fixed-variant: #861f2e;
            --color-on-primary-fixed: #0e1c2f;
            --color-surface-container-low: #1a1c1f;
            --color-inverse-primary: #525f75;
            --color-primary-fixed: #d5e3fd;
            --color-tertiary-container: #0d1b2d;
            --color-on-primary-container: #76849b;
            --color-error: #ffb4ab;
            --color-surface-container: #1e2023;
            --color-primary: #b9c7e1;
            --color-primary-container: #0d1b2e;
            --color-on-secondary-container: #ff989d;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            background-color: #111316;
            color: #e2e2e6;
            overflow-x: hidden;
            font-family: "Inter", sans-serif;
          }

          .font-headline-lg {
            font-family: "Hanken Grotesk", sans-serif;
          }

          .font-label-caps {
            font-family: "JetBrains Mono", sans-serif;
          }

          .glass-card {
            background: rgba(30, 32, 35, 0.4);
            backdrop-filter: blur(12px);
            border: 1px solid #44474c;
            transition: all 0.2s ease-in-out;
          }

          .glass-card:hover {
            background: rgba(40, 42, 45, 0.6);
            box-shadow: 0 0 12px rgba(185, 199, 225, 0.1);
            border-color: #b9c7e1;
          }

          .hairline-divider {
            height: 1px;
            background: #44474c;
            width: 100%;
          }

          ::-webkit-scrollbar {
            width: 6px;
          }

          ::-webkit-scrollbar-track {
            background: #111316;
          }

          ::-webkit-scrollbar-thumb {
            background: #44474c;
            border-radius: 3px;
          }

          .animate-pulse-custom {
            animation: pulse-custom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          @keyframes pulse-custom {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          .metric-badge-success {
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
          }

          .metric-badge-progress {
            background: rgba(185, 199, 225, 0.2);
            color: #b9c7e1;
            animation: pulse-custom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          .metric-badge-scanning {
            background: rgba(197, 198, 205, 0.1);
            color: #c5c6cd;
          }
        `}</style>
      </head>
      <body className="font-body-md text-body-md">
        {/* Side Navigation Bar */}
        <aside className="fixed left-0 top-0 h-full w-[280px] border-r border-[#44474c] bg-[#0c0e11] flex flex-col py-6 z-[100]">
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0d1b2e] rounded-xl flex items-center justify-center overflow-hidden border border-[#44474c]">
                <span className="material-symbols-outlined text-[24px] text-[#b9c7e1]">security</span>
              </div>
              <div>
                <h1 className="font-headline-lg text-[20px] font-bold text-[#e2e2e6] leading-tight">Sovereign Intel</h1>
                <p className="font-label-caps text-[10px] text-[#8f9097] uppercase">Authority Engine</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <div className="px-2 mb-2 font-label-caps text-[11px] text-[#8f9097] opacity-50 uppercase">Workspace</div>

            {[
              { icon: "terminal", label: "Command", active: true },
              { icon: "group", label: "Leads", active: false },
              { icon: "show_chart", label: "SEO", active: false },
              { icon: "hub", label: "Integrations", active: false },
              { icon: "menu_book", label: "Knowledge", active: false },
            ].map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  item.active
                    ? "bg-[#861f2e] text-[#ff989d] font-bold"
                    : "text-[#c5c6cd] hover:bg-[#333538] hover:text-[#e2e2e6]"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-body-md">{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="px-4 mt-auto space-y-1">
            <div className="p-4 bg-[#282a2d] rounded-xl mb-4 border border-[#44474c]/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#ffb3b5] animate-pulse-custom"></span>
                <span className="font-label-caps text-[10px]">Autonomous Mode Active</span>
              </div>
              <p className="text-[11px] text-[#8f9097] leading-tight">Engine scanning for EU AI Act compliance leads in Western Europe.</p>
            </div>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#c5c6cd] hover:text-[#e2e2e6] transition-colors">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="font-body-md">Settings</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#c5c6cd] hover:text-[#e2e2e6] transition-colors">
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
              <span className="font-body-md">Support</span>
            </a>
          </div>
        </aside>

        {/* Top App Bar */}
        <header className="fixed top-0 right-0 w-[calc(100%-280px)] h-16 bg-[#111316]/80 backdrop-blur-xl border-b border-[#44474c] z-50 flex justify-between items-center px-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="font-label-caps text-[12px] tracking-widest text-[#e2e2e6]">SOVEREIGN INTEL</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-[#b9c7e1] border-b-2 border-[#b9c7e1] pb-1 font-medium text-[14px]">
                Dashboard
              </a>
              <a href="#" className="text-[#c5c6cd] hover:text-[#b9c7e1] transition-all text-[14px]">
                Activity
              </a>
              <a href="#" className="text-[#c5c6cd] hover:text-[#b9c7e1] transition-all text-[14px]">
                Analytics
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8f9097] text-[18px]">search</span>
              <input
                className="bg-[#0c0e11] border border-[#44474c] rounded-lg pl-10 pr-4 py-1.5 text-[14px] w-64 focus:ring-1 focus:ring-[#b9c7e1] focus:border-[#b9c7e1] outline-none transition-all"
                placeholder="Search intelligence data..."
                type="text"
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#282a2d] rounded-full border border-[#44474c]">
              <span className="font-label-caps text-[10px]">Agent Mode</span>
              <button
                onClick={() => setAgentModeActive(!agentModeActive)}
                className="w-8 h-4 bg-[#861f2e] rounded-full relative cursor-pointer active:opacity-70 transition-all"
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-[#ffb3b5] rounded-full transition-all ${agentModeActive ? "right-0.5" : "left-0.5"}`}></div>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-2 border-l border-[#44474c] pl-4">
              <button className="material-symbols-outlined text-[#c5c6cd] hover:text-[#b9c7e1] transition-all cursor-pointer">notifications</button>
              <button className="material-symbols-outlined text-[#c5c6cd] hover:text-[#b9c7e1] transition-all cursor-pointer">bolt</button>
              <div className="w-8 h-8 rounded-full bg-[#333538] overflow-hidden cursor-pointer border border-[#44474c]">
                <div className="w-full h-full bg-gradient-to-br from-[#b9c7e1]/50 to-[#861f2e]/50"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="ml-[280px] pt-24 px-8 pb-6 min-h-screen">
          {/* Hero Section */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="font-label-caps text-[#ffb3b5] mb-1 uppercase text-[12px]">Sovereign Command Center</p>
                <h2 className="font-headline-lg text-[40px] text-[#e2e2e6] tracking-tight font-bold">Search authority, at a glance.</h2>
                <p className="text-[#c5c6cd] mt-2 max-w-2xl font-body-md text-[16px]">
                  Build Sovereign Intel into the most cited source for operational EU compliance and AI regulation management.
                </p>
              </div>
              <button className="bg-[#ffb3b5] hover:bg-[#ff989d] text-[#40000c] px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#ffb3b5]/10">
                <span className="material-symbols-outlined text-[18px]">add</span>
                New Opportunity
              </button>
            </div>

            {/* Quick Metrics Bento */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Search Visibility",
                  value: "18.4%",
                  change: "+3.2%",
                  sublabel: "Google + Bing Aggregate",
                },
                {
                  label: "LLM Citation Share",
                  value: "29.1%",
                  change: "+6.8%",
                  sublabel: "5 engines monitored",
                },
                {
                  label: "Qualified Traffic",
                  value: "1,284",
                  change: "+14.6%",
                  sublabel: "Direct from Knowledge Hub",
                },
                {
                  label: "Content Pipeline",
                  value: "24",
                  change: "8 READY",
                  sublabel: "Drafts and refreshes",
                  isBadge: true,
                },
              ].map((metric, idx) => (
                <div key={idx} className="glass-card p-6 rounded-xl">
                  <p className="font-label-caps text-[11px] text-[#8f9097] mb-2 uppercase">{metric.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-[28px] font-bold">{metric.value}</span>
                    <span className={`font-label-caps text-[11px] flex items-center gap-0.5 ${metric.isBadge ? "bg-[#ffb3b5]/10 text-[#ffb3b5] px-2 py-0.5 rounded" : "text-[#ffb3b5]"}`}>
                      {!metric.isBadge && <span className="material-symbols-outlined text-[14px]">arrow_upward</span>}
                      {metric.change}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8f9097] mt-1">{metric.sublabel}</p>
                  <div className="mt-4 h-12 flex items-end gap-1">
                    {[40, 60, 55, 75, 65, 85, 100].map((h, i) => (
                      <div key={i} className="bg-[#b9c7e1]/50 w-full rounded-sm" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-12 gap-4">
            {/* Central Panel: Autonomous Agent Feed */}
            <div className="col-span-8 flex flex-col gap-4">
              <div className="glass-card rounded-xl overflow-hidden flex flex-col h-[500px]">
                <div className="p-6 border-b border-[#44474c] flex justify-between items-center bg-[#1a1c1f]/50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ffb3b5]">sensors</span>
                    <h3 className="font-headline-lg text-[18px]">Autonomous Agent Feed</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 font-label-caps text-[10px] text-[#8f9097]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb3b5] animate-pulse-custom"></span>
                      LIVE PROCESSING
                    </span>
                    <button className="material-symbols-outlined text-[#8f9097] hover:text-[#e2e2e6] transition-colors">filter_list</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {agentFeed.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-[#282a2d]/30 border border-[#44474c]/30">
                      <div className="mt-1 w-8 h-8 rounded bg-[#b9c7e1]/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-[#b9c7e1]">{item.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1 gap-4">
                          <span className="font-body-md font-bold text-[#e2e2e6]">{item.title}</span>
                          <span className="font-label-caps text-[10px] text-[#8f9097] flex-shrink-0">{item.timestamp}</span>
                        </div>
                        <p className="text-body-md text-[#c5c6cd] mb-2 text-[14px]">{item.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-label-caps rounded ${getStatusClass(item.status)}`}>{item.badge}</span>
                          <span className="text-[11px] font-label-caps text-[#8f9097]">{item.metric}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Generation Preview */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ffb3b5]">edit_note</span>
                    <h3 className="font-headline-lg text-[18px]">Content Generation Preview</h3>
                  </div>
                  <span className="bg-[#861f2e] text-[#ff989d] px-3 py-1 rounded-full font-label-caps text-[10px]">DRAFTING IN REAL-TIME</span>
                </div>
                <div className="bg-[#0c0e11] p-6 rounded-lg border border-[#44474c] relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#333538] flex items-center justify-center border border-[#44474c]">
                      <span className="material-symbols-outlined text-[#ffb3b5]">auto_fix_high</span>
                    </div>
                    <div>
                      <h4 className="font-body-md font-bold text-[#e2e2e6]">EU AI Act Compliance Guide</h4>
                      <p className="text-body-md text-[#8f9097]">Targeting: High-Intent Legal Keywords</p>
                    </div>
                  </div>
                  <div className="space-y-2 opacity-50">
                    <div className="h-2.5 bg-[#44474c] rounded-full w-full"></div>
                    <div className="h-2.5 bg-[#44474c] rounded-full w-[90%]"></div>
                    <div className="h-2.5 bg-[#44474c] rounded-full w-[95%]"></div>
                    <div className="h-2.5 bg-[#44474c] rounded-full w-[40%]"></div>
                  </div>
                  <div className="mt-4 p-3 bg-[#861f2e]/10 border-l-2 border-[#ffb3b5] rounded-r text-[13px] text-[#ffb3b5] italic">
                    "To remain compliant, enterprise users must categorize AI systems into risk levels as defined in Title II..."
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0c0e11] to-transparent"></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {contentMetrics.map((metric, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-[#282a2d] border border-[#44474c]">
                      <p className="font-label-caps text-[11px] text-[#8f9097] mb-1">{metric.label}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-body-md text-[16px] text-[#e2e2e6]">{metric.value}</span>
                        <span className="material-symbols-outlined text-[18px] text-[#b9c7e1]">{metric.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="col-span-4 flex flex-col gap-4">
              {/* Lead Pipeline */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline-lg text-[18px]">Lead Pipeline</h3>
                  <span className="material-symbols-outlined text-[#8f9097] text-[20px]">more_vert</span>
                </div>
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <div key={lead.id} className="p-4 rounded-xl bg-[#1a1c1f] border border-[#44474c] hover:border-[#ffb3b5] transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-body-md text-[16px] font-bold group-hover:text-[#ffb3b5] transition-colors">{lead.company}</h5>
                        <span className="font-body-md text-[#ffb3b5] text-[14px]">{lead.score}/100</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {lead.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#44474c]/30 text-[#c5c6cd] text-[10px] font-label-caps rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#8f9097]">
                        <span>{lead.location}</span>
                        <span>{lead.activity}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2.5 border border-[#44474c] text-[#c5c6cd] hover:bg-[#282a2d] hover:text-[#e2e2e6] rounded-lg font-bold transition-colors text-body-md">
                  View Full Pipeline
                </button>
              </div>

              {/* Integration Hub */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-headline-lg text-[18px] mb-6">Integration Hub</h3>
                <div className="grid grid-cols-4 gap-4">
                  {["search", "person_add", "share_reviews", "forum", "terminal", "mail", "analytics", "add"].map((icon, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-xl bg-[#282a2d] border border-[#44474c] flex items-center justify-center hover:bg-[#861f2e]/10 hover:border-[#ffb3b5] transition-all cursor-pointer group"
                    >
                      <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform text-[#8f9097] group-hover:text-[#ffb3b5]">{icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Health Meter */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-headline-lg text-[18px] mb-6">SEO Health Meter</h3>
                <div className="space-y-4">
                  {seoHealthMetrics.map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-body-lg font-bold text-[14px]">{metric.title}</p>
                          <p className="text-[11px] font-label-caps text-[#8f9097]">{metric.volume}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-body-md text-[#ffb3b5] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">{metric.icon}</span>
                            {metric.rank}
                          </span>
                          <span className="text-[10px] text-[#8f9097]">{metric.change}</span>
                        </div>
                      </div>
                      {idx < seoHealthMetrics.length - 1 && <div className="hairline-divider"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <script>{`
          // Micro-interactions
          document.addEventListener('DOMContentLoaded', () => {
            // Add click handlers for interactive elements
            document.querySelectorAll('button').forEach(btn => {
              btn.addEventListener('click', (e) => {
                if (e.target.closest('.active\\\\:scale-95')) {
                  e.currentTarget.style.transform = 'scale(0.95)';
                  setTimeout(() => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }, 100);
                }
              });
            });
          });
        `}</script>
      </body>
    </html>
  );
}
