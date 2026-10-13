"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Shield,
  Check,
  Zap,
  Sliders,
  ChevronRight,
  Sparkles,
  Building2,
  Users,
  Timer,
  BookOpen,
  Calendar,
  X,
  Trophy,
  Activity,
  Award,
  Flame,
  Play,
  ArrowRight,
  CreditCard,
  Lock,
  CheckCircle2,
  Minus,
  HelpCircle,
  FileText,
} from "lucide-react";

export default function PricingPage() {
  // League interactive slider
  const [teamCount, setTeamCount] = useState<number>(8);
  const baseLeagueFee = 40;
  const perTeamFee = 15;
  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  // Active comparison tab / category filter
  const [activeMatrixTab, setActiveMatrixTab] = useState<"all" | "stats" | "playbook" | "league">("all");

  const [showDevelopmentNotice, setShowDevelopmentNotice] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [leagueShortcode, setLeagueShortcode] = useState("");
  const [leagueColor, setLeagueColor] = useState("#3ca505");
  const [isSubmittingLeague, setIsSubmittingLeague] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamShortcode, setTeamShortcode] = useState("");
  const [teamIcon, setTeamIcon] = useState("shield");
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  const handleSubscribeLeague = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLeagueModalOpen(false);
    setShowDevelopmentNotice(true);
  };

  const handleSubscribeTeam = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTeamModalOpen(false);
    setShowDevelopmentNotice(true);
  };

  // Exact 6 Team Features from Public Home Page
  const teamFeaturesList = [
    {
      icon: Play,
      badge: "Dynamic Play-by-Play Wizard",
      title: "Asynchronous Game Logging",
      description:
        "Log games and scrimmages with access to a dynamic play-by-play wizard built specifically for streamlining flag football stat-tracking during or after the game.",
    },
    {
      icon: Activity,
      badge: "Live Updating",
      title: "Full Play-by-Play & Box Scores",
      description:
        "Live updating play-by-play and box scores for every game. Parents and fans can follow along from anywhere with service, no log-in needed.",
    },
    {
      icon: BookOpen,
      badge: "Playbook Studio",
      title: "Build & Share Up to 5 Custom Playbooks",
      description:
        "Intuitive play design interface for offensive and defensive playbooks. Interactive visual route designer with route presets and custom routes. Defensive zone presets and man coverage tools.",
    },
    {
      icon: Users,
      badge: "Roster Hub",
      title: "Private Team Portal",
      description:
        "Dedicated team portal with depth charts, customizable team statistics & trends dashboard, contact information, and your teams playbooks. Unauthorized users will see only your teams roster, schedule, and individual player statistics when viewing your portal.",
    },
    {
      icon: Trophy,
      badge: "Career Records",
      title: "Athlete Career Profiles & Game Logs",
      description:
        "Individual player stats from every game follow athletes across all FlagOS seasons, teams, and leagues building comprehensive career histories.",
    },
    {
      icon: Sliders,
      badge: "100% Autonomy",
      title: "Full Independence",
      description:
        "Full club autonomy for travel squads, intramural clubs, and tournament teams without needing a parent league.",
    },
  ];

  // Exact 6 League Features from Public Home Page
  const leagueFeaturesList = [
    {
      icon: Sparkles,
      badge: "50% Off Team Subscriptions",
      title: "All Team Features Included",
      description:
        "Every team in your league automatically gets their private team portal, complete team and player stats, and up to 5 custom playbooks.",
    },
    {
      icon: Timer,
      badge: "Live Gameday",
      title: "Official Game Management With Live Clocks",
      description:
        "Synchronized game clock and play clock, possession indicator, down counter, and interactive timeouts.",
    },
    {
      icon: Building2,
      badge: "Branding",
      title: "Customizable League Portal",
      description:
        "Make the league your own with custom branding, themes, and league information. The only FlagOS branding on your league is a brief \"Powered by FlagOS\" disclaimer in the footer.",
    },
    {
      icon: Calendar,
      badge: "Automation",
      title: "Automated Seasonal Scheduler",
      description:
        "Generate a full season schedule, drag-and-drop to reorder game slots, and assign fields automatically. Playoff brackets are automatically generated based on your league's playoff structure and seeding rules.",
    },
    {
      icon: Trophy,
      badge: "Competition",
      title: "Automated Standings & Stat Leaderboards",
      description:
        "Real-time standings, and automated league-wide rankings for various statistical categories.",
    },
    {
      icon: Flame,
      badge: "Recruitment",
      title: "Registration Portal & Free Agent Board (Optional)",
      description:
        "Public registration pipeline for incoming players. Players who complete the form are added to the free-agent pool viewable by league and team admins.",
    },
  ];

  // Powerhouse Capabilities from Homepage Interactive Frame
  const powerhouseFeatures = [
    {
      title: "Dynamic Play-by-Play Wizard",
      category: "Gameday Stat-Tracking",
      tagline: "Dual Operating Modes",
      desc: "Full gameday stat tracker with dual operating modes: live countdown clocks & buzzer (synchronous) or clockless rapid-logging for sideline operators (asynchronous).",
      icon: Play,
      color: "emerald",
    },
    {
      title: "Playbook Studio",
      category: "Strategy & Tactical Tools",
      tagline: "Up to 5 Playbooks per Team",
      desc: "Up to 5 custom offensive & defensive playbooks per team, interactive visual route designer with route presets, custom routes, player notes & armband PDF export.",
      icon: BookOpen,
      color: "emerald",
    },
    {
      title: "Automated Seasonal Scheduler",
      category: "Tournament Operations",
      tagline: "Matchmaking & Brackets",
      desc: "Round-robin matchmaking engine, drag-and-drop game slot ordering, field assignments, and automatically generated playoff elimination brackets.",
      icon: Calendar,
      color: "cyan",
    },
    {
      title: "FlagOS League Dashboard",
      category: "Public Portal & Standings",
      tagline: "Live Score Tickers & Leaders",
      desc: "Real-time standings, cumulative season-long statistics, live match tickers, player leaderboards, and custom public spectator portal.",
      icon: Building2,
      color: "cyan",
    },
  ];

  // Comprehensive Feature Comparison Matrix items
  const matrixRows = [
    {
      category: "stats",
      feature: "Dynamic Play-by-Play Wizard (Asynchronous Mode)",
      detail: "Fast, clockless stat logging during scrimmages or post-game",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Live Clocks (Synchronous Mode) & 25s Play Clock",
      detail: "Synchronized 20-min countdown clocks, play clock, and timeouts",
      team: false,
      league: true,
    },
    {
      category: "stats",
      feature: "Real-Time Public Box Scores & Down-by-Down Logs",
      detail: "Live updating game logs accessible to parents & spectators",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Cumulative Season-Long Player & Team Statistics",
      detail: "Completion %, pass/rec/rush TDs, sacks, flags pulled, conversions",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Athlete Career Résumés & Multi-Season Game Logs",
      detail: "Stats follow individual athletes across all leagues and seasons",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "League-Wide Statistical Leaderboards & Accolades",
      detail: "Automated rankings for top passers, receivers, flaggers & scorers",
      team: false,
      league: true,
    },
    {
      category: "playbook",
      feature: "Custom Playbooks per Team",
      detail: "Independent offensive and defensive play schemes",
      team: "Up to 5 Playbooks",
      league: "Up to 5 per Team (All Teams)",
    },
    {
      category: "playbook",
      feature: "Visual Route Designer & Route Presets",
      detail: "Slant, Out, Post, Go, Dig, Wheel, Drag, Corner, Hitch, Comeback",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Custom Route Presets Saving (Up to 20 per Team)",
      detail: "Design and store team-specific route presets with custom names",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Position Coaching Notes & Progression Sheets",
      detail: "Add detailed execution and assignment notes per position",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Defensive Zone Shells & Man Coverage Presets",
      detail: "Cover 2, Cover 3, Blitz packages, and designated rusher setups",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Printable Gameday Armband Inserts & Wristband PDF Export",
      detail: "Export print-ready 8, 12, or 16-play wristband inserts",
      team: true,
      league: true,
    },
    {
      category: "league",
      feature: "Private Franchise Team Portal",
      detail: "Roster management, depth charts, contact directory & trends",
      team: "1 Dedicated Team",
      league: "Included for Every Team",
    },
    {
      category: "league",
      feature: "Automated Seasonal Scheduler Engine",
      detail: "Generate round-robin fixtures and assign field locations",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Drag-and-Drop Match Rescheduling & Reordering",
      detail: "Reorder game slots and modify kickoff times easily",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Automated Standings, Tiebreakers & Point Differential",
      detail: "Real-time W-L-T records and head-to-head tiebreakers",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Playoff Bracket Generator",
      detail: "Automatic seeded brackets based on seasonal standings",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Customizable League Branding & Colors",
      detail: "Full custom colors, logo, shortcode, and season titles",
      team: "Team Colors Only",
      league: true,
    },
    {
      category: "league",
      feature: "Public League Directory Listing or Private Direct-Link Mode",
      detail: "Choose between public listing or private direct-URL access",
      team: "Public or Unlisted",
      league: true,
    },
    {
      category: "league",
      feature: "Player Registration Pipeline & Free Agent Pool",
      detail: "Intake form for free-agent athletes and unassigned players",
      team: false,
      league: true,
    },
  ];

  const filteredMatrixRows =
    activeMatrixTab === "all"
      ? matrixRows
      : matrixRows.filter((r) => r.category === activeMatrixTab);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">

      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[55rem] h-[32rem] bg-gradient-to-b from-cyan-600/20 via-blue-600/10 to-transparent rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex-1 w-full relative z-10 space-y-16">
        {/* Page Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subscription Breakdown</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white">
            Plans Available for Teams &amp; Leagues
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
            Run an independent team with in-depth stats &amp; up to 5 custom playbooks, or scale an entire league where <strong className="text-white">every team gets those exact same features</strong> plus live gameday clocks, automated scheduling, and centralized league infrastructure.
          </p>
        </div>

        {/* The Platform Multiplier Architecture Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/15 to-blue-500/10 border border-cyan-500/30 p-6 md:p-8 text-neutral-200 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>The Platform Multiplier</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight">
              Leagues Include Full Team Plan Hubs For Every Team
            </h2>
            <p className="text-neutral-300 text-sm leading-relaxed">
              When you subscribe to a League, you aren&apos;t just getting commissioner tools. <strong className="text-white">Every single team in your organization receives their own full Team Plan access</strong> — complete player stats, career records, and up to 5 custom playbooks — at <strong>$15/team/mo (50% off the standalone team subscription)</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center px-4 py-3 rounded-2xl bg-black/60 border border-emerald-500/30">
              <div className="text-[11px] text-emerald-400 font-mono font-bold uppercase">Team Side</div>
              <div className="text-sm md:text-base font-black text-white">Stats + 5 Playbooks</div>
            </div>
            <div className="text-cyan-400 font-black text-lg">➕</div>
            <div className="text-center px-4 py-3 rounded-2xl bg-black/60 border border-cyan-500/30">
              <div className="text-[11px] text-cyan-400 font-mono font-bold uppercase">League Side</div>
              <div className="text-sm md:text-base font-black text-white">Live Clocks + Infra</div>
            </div>
          </div>
        </div>

        {/* SIDE-BY-SIDE PLANS GRID (ALIGNED WITH HOME PAGE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* TIER 1: THE TEAM PLAN (LEFT) */}
          <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-emerald-500/40 rounded-3xl p-8 space-y-6 relative shadow-[0_0_50px_rgba(16,185,129,0.12)] flex flex-col justify-between backdrop-blur-xl hover:border-emerald-500/60 transition-all">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Shield className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">Team Subscription</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20">
                  For Individual Teams
                </span>
              </div>

              <div>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  A dedicated private headquarters for travel teams, tournament squads, and coaches, complete with roster management, highly efficent stat tracking, and up to 5 custom playbooks.
                </p>
              </div>

              {/* Pricing Callout */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">$30</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md font-bold">
                    Single Flat Fee
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Full standalone autonomy for 1 team without requiring a parent league.
                </p>
              </div>

              {/* Exact Features from Home Page */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    What You Get With a Team Subscription
                  </span>
                  <span className="text-neutral-500 text-[10px]">Key Features</span>
                </div>

                <div className="space-y-2.5">
                  {teamFeaturesList.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                        <feat.icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap justify-between">
                          <span className="text-xs font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                            {feat.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold shrink-0">
                            {feat.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6">
              <button
                onClick={() => setShowDevelopmentNotice(true)}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>Subscribe Team Portal ($30/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TIER 2: THE LEAGUE PLAN (RIGHT) */}
          <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-cyan-500/40 rounded-3xl p-8 space-y-6 relative shadow-[0_0_50px_rgba(var(--league-primary-rgb),0.15)] flex flex-col justify-between backdrop-blur-xl hover:border-cyan-500/60 transition-all">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-3 flex items-center gap-4 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30">
                  <Crown className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">League Subscription</h3>
                </div>
                <span className="px-3 py-1 text-center rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/20">
                  For Leagues<br /> of 4-64 Teams
                </span>
              </div>

              <div>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  A complete league management system for commissioners and organizers, complete with role-based access control for commissioners, coaches, and players, and a public-facing league portal for spectators and fans.
                </p>
              </div>

              {/* Pricing Breakdown & Dynamic Slider */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">${totalLeagueMonthly}</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md font-bold">
                    ${baseLeagueFee} base + ${perTeamFee}/team
                  </span>
                </div>

                {/* Team slider */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Active Teams: <span className="text-white font-mono">{teamCount} Teams</span>
                    </span>
                    <span className="text-neutral-400 font-mono">
                      (${baseLeagueFee} + {teamCount} × ${perTeamFee})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setTeamCount((c) => Math.max(4, c - 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={4}
                      max={64}
                      value={teamCount}
                      onChange={(e) => setTeamCount(Number(e.target.value))}
                      className="flex-1 accent-cyan-400 cursor-pointer"
                    />
                    <button
                      onClick={() => setTeamCount((c) => Math.min(64, c + 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Exact Features from Home Page */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    What you get with a league subscription
                  </span>
                  <span className="text-neutral-500 text-[10px]">Key Features</span>
                </div>

                <div className="space-y-2.5">
                  {leagueFeaturesList.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] transition-all group"
                    >
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                        <feat.icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap justify-between">
                          <span className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                            {feat.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold shrink-0">
                            {feat.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6">
              <button
                onClick={() => setShowDevelopmentNotice(true)}
                className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.3)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>Launch &amp; Subscribe League (${totalLeagueMonthly}/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* THE 4 POWERHOUSE CAPABILITIES SECTION (FROM HOMEPAGE INTERACTIVE SHOWCASE) */}
        <section className="space-y-8 pt-8 border-t border-white/10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Interactive Capabilities
            </span>
            <h2 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tight">
              FlagOS Powerhouse Features
            </h2>
            <p className="text-neutral-400 text-xs md:text-sm">
              The flagship systems that make FlagOS the premier operating software for modern flag football.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {powerhouseFeatures.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-[#0B0F19] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <f.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                          {f.category}
                        </span>
                        <h3 className="text-lg font-black text-white uppercase">{f.title}</h3>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-cyan-300">
                      {f.tagline}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">{f.desc}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-neutral-500">
                    Included in: <strong className="text-white">{i < 2 ? "Team & League Plans" : "League Plan"}</strong>
                  </span>
                  <Link
                    href="/#interactive-demo"
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <span>Test in Sandbox</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPREHENSIVE FEATURE COMPARISON MATRIX */}
        <section className="space-y-8 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                Direct Comparison
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tight mt-1">
                Feature Comparison Matrix
              </h2>
              <p className="text-neutral-400 text-xs md:text-sm mt-1">
                Detailed side-by-side comparison between standalone Team Subscriptions and full League Subscriptions.
              </p>
            </div>

            {/* Matrix Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold shrink-0">
              <button
                onClick={() => setActiveMatrixTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "all" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                All Features
              </button>
              <button
                onClick={() => setActiveMatrixTab("stats")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "stats" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Stat-Tracking
              </button>
              <button
                onClick={() => setActiveMatrixTab("playbook")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "playbook" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                Playbook Studio
              </button>
              <button
                onClick={() => setActiveMatrixTab("league")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "league" ? "bg-cyan-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                League Ops
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-black/60 border-b border-white/10 text-neutral-400 font-mono uppercase">
                    <th className="py-4 px-6 w-1/2">Capability</th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-white text-sm">Team Subscription</div>
                      <div className="text-[10px] text-emerald-400 lowercase font-normal">$30 / month flat</div>
                    </th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-white text-sm">League Subscription</div>
                      <div className="text-[10px] text-cyan-400 lowercase font-normal">$40 base + $15/team/mo</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMatrixRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white text-sm">{row.feature}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{row.detail}</div>
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.team === "boolean" ? (
                          row.team ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-neutral-200">{row.team}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.league === "boolean" ? (
                          row.league ? (
                            <CheckCircle2 className="w-5 h-5 text-cyan-400 mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-cyan-300">{row.league}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Multi-League & Tenancy Explanation Banner */}
        <div className="rounded-3xl bg-[#0B0F19] border border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Multi-League &amp; Multi-Team Architecture</h3>
              <p className="text-neutral-400 text-xs md:text-sm mt-1 leading-relaxed">
                You can own multiple leagues, serve as commissioner across various organizations, or manage individual club portals simultaneously. Seamlessly switch between leagues via the top navigation switcher.
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold whitespace-nowrap border border-white/10 transition-colors"
          >
            Go to Active League
          </Link>
        </div>
      </main>

      {/* LEAGUE CHECKOUT MODAL */}
      {isLeagueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-950 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsLeagueModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 border border-cyan-500/30">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white">Subscribe League Portal</h3>
                <p className="text-xs text-neutral-400">Baseline fee + per-team scaling • Includes full team hubs for every team</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeLeague} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">League Name</label>
                <input
                  type="text"
                  required
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="e.g. Gotham Flag Football League"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-cyan-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Shortcode</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={leagueShortcode}
                    onChange={(e) => setLeagueShortcode(e.target.value.toUpperCase())}
                    placeholder="e.g. GFFL"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-cyan-400 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Team Capacity</label>
                  <input
                    type="number"
                    min={4}
                    max={64}
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Brand color choice */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">Primary League Color</label>
                <div className="flex items-center gap-2">
                  {["#3ca505", "#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLeagueColor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform cursor-pointer ${leagueColor === c ? "scale-110 ring-2 ring-white" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-400">
                  <span>Baseline League Fee</span>
                  <span className="font-mono text-white">${baseLeagueFee}/mo</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>{teamCount} Teams Add-on (${perTeamFee}/team)</span>
                  <span className="font-mono text-white">${teamCount * perTeamFee}/mo</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-cyan-400 font-mono">${totalLeagueMonthly}/mo</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLeague}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingLeague ? "Provisioning League..." : `Confirm & Pay $${totalLeagueMonthly}/mo`}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TEAM CHECKOUT MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-950 border border-white/20 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsTeamModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white">Subscribe Team Portal</h3>
                <p className="text-xs text-neutral-400">Single monthly fee • Full stats tracking, roster hub &amp; up to 5 playbooks</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeTeam} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Team / Club Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Apex Predators"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Team Shortcode</label>
                <input
                  type="text"
                  maxLength={5}
                  value={teamShortcode}
                  onChange={(e) => setTeamShortcode(e.target.value.toUpperCase())}
                  placeholder="e.g. APX"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-mono uppercase"
                />
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-400">
                  <span>Single Team Portal Subscription</span>
                  <span className="font-mono text-white">$30/mo</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Full Stats &amp; Up to 5 Custom Playbooks</span>
                  <span className="font-mono text-emerald-400">Included</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-emerald-400 font-mono">$30/mo</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTeam}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingTeam ? "Provisioning Team..." : "Confirm & Pay $30/mo"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {showDevelopmentNotice && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowDevelopmentNotice(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="development-notice-title"
            className="relative w-full max-w-md rounded-3xl border border-cyan-500/30 bg-neutral-950 p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close development notice"
              onClick={() => setShowDevelopmentNotice(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 id="development-notice-title" className="text-xl font-black text-white">
              FlagOS is still in development
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              Subscriptions and purchases are not available yet. No payment will be taken and no league or team will be created. You can continue exploring the demo league while we finish building the service.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/league/default?demo=true"
                onClick={() => setShowDevelopmentNotice(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black uppercase tracking-wide text-black transition-colors hover:bg-cyan-400"
              >
                <Play className="h-4 w-4" />
                Explore demo league
              </Link>
              <button
                type="button"
                onClick={() => setShowDevelopmentNotice(false)}
                className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                Maybe later
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
