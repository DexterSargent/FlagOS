"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Shield,
  Zap,
  Sparkles,
  ChevronRight,
  Play,
  PlayCircle,
  Calendar,
  Users,
  Trophy,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Search,
  Building2,
  Clock,
  Timer,
  Activity,
  Layers,
  Flame,
  Award,
} from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import LeagueFooter from "@/components/LeagueFooter";
import { renderFlagOS } from "@/components/FlagOSText";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/lib/themeContext";

export default function FlagOSPlatformLandingPage() {
  const router = useRouter();
  const { activeLeagueId, userLeagues, settings } = useLeague();
  const { user, isLeagueAdmin, isTeamAdmin, role } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Interactive preview tabs
  const [activeFeatureTab, setActiveFeatureTab] = useState<"stats" | "playbook" | "live-clock" | "infrastructure">("stats");

  // League Finder search
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive slider on landing page
  const [teamSlider, setTeamSlider] = useState(8);
  const baseFee = 40;
  const perTeamFee = 15;
  const calculatedTotal = baseFee + teamSlider * perTeamFee;


  const filteredLeagues = userLeagues.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.shortcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const logoColour = mounted && resolvedTheme === "light" ? "/flagos-logo-original.png" : "/flagos-logo.png";

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-cyan-600/20 via-blue-600/10 to-transparent rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[40rem] -right-40 w-[35rem] h-[35rem] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* TOP PLATFORM HEADER */}
      <header className="border-b border-white/10 bg-[#07090E]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-15 h-15 rounded-2xl flex items-center justify-center">
              <img
                src="/flagos-emblem.png"
                alt="FlagOS"
                className="w-full h-full object-contain "
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black uppercase tracking-wider leading-none">
                  <span className="text-white">FLAG</span>
                  <span style={{ color: "#3CA505" }}>OS</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  Platform Hub
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase block mt-1">
                The Flag Football Operating System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-neutral-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Platform Features
            </a>
            <a href="#leagues-directory" className="hover:text-cyan-400 transition-colors">
              Find a League
            </a>
            <Link href="/pricing" className="text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pricing & Subscriptions</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <ThemeToggle size="md" />

            <Link
              href={`/league/${activeLeagueId || "default"}`}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Active League:</span>
              <span className="text-cyan-300">{settings?.shortcode || "FLAG"}</span>
            </Link>

            <Link
              href="/pricing"
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
            >
              Launch Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ACTIVE LEAGUE WELCOME BANNER (IF RETURNING USER) */}
      <div className="bg-neutral-900/60 border-b border-white/5 py-2.5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Looking for your active league? You have access to <strong className="text-white">{settings?.leagueName || "FlagOS League"}</strong>.
            </span>
          </div>
          <Link
            href={`/league/${activeLeagueId || "default"}`}
            className="text-cyan-400 hover:text-cyan-300 font-bold inline-flex items-center gap-1 text-xs hover:underline"
          >
            <span>Enter League Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>


      {/* HERO SECTION */}
      <main className="flex-1 w-full relative z-10">
        <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 md:pt-16 md:pb-28 text-center space-y-8">
          {/* Official 3D Turf Gear Logo Showcase */}
          <div className="flex flex-col items-center justify-center pt-2 pb-1">
            <div className="relative group">
              <img
                src={logoColour}
                alt="FlagOS - The Flag Football Operating System"
                className="relative w-56 sm:w-64 md:w-72 h-auto object-contain drop-shadow-[0_25px_50px_rgba(60,165,5,0.45)] hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest backdrop-blur-md shadow-2xl">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Built For Independent Teams & Full League Organizations</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none">
            The Operating System for Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"><br></br>Flag Football</span>
          </h1>

          <p className="text-neutral-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light">
            Everything needed to manage an independent franchise or operate an entire league. On the team side: track team &amp; individual player stats, and design up to 5 custom playbooks. On the league side: get all of that for every team in your organization, plus live gameday clock management and complete league handling infrastructure.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/pricing"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.4)] hover:scale-102 active:scale-98 flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>Launch a League Portal</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href="/pricing"
              className="px-8 py-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm uppercase tracking-wider transition-all border border-white/15 hover:border-white/30 flex items-center gap-2 shadow-xl"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Launch a Team Portal ($30/mo)</span>
            </Link>

            <Link
              href={`/league/${activeLeagueId || "default"}`}
              className="px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-sm uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-cyan-400" />
              <span>Explore Demo League</span>
            </Link>
          </div>

          {/* Social Proof metrics */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-white/10">
            <div>
              <div className="text-2xl md:text-3xl font-black text-white font-mono">5v5 & 7v7</div>
              <div className="text-xs text-neutral-500 font-bold uppercase mt-0.5">IFAF Rules Ready</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">Full Stats</div>
              <div className="text-xs text-neutral-500 font-bold uppercase mt-0.5">Team & Player Logs</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-blue-400 font-mono">5 Playbooks</div>
              <div className="text-xs text-neutral-500 font-bold uppercase mt-0.5">Per Team Custom Schemer</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono">Live Clocks</div>
              <div className="text-xs text-neutral-500 font-bold uppercase mt-0.5">Full League Infrastructure</div>
            </div>
          </div>
        </section>

        {/* THE TEAM SIDE VS THE LEAGUE SIDE */}
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-white/10 space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Platform Architecture &amp; Tier Breakdown
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
              The Team Side vs. The League Side
            </h2>
            <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
              On the <strong className="text-emerald-400">Team Side</strong>, you get comprehensive team and player stats, roster management, and up to 5 custom playbooks. On the <strong className="text-cyan-400">League Side</strong>, you get all that for <em>every team</em> in your league, <strong className="text-white">PLUS</strong> live gameday clock management and the entire league handling infrastructure.
            </p>
          </div>

          {/* THE MULTIPLIER BANNER */}
          <div className="max-w-4xl mx-auto p-4 md:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/15 to-blue-500/10 border border-cyan-500/30 text-neutral-200 text-xs md:text-sm flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left backdrop-blur-xl shadow-2xl">
            <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 border border-cyan-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="font-mono text-cyan-300 font-bold uppercase tracking-wider text-xs block">
                The FlagOS Multiplier Effect
              </span>
              <p className="text-neutral-300 leading-relaxed">
                Leagues include full Team Plan access for <strong>each registered team</strong> — giving every coach their own private hub, player stats, and up to 5 playbooks, backed by centralized gameday countdown clocks and automated league standings!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* TIER 1: THE TEAM PLAN (LEFT) */}
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-emerald-500/40 rounded-3xl p-8 space-y-6 relative shadow-[0_0_50px_rgba(16,185,129,0.12)] flex flex-col justify-between backdrop-blur-xl hover:border-emerald-500/60 transition-all">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20">
                    Franchise, Coach &amp; Club Tier
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">The "Team" Subscription</h3>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    A dedicated private headquarters for independent teams, tournament squads, and coaches with complete stat tracking and up to 5 custom playbooks.
                  </p>
                </div>

                <div className="bg-black/60 rounded-2xl p-4 border border-white/10 space-y-1">
                  <div className="text-3xl font-black text-white font-mono">
                    $30 <span className="text-xs text-neutral-400 font-normal">/ month flat fee</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium">Single flat monthly fee — full standalone access with zero league dues required</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      What You Get On The Team Side
                    </span>
                    <span className="text-neutral-500 text-[10px]">The Core Draws</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        icon: Activity,
                        badge: "Draw A",
                        title: "Track & Manage Team & Individual Stats",
                        description: "Full box scores with completion %, passing/receiving/rushing TDs, flag pulls, sacks, INTs, conversions, and cumulative career athlete game logs.",
                      },
                      {
                        icon: BookOpen,
                        badge: "Draw B",
                        title: "Design & Build Up to 5 Custom Playbooks",
                        description: "Interactive visual route drafting with custom break points, offensive pass/run concepts, and defensive coverage shells (Cover 2, Man, Blitz).",
                      },
                      {
                        icon: Users,
                        badge: "Roster Hub",
                        title: "Private Franchise Roster & Depth Charts",
                        description: "Dedicated team portal (/teams/[id]) with player bios, jersey numbers, positions, contact directory, and attendance tracking.",
                      },
                      {
                        icon: Play,
                        badge: "Match Tracker",
                        title: "Standalone Match & Scrimmage Logging",
                        description: "Log exhibition games, scrimmages, and tournament matches against custom-named opponents with streamlined single-operator stat entry.",
                      },
                      {
                        icon: Trophy,
                        badge: "Career Records",
                        title: "Athlete Career Résumés & Game Logs",
                        description: "Individual player stats follow athletes across every match played into permanent, verified digital career archives.",
                      },
                      {
                        icon: Sliders,
                        badge: "100% Autonomy",
                        title: "Full Independence — Flat $30/mo",
                        description: "Full club autonomy for travel squads, intramural clubs, and tournament teams without needing a parent league.",
                      },
                    ].map((feat, idx) => (
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
                <Link
                  href="/pricing"
                  className="w-full py-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Subscribe Team Portal ($30/mo)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* TIER 2: THE LEAGUE PLAN (RIGHT) */}
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-cyan-500/40 rounded-3xl p-8 space-y-6 relative shadow-[0_0_50px_rgba(var(--league-primary-rgb),0.15)] flex flex-col justify-between backdrop-blur-xl hover:border-cyan-500/60 transition-all">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30">
                    <Crown className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/20">
                    Commissioner &amp; League Operator Tier
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">The "League" Subscription</h3>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    Everything on the team side for <strong className="text-white">every team</strong> in your organization, PLUS official gameday clocks and complete league handling infrastructure.
                  </p>
                </div>

                <div className="bg-black/60 rounded-2xl p-4 border border-white/10 space-y-1">
                  <div className="text-3xl font-black text-white font-mono">
                    $40 <span className="text-xs text-neutral-400 font-normal">base monthly</span> + $15 <span className="text-xs text-neutral-400 font-normal">per team / mo</span>
                  </div>
                  <p className="text-[11px] text-cyan-400 font-medium">Scales dynamically — every registered team gets full team hub &amp; playbooks</p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      All Team Features For Every Team + League Ops
                    </span>
                    <span className="text-neutral-500 text-[10px]">The League Draws</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        icon: Sparkles,
                        badge: "All Teams",
                        title: "All Team Features Included for Every Team",
                        description: "Every team in your league automatically gets their private team portal, complete team and player stats, and up to 5 custom playbooks.",
                      },
                      {
                        icon: Timer,
                        badge: "Live Gameday",
                        title: "Official Game Management With Live Clocks",
                        description: "Synchronized 20-min countdown clocks, 25s play clock buzzer, ball spot indicator, down & distance, and interactive timeouts.",
                      },
                      {
                        icon: Building2,
                        badge: "Branding",
                        title: "White-Label League Website & Portal",
                        description: "Dedicated portal URL with your custom color palette, official logo, season title, and tailored theme presets.",
                      },
                      {
                        icon: Calendar,
                        badge: "Automation",
                        title: "Automated Seasonal Scheduler",
                        description: "Generate balanced seasonal matchups, drag-and-drop to reorder game slots, and assign turf fields automatically.",
                      },
                      {
                        icon: Trophy,
                        badge: "Competition",
                        title: "Automated Standings & Seeding",
                        description: "Real-time win/loss/tie calculations, head-to-head tiebreakers, point differential, and playoff brackets.",
                      },
                      {
                        icon: Award,
                        badge: "Analytics",
                        title: "League-Wide Stat Leaderboards",
                        description: "Automated league rankings for passing TDs, passer rating, defensive flag pulls, sacks, and INT pick-sixes across all teams.",
                      },
                      {
                        icon: Users,
                        badge: "Delegation",
                        title: "Multi-Admin Delegation & Tenancy",
                        description: "Invite Team Coaches, grant scorekeeper access, and manage multiple divisions from one central commissioner desk.",
                      },
                      {
                        icon: Flame,
                        badge: "Recruitment",
                        title: "Team Signups & Free Agent Draft Board",
                        description: "Public registration pipeline for incoming teams and an unattached free-agent draft pool with position filters.",
                      },
                    ].map((feat, idx) => (
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
                <Link
                  href="/pricing"
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.3)] hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Build League &amp; View Pricing Calculator</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FEATURE SHOWCASE */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-white/10 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Interactive Capabilities
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
              The FlagOS Powerhouse Features
            </h2>
            <p className="text-neutral-400 text-sm max-w-2xl mx-auto">
              Explore the core tools that empower coaches on the team side and commissioners on the league side.
            </p>
          </div>

          {/* Feature selector tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-neutral-900 border border-white/10 max-w-3xl mx-auto text-xs font-bold">
            <button
              onClick={() => setActiveFeatureTab("stats")}
              className={`px-4 py-2.5 rounded-xl transition-all ${activeFeatureTab === "stats" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Team &amp; Player Stats
            </button>
            <button
              onClick={() => setActiveFeatureTab("playbook")}
              className={`px-4 py-2.5 rounded-xl transition-all ${activeFeatureTab === "playbook" ? "bg-blue-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Playbook Studio (5 Playbooks)
            </button>
            <button
              onClick={() => setActiveFeatureTab("live-clock")}
              className={`px-4 py-2.5 rounded-xl transition-all ${activeFeatureTab === "live-clock" ? "bg-cyan-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Live Gameday Clocks
            </button>
            <button
              onClick={() => setActiveFeatureTab("infrastructure")}
              className={`px-4 py-2.5 rounded-xl transition-all ${activeFeatureTab === "infrastructure" ? "bg-amber-400 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Full League Infrastructure
            </button>
          </div>

          {/* Interactive display card */}
          <div className="bg-neutral-950 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
            {activeFeatureTab === "stats" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
                    <Activity className="w-3.5 h-3.5" /> Team Draw • Precision Analytics
                  </div>
                  <h3 className="text-3xl font-black uppercase text-white">Track &amp; Manage Team &amp; Player Stats</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Track every pass, rush, flag pull, sack, interception, and conversion. Real-time box scores automatically calculate completion percentages and passer ratings, while athlete career game logs compile across all matches into permanent player résumés.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-xs"
                    >
                      <span>Get Team Portal ($30/mo)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Team Box Score Mockup */}
                <div className="bg-black border border-emerald-500/30 rounded-2xl p-5 text-left space-y-4 shadow-xl font-sans">
                  <div className="flex justify-between items-center text-xs pb-3 border-b border-white/10">
                    <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider">APEX PREDATORS • GAME LOG</span>
                    <span className="font-mono text-neutral-400">WEEK 2 BOX SCORE</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-xl font-black text-white font-mono">18/24 (75%)</div>
                      <div className="text-[10px] text-neutral-400 uppercase font-bold mt-0.5">Passing</div>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-xl font-black text-emerald-400 font-mono">4 TDs</div>
                      <div className="text-[10px] text-neutral-400 uppercase font-bold mt-0.5">Scoring</div>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-xl font-black text-cyan-400 font-mono">8 Stops / 2 INT</div>
                      <div className="text-[10px] text-neutral-400 uppercase font-bold mt-0.5">Defense</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between p-2 rounded-lg bg-neutral-900 border border-white/5 items-center">
                      <span className="font-bold text-white">Marcus Vance (QB)</span>
                      <span className="text-neutral-300">18/24 • 4 TD • 0 INT • 28 PTS</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-neutral-900 border border-white/5 items-center">
                      <span className="font-bold text-white">Jordan Reed (WR)</span>
                      <span className="text-neutral-300">8 REC • 2 TD • 3 FLAGS • 14 PTS</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-neutral-900 border border-white/5 items-center">
                      <span className="font-bold text-white">Devonte Cole (DB)</span>
                      <span className="text-emerald-400">5 FLAGS • 2 INT • 1 PICK-6</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "playbook" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono font-bold">
                    <BookOpen className="w-3.5 h-3.5" /> Team Draw • Up to 5 Playbooks
                  </div>
                  <h3 className="text-3xl font-black uppercase text-white">Design &amp; Build Up to 5 Playbooks</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Build and organize up to 5 custom playbooks per team. Design offensive route trees with custom break points (Slant, Post, Corner, Go, Out, Wheel) and scheme defensive coverages with zone bubbles, man-to-man locking lines, and bendable pass rush tracks. Keep situational packages ready for 2-minute drills, red zone trips, and tournament shootouts.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold text-xs"
                    >
                      <span>Unlock 5 Playbooks with Team Hub</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* 5 Playbooks Mockup */}
                <div className="bg-black border border-blue-500/30 rounded-2xl p-5 text-center space-y-4 shadow-xl">
                  <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/10 pb-2">
                    <span className="font-mono text-blue-400 font-bold uppercase">5 CUSTOM TEAM PLAYBOOKS</span>
                    <span className="font-mono text-neutral-500">IFAF 5v5 &amp; 7v7</span>
                  </div>
                  {/* 5 Playbook tabs */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[10px] font-mono">
                    <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold truncate">1. Base (14)</span>
                    <span className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/5 truncate">2. Red Zone (8)</span>
                    <span className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/5 truncate">3. 2-Min (6)</span>
                    <span className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/5 truncate">4. Cover 2 (8)</span>
                    <span className="p-1.5 rounded-lg bg-white/5 text-neutral-400 border border-white/5 truncate">5. Blitz (6)</span>
                  </div>
                  <div className="h-32 bg-neutral-900 rounded-xl flex flex-col items-center justify-center border border-white/5 relative overflow-hidden p-4">
                    <div className="text-white font-bold text-xs uppercase tracking-wide">Trips Right • Post Wheel Flood</div>
                    <div className="text-neutral-500 font-mono text-[11px] mt-1">Interactive Route Canvas with Customizable Break Points</div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[9px] font-mono font-bold">X: Corner (12yd)</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[9px] font-mono font-bold">Y: Wheel (Flat-Up)</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[9px] font-mono font-bold">Z: Post Break</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400 text-left">
                    Strictly confidential to team coaches and rostered athletes. Exportable to sideline wristband sheets.
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "live-clock" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5" /> League Draw • Official Gameday Console
                  </div>
                  <h3 className="text-3xl font-black uppercase text-white">Live Game Management With The Clock</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Designed for official league game days. Features synchronized countdown clocks, automated 2-minute warning pauses, 25/30-second play clock countdown buzzer, ball spot indicator, down &amp; distance tracker, official timeouts, and live spectator broadcasts for fans and families.
                  </p>
                  <div className="pt-2">
                    <Link
                      href={`/league/${activeLeagueId || "default"}`}
                      className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold text-xs"
                    >
                      <span>See Live League Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Scoreboard Mockup */}
                <div className="bg-black border border-cyan-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                  <div className="flex justify-between items-center text-xs text-neutral-400">
                    <span className="font-mono text-cyan-400">● 1ST HALF</span>
                    <span className="font-bold text-white text-lg font-mono">18:42</span>
                    <span className="font-mono text-amber-400">PLAY CLOCK: 25s</span>
                  </div>
                  <div className="flex justify-around items-center">
                    <div>
                      <div className="text-sm font-bold text-white">LIGHTNING</div>
                      <div className="text-5xl font-black text-cyan-400 font-mono">20</div>
                    </div>
                    <span className="text-neutral-600 font-bold">VS</span>
                    <div>
                      <div className="text-sm font-bold text-white">PREDATORS</div>
                      <div className="text-5xl font-black text-neutral-400 font-mono">14</div>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-400 border-t border-white/10 pt-3 flex justify-between">
                    <span>Down: <strong>2nd Down</strong></span>
                    <span>Possession: <strong>LIGHTNING</strong></span>
                    <span>Timeouts: <strong>2 Left</strong></span>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === "infrastructure" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono font-bold">
                    <Building2 className="w-3.5 h-3.5" /> League Draw • Complete Organization Ops
                  </div>
                  <h3 className="text-3xl font-black uppercase text-white">The Entire League Handling Infrastructure</h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Zero-spreadsheet league operations. Automated seasonal scheduler with field assignments, real-time standings and head-to-head tiebreakers, league-wide stat leaderboards (Passing, Receiving, Rushing, Flag Pulls, Sacks, INTs), multi-admin delegation (commissioners, coaches, scorekeepers), and free-agent draft boards.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold text-xs"
                    >
                      <span>Explore League Pricing Plans</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="bg-black border border-amber-500/30 rounded-2xl p-4 text-xs font-mono space-y-3">
                  <div className="flex justify-between border-b border-white/10 pb-2 text-neutral-400 font-bold">
                    <span>LEAGUE STANDINGS</span>
                    <span>W-L</span>
                    <span>DIFF</span>
                    <span>PTS</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className="font-bold text-cyan-400">1. Lightning</span>
                    <span>6-0</span>
                    <span className="text-emerald-400">+58</span>
                    <span>12</span>
                  </div>
                  <div className="flex justify-between text-neutral-300">
                    <span>2. Apex Predators</span>
                    <span>5-1</span>
                    <span className="text-emerald-400">+34</span>
                    <span>10</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>3. Gotham Rogues</span>
                    <span>3-3</span>
                    <span>+2</span>
                    <span>6</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-[11px]">
                    <span className="text-amber-400">★ Passing TD Leader: 24 TDs</span>
                    <span className="text-cyan-400">★ Flag Stop Leader: 38 Flags</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FIND A LEAGUE / DIRECTORY SECTION */}
        <section id="leagues-directory" className="max-w-6xl mx-auto px-6 py-16 border-t border-white/10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
                League Directory
              </span>
              <h2 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tight mt-1">
                Find Your League Portal
              </h2>
              <p className="text-neutral-400 text-sm mt-1">
                Are you an athlete, fan, or coach looking for your schedule and standings?
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search league name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs outline-none focus:border-cyan-400 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeagues.map((l) => (
              <Link
                key={l.id}
                href={`/league/${l.id}`}
                className="bg-neutral-900/60 hover:bg-neutral-900 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 transition-all group flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-black"
                      style={{ backgroundColor: l.primaryColor || "#3ca505" }}
                    >
                      {l.shortcode?.slice(0, 2) || "LG"}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {l.shortcode || "FLAG"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {l.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {l.seasonTitle || "Official Active Season"}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400 group-hover:text-white mt-4">
                  <span>Enter League Portal</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}

            {/* Launch new league card */}
            <Link
              href="/pricing"
              className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-dashed border-cyan-500/30 hover:border-cyan-500 rounded-2xl p-5 transition-all flex flex-col items-center justify-center text-center space-y-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div className="font-bold text-sm text-white group-hover:text-cyan-300">
                Register Your League
              </div>
              <p className="text-[11px] text-neutral-400 max-w-[200px]">
                Create a customized portal for your organization.
              </p>
            </Link>
          </div>
        </section>

        {/* INTERACTIVE PRICING CALCULATOR SECTION */}
        <section className="max-w-4xl mx-auto px-6 py-16 border-t border-white/10 space-y-8 text-center">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Interactive Calculator
            </span>
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tight">
              Transparent, Scalable Pricing
            </h2>
            <p className="text-neutral-400 text-sm max-w-lg mx-auto">
              Calculate your league's exact monthly investment with our baseline + team formula.
            </p>
          </div>

          <div className="bg-neutral-950 border border-cyan-500/30 rounded-3xl p-8 max-w-xl mx-auto space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-neutral-400">Active Teams:</span>
              <span className="text-lg font-black text-cyan-400 font-mono">{teamSlider} Teams</span>
            </div>

            <input
              type="range"
              min={4}
              max={32}
              value={teamSlider}
              onChange={(e) => setTeamSlider(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="bg-black/60 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Baseline League Fee</span>
                <span className="font-mono text-white">${baseFee}/mo</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Team Add-on ({teamSlider} × ${perTeamFee})</span>
                <span className="font-mono text-white">${teamSlider * perTeamFee}/mo</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-base text-white">
                <span>Total Monthly Fee</span>
                <span className="text-cyan-400 font-mono">${calculatedTotal}/mo</span>
              </div>
            </div>

            <Link
              href="/pricing"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <span>Get Started with {teamSlider} Teams</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <LeagueFooter />
    </div>
  );
}
