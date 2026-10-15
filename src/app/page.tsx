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
  BadgeDollarSign,
  UserPlus,
  RotateCw,
  ExternalLink,
  Lock,
  Globe,
  Copy,
  Check,
  MapPin,
  Menu,
  X,
} from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { FlagOSText, renderFlagOS } from "@/components/FlagOSText";
import { FlagOSLogo, FLAGOS_LOGO } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/lib/themeContext";

export default function FlagOSPlatformLandingPage() {
  const router = useRouter();
  const { activeLeagueId, userLeagues, settings } = useLeague();
  const { user, isLeagueAdmin, isTeamAdmin, role, isAuthorized, isPlatformAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Interactive preview tabs & live frame state
  const [activeFeatureTab, setActiveFeatureTab] = useState<"stats" | "playbook" | "live-clock" | "infrastructure">("stats");
  const [wizardMode, setWizardMode] = useState<"sync" | "async">("sync");
  const [frameKey, setFrameKey] = useState(0);

  const getFeatureUrl = () => {
    switch (activeFeatureTab) {
      case "stats":
        return `/matches/match_w16_12/play-by-play?embed=true&demo=true&mode=${wizardMode}`;
      case "playbook":
        return `/teams/team_kc/playbook?embed=true&demo=true`;
      case "live-clock":
        return `/schedule?embed=true&demo=true`;
      case "infrastructure":
        return `/league/default?embed=true&demo=true`;
    }
  };

  const getDisplayUrl = () => {
    switch (activeFeatureTab) {
      case "stats":
        return `flagos.ca/matches/match_w16_12/play-by-play?mode=${wizardMode}`;
      case "playbook":
        return `flagos.ca/teams/team_kc/playbook`;
      case "live-clock":
        return `flagos.ca/schedule`;
      case "infrastructure":
        return `flagos.ca/league/default`;
    }
  };

  const getFeatureBadge = () => {
    switch (activeFeatureTab) {
      case "stats":
        return {
          title: "Dynamic Play-by-Play Wizard",
          desc: "Full gameday stat tracker with dual operating modes for live clocks or clockless fast-logging.",
        };
      case "playbook":
        return {
          title: "Playbook Studio",
          desc: "Up to 5 custom offensive & defensive playbooks per team, interactive route designer & wristband export.",
        };
      case "live-clock":
        return {
          title: "Automated Seasonal Scheduler",
          desc: "Round-robin matchmaking engine, drag-and-drop game slot ordering, field assignments & playoff brackets.",
        };
      case "infrastructure":
        return {
          title: "FlagOS League Dashboard",
          desc: "Real-time standings, cumulative statistics, live match tickers, and public spectator portal.",
        };
    }
  };

  // League Finder search & filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "5v5" | "7v7">("all");
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);

  // Interactive slider on landing page
  const [teamSlider, setTeamSlider] = useState(8);
  const baseFee = 40;
  const perTeamFee = 15;
  const calculatedTotal = baseFee + teamSlider * perTeamFee;

  // Directory catalog of leagues
  // STRICT REQUIREMENT: Only leagues with visibility !== "private" appear in the public league directory!
  const directoryCatalog = [
    {
      id: activeLeagueId || "default",
      name: settings?.leagueName || "FlagOS League",
      shortcode: settings?.shortcode || "FLAG",
      seasonTitle: settings?.seasonTitle || "2026 Season",
      location: settings?.defaultLocation || "Turf Field 1",
      rulesFormat: "IFAF 5v5 Non-Contact",
      teamCount: 8,
      primaryColor: settings?.primaryColor || "#3ca505",
      accentColor: settings?.accentColor || "#22c55e",
      tagline: settings?.tagline || "The Flag Football Operating System",
      logoUrl: settings?.logoUrl || FLAGOS_LOGO,
      visibility: settings?.visibility || "public",
    },
    ...userLeagues
      .filter((l) => l.id !== (activeLeagueId || "default"))
      .map((l) => ({
        id: l.id,
        name: l.name,
        shortcode: l.shortcode || "MFL",
        seasonTitle: l.seasonTitle || "2026 Championship",
        location: "Metropolitan Sports Complex",
        rulesFormat: "IFAF 5v5 Non-Contact",
        teamCount: 8,
        primaryColor: l.primaryColor || "#3ca505",
        accentColor: l.accentColor || "#22c55e",
        tagline: "Official FlagOS Circuit",
        logoUrl: l.logoUrl || FLAGOS_LOGO,
        visibility: l.visibility || "public",
      })),
    {
      id: "league_opfc",
      name: "Ontario Premier Flag Conference",
      shortcode: "OPFC",
      seasonTitle: "2026 Spring Invitational",
      location: "Lamport Stadium, Toronto",
      rulesFormat: "IFAF 5v5 Non-Contact",
      teamCount: 12,
      primaryColor: "#0284c7",
      accentColor: "#38bdf8",
      tagline: "Premier competitive 5v5 tournament circuit",
      logoUrl: FLAGOS_LOGO,
      visibility: "public" as const,
    },
    {
      id: "league_metro7",
      name: "Metro 7v7 Non-Contact Circuit",
      shortcode: "M7V7",
      seasonTitle: "2026 Summer League",
      location: "Centennial Park Field 3",
      rulesFormat: "7v7 Screen Non-Contact",
      teamCount: 8,
      primaryColor: "#d97706",
      accentColor: "#f59e0b",
      tagline: "Fast-tempo non-contact 7-on-7 division",
      logoUrl: FLAGOS_LOGO,
      visibility: "public" as const,
    },
    {
      id: "league_pcfa",
      name: "Pacific Coast Flag Association",
      shortcode: "PCFA",
      seasonTitle: "2026 Open Division",
      location: "Empire Fields, Vancouver",
      rulesFormat: "IFAF 5v5 Non-Contact",
      teamCount: 10,
      primaryColor: "#059669",
      accentColor: "#10b981",
      tagline: "British Columbia collegiate and adult flag league",
      logoUrl: FLAGOS_LOGO,
      visibility: "public" as const,
    },
  ];

  // STRICT FILTER: Private leagues are excluded from public directory
  const publicDirectoryLeagues = directoryCatalog.filter(
    (l) => l.visibility !== "private"
  );

  const filteredDirectoryLeagues = publicDirectoryLeagues.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.shortcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.rulesFormat.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFormat =
      selectedFormat === "all" ||
      (selectedFormat === "5v5" && l.rulesFormat.includes("5v5")) ||
      (selectedFormat === "7v7" && l.rulesFormat.includes("7v7"));

    return matchesSearch && matchesFormat;
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-cyan-600/20 via-blue-600/10 to-transparent rounded-full blur-[160px]"></div>
        <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-[40rem] -right-40 w-[35rem] h-[35rem] bg-blue-600/10 rounded-full blur-[140px]"></div>
      </div>

      {/* TOP PLATFORM HEADER */}
      <header className="border-b border-white/10 bg-[#07090E]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0 shrink">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <FlagOSLogo
                variant="emblem"
                size="md"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FlagOSText className="text-xl sm:text-2xl leading-none" />
              </div>
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase hidden sm:block mt-1">
                The Flag Football Operating System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-white">
            <a
              href="#features"
              className="text-white hover:text-[#3CA505] transition-colors"
            >
              Features
            </a>
            <Link
              href="/league/default?demo=true"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("flagos_demo_active", "true");
                  localStorage.setItem("flagos_demo_active", "true");
                }
              }}
              className="text-white hover:text-[#3CA505] transition-colors"
            >
              Demo League
            </Link>
            <a
              href="#league-directory"
              className="text-white hover:text-[#3CA505] transition-colors flex items-center gap-1.5"
            >
              <span>League Directory</span>
            </a>
            <a
              href="#my-story"
              className="text-white hover:text-[#3CA505] transition-colors"
            >
              My Story
            </a>
            <Link
              href="/pricing"
              className="text-white hover:text-[#3CA505] transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pricing</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle size="md" />

            {isPlatformAdmin && (
              <Link
                href="/admin"
                aria-label="Platform Admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/10"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Platform Admin</span>
              </Link>
            )}

            {isAuthorized ? (
              <Link
                href={`/league/${activeLeagueId || "default"}`}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">League Portal:</span>
                <span className="text-cyan-300 truncate max-w-[80px] sm:max-w-none">{settings?.shortcode || "Active"}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-white hover:text-[#3CA505] text-xs font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/league/default?demo=true"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("flagos_demo_active", "true");
                      localStorage.setItem("flagos_demo_active", "true");
                    }
                  }}
                  className="hidden sm:inline-flex px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 hover:text-white text-xs font-bold rounded-xl border border-cyan-500/30 transition-all items-center gap-1.5 shadow-[0_0_15px_rgba(var(--league-primary-rgb),0.2)]"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Explore Demo League</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#07090E]/98 px-6 py-4 space-y-2 animate-in slide-in-from-top-2">
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>Features</span>
            </a>
            <Link
              href="/league/default?demo=true"
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("flagos_demo_active", "true");
                  localStorage.setItem("flagos_demo_active", "true");
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Demo League</span>
            </Link>
            <a
              href="#league-directory"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>League Directory</span>
            </a>
            <a
              href="#my-story"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>My Story</span>
            </a>
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pricing</span>
            </Link>
          </div>
        )}
      </header>

      {/* ACTIVE LEAGUE WELCOME BANNER (IF RETURNING AUTHORIZED USER) */}
      {isAuthorized && (
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
      )}


      {/* HERO SECTION */}
      <main className="flex-1 w-full relative z-10">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-5 md:pt-16 md:pb-5 text-center space-y-6 sm:space-y-8">
          {/* Official Logo */}
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div className="relative group">
              <FlagOSLogo
                variant="hero"
                size="hero"
                alt="FlagOS - The Flag Football Operating System"
                className="relative w-48 sm:w-64 md:w-72 h-auto"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-tight sm:leading-none">
            The Operating System for Modern <span className="text-[#7ED321]"><br className="hidden sm:inline" />Flag Football</span>
          </h1>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Link
              href="/pricing"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.4)] hover:scale-102 active:scale-98 flex items-center gap-2"
            >
              <BadgeDollarSign className="w-4 h-4" />
              <span>View Pricing</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href="/league/default?demo=true"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("flagos_demo_active", "true");
                  localStorage.setItem("flagos_demo_active", "true");
                }
              }}
              className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all border border-white/10 flex items-center gap-2 group hover:border-cyan-500/40"
            >
              <PlayCircle className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Explore Demo League</span>
            </Link>
          </div>

          {/* Social Proof metrics */}
          <div className="pt-5 grid grid-cols-2 gap-3 max-w-3xl mx-auto border-t border-white/10">
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-cyan-500 font-mono">Season Long <br /> Statistics</div>
              <div className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase mt-0.5">Cumulative Team and Individual Stats</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-cyan-500 font-mono">Custom <br /> Playbooks</div>
              <div className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase mt-0.5">Up to 5 Per Team</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-emerald-500 font-mono">Customizable <br /> League Rules</div>
              <div className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase mt-0.5">5v5 IFAF Rules Pre-loaded</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-emerald-500 font-mono">Automatic <br /> Schedule Builder</div>
              <div className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase mt-0.5">Plan your entire season in seconds</div>
            </div>
          </div>
        </section>

        {/* BUILDER STORY */}
        <section id="my-story" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/10 scroll-mt-24">
          <div className="grid md:grid-cols-[0.8fr_1.2fr] gap-8 md:gap-12 items-start">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
                The person behind FlagOS
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white tracking-tight">
                Built by a coach, <span className="text-emerald-400">not a company.</span>
              </h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                I’m just one guy who coaches flag football and built a tool to solve a problem I saw firsthand.
              </p>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-neutral-900/90 to-neutral-950/90 border border-cyan-500/20 p-6 sm:p-8 space-y-4 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                When 90 people came out to try out for our competitive 5v5 flag team, I started thinking about what came next. I wanted to keep that energy and those players engaged in the 11v11 semi-contact flag league that followed.
              </p>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                As a coach, I wanted a better way to run the league and track stats, so players could follow their progress and stay connected throughout the season. I built the infrastructure I wished we had—and that project grew into FlagOS.
              </p>
              <p className="pt-3 border-t border-white/10 text-xs font-mono uppercase tracking-wider text-emerald-300">
                A real coaching problem. A system built to solve it.
              </p>
            </div>
          </div>
        </section>

        {/* THE TEAM SIDE VS THE LEAGUE SIDE */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-5 border-t border-white/10 space-y-5">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Subscription Breakdown
            </span>
            <h2 className="text-2xl md:text-5xl font-black uppercase text-white tracking-tight">
              Plans Available for Teams &amp; Leagues
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* TIER 1: THE TEAM PLAN (LEFT) */}
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-emerald-500/40 rounded-3xl p-5 sm:p-8 space-y-2 relative shadow-[0_0_50px_rgba(16,185,129,0.12)] flex flex-col justify-between backdrop-blur-xl hover:border-emerald-500/60 transition-all">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                    <Users className="w-6 h-6" />
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

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      What You Get With a Team Subscription
                    </span>
                    <span className="text-neutral-500 text-[10px]">Key Features</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        icon: Play,
                        badge: "Dynamic Play-by-Play Wizard",
                        title: "Asynchronous Game Logging",
                        description: "Log games and scrimmages with access to a dynamic play-by-play wizard built specifically for streamlining flag football stat-tracking during or after the game.",
                      },
                      {
                        icon: Activity,
                        badge: "Live Updating",
                        title: "Full Play-by-Play & Box Scores",
                        description: "Live updating play-by-play and box scores for every game. Parents and fans can follow along from anywhere with service, no log-in needed.",
                      },
                      {
                        icon: BookOpen,
                        badge: "Playbook Studio",
                        title: "Build & Share Up to 5 Custom Playbooks",
                        description: "Intuitive play design interface for offensive and defensive playbooks. Interactive visual route designer with route presets and custom routes. Defensive zone presets and man coverage tools.",
                      },
                      {
                        icon: Users,
                        badge: "Roster Hub",
                        title: "Private Team Portal",
                        description: "Dedicated team portal with depth charts, customizable team statistics & trends dashboard,  contact information, and your teams playbooks. Unauthorized users will see only your teams roster, schedule, and individual player statistics when viewing your portal",
                      },
                      {
                        icon: Trophy,
                        badge: "Career Records",
                        title: "Athlete Career Profiles & Game Logs",
                        description: "Individual player stats from every game follow athletes across all FlagOS seasons, teams, and leagues building comprehensive career histories.",
                      },
                      {
                        icon: Sliders,
                        badge: "100% Autonomy",
                        title: "Full Independence",
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
                  className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>View Pricing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* TIER 2: THE LEAGUE PLAN (RIGHT) */}
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-cyan-500/40 rounded-3xl p-5 sm:p-8 space-y-2 relative shadow-[0_0_50px_rgba(var(--league-primary-rgb),0.15)] flex flex-col justify-between backdrop-blur-xl hover:border-cyan-500/60 transition-all">
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

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      What you get with a league subscription
                    </span>
                    <span className="text-neutral-500 text-[10px]">Key Features</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        icon: Sparkles,
                        badge: "50% Off Team Subscriptions",
                        title: "All Team Features Included",
                        description: "Every team in your league automatically gets their private team portal, complete team and player stats, and up to 5 custom playbooks.",
                      },
                      {
                        icon: Timer,
                        badge: "Live Gameday",
                        title: "Official Game Management With Live Clocks",
                        description: "Synchronized game clock and play clock, possession indicator, down counter, and interactive timeouts.",
                      },
                      {
                        icon: Building2,
                        badge: "Branding",
                        title: "Customizable League Portal",
                        description: "Make the league your own with custom branding, themes, and league information. The only FlagOS branding on your league is a brief \"Powered by FlagOS\" disclaimer in the footer.",
                      },
                      {
                        icon: Calendar,
                        badge: "Automation",
                        title: "Automated Seasonal Scheduler",
                        description: "Generate a full season schedule, drag-and-drop to reorder game slots, and assign fields automatically. Playoff brackets are automatically generated based on your league's playoff structure and seeding rules.",
                      },
                      {
                        icon: Trophy,
                        badge: "Competition",
                        title: "Automated Standings & Stat Leaderboards",
                        description: "Real-time standings, and automated league-wide rankings for various statistical categories.",
                      },
                      {
                        icon: Flame,
                        badge: "Recruitment",
                        title: "Registration Portal & Free Agent Board (Optional)",
                        description: "Public registration pipeline for incoming players. Players who complete the form are added to the free-agent pool viewable by league and team admins.",
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
                  className="w-full py-4 rounded-xl bg-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.3)] hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>View Pricing</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FEATURE SHOWCASE */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/10 space-y-6 sm:space-y-8 scroll-mt-20 relative w-full max-w-full">
          <div id="interactive-demo" className="absolute -top-24 left-0" />
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Interactive Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
              <span className="text-white">FLAG</span><span style={{ color: "#3CA505" }}>OS</span> Powerhouse Features
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-2xl mx-auto">
              Test drive the actual system features directly in the sandboxed interactive frame below. Zero database writes.
            </p>
          </div>

          {/* Feature selector tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-neutral-900 border border-white/10 max-w-3xl mx-auto text-[11px] sm:text-xs font-bold">
            <button
              onClick={() => setActiveFeatureTab("stats")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer text-center ${activeFeatureTab === "stats" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Dynamic Play-by-Play Wizard
            </button>
            <button
              onClick={() => setActiveFeatureTab("playbook")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer text-center ${activeFeatureTab === "playbook" ? "bg-emerald-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Playbook Studio
            </button>
            <button
              onClick={() => setActiveFeatureTab("live-clock")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer text-center ${activeFeatureTab === "live-clock" ? "bg-cyan-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              Automated Schedule-Builder
            </button>
            <button
              onClick={() => setActiveFeatureTab("infrastructure")}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer text-center ${activeFeatureTab === "infrastructure" ? "bg-cyan-500 text-black font-black" : "text-neutral-400 hover:text-white"
                }`}
            >
              League Dashboard
            </button>
          </div>

          {/* DYNAMIC PLAY-BY-PLAY WIZARD MODE SWITCHER (SYNCHRONOUS VS ASYNCHRONOUS) */}
          {activeFeatureTab === "stats" && (
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 max-w-4xl mx-auto p-3 rounded-2xl bg-gradient-to-r from-neutral-900/90 via-neutral-950 to-neutral-900/90 border border-emerald-500/30 backdrop-blur-xl shadow-lg w-full">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full sm:w-auto">
                <span className="text-xs font-bold text-neutral-300 whitespace-nowrap">
                  Wizard Operating Mode:
                </span>
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 p-1 rounded-xl bg-black/80 border border-white/10 text-xs font-bold w-full sm:w-auto">
                  <button
                    onClick={() => setWizardMode("async")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${wizardMode === "async"
                      ? "bg-emerald-500 text-black font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">Asynchronous <span className="hidden xs:inline">(Clockless)</span></span>
                  </button>
                  <button
                    onClick={() => setWizardMode("sync")}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${wizardMode === "sync"
                      ? "bg-cyan-500 text-black font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">Synchronous <span className="hidden xs:inline">(Live Clocks)</span></span>
                  </button>
                </div>
                <span className="text-[11px] font-mono text-neutral-400 hidden lg:inline">
                  {wizardMode === "sync"
                    ? "Official live clock, play clock, spot ball & down counter"
                    : "Rapid clockless stat keeper for high-tempo post-game or sideline logging"}
                </span>
              </div>
            </div>
          )}

          {/* INTERACTIVE APPLICATION FRAME */}
          <div className="bg-[#090D16] border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative w-full max-w-full">
            {/* Embedded Real Feature App Frame */}
            <div className="relative w-full h-[460px] sm:h-[560px] md:h-[680px] bg-black max-w-full overflow-hidden">
              <iframe
                key={`${activeFeatureTab}-${wizardMode}-${frameKey}`}
                src={getFeatureUrl()}
                title="FlagOS Real Feature Live Sandbox"
                className="w-full h-full border-0 bg-black block"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            </div>

            {/* Frame Footer Info */}
            <div className="bg-[#0B0F1A] border-t border-white/10 px-4 sm:px-5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 text-[11px] text-neutral-400 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <span className="font-bold text-white">{getFeatureBadge().title}</span>
                <span className="hidden sm:inline">•</span>
                <span className="line-clamp-1">{getFeatureBadge().desc}</span>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 shrink-0">
                Isolated Client Sandbox
              </span>
            </div>
          </div>
        </section>

        {/* FIND A LEAGUE / DIRECTORY SECTION */}
        <section id="league-directory" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t border-white/10 space-y-8 sm:space-y-10 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                  <Globe className="w-3.5 h-3.5" />
                  Public League Directory
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  ({filteredDirectoryLeagues.length} Public Leagues Listed)
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
                Find &amp; Join a Flag Football League
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Search publicly listed leagues across FlagOS. Prospective athletes and coaches can explore schedules, live standings, and open registration.
              </p>
            </div>

            {/* Private League Notice */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 max-w-md text-xs space-y-1.5 shrink-0">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Looking for a Private League?</span>
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Private leagues are hidden from this public directory. They can only be accessed with a direct URL link provided by your commissioner.
              </p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-[#090D16] border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by league name, shortcode (e.g. OPFC, FLAG), or city..."
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs shrink-0 font-bold">
              <button
                onClick={() => setSelectedFormat("all")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${selectedFormat === "all"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
                  }`}
              >
                All Rulesets
              </button>
              <button
                onClick={() => setSelectedFormat("5v5")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${selectedFormat === "5v5"
                  ? "bg-cyan-500 text-black font-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
                  }`}
              >
                5v5
              </button>
              <button
                onClick={() => setSelectedFormat("7v7")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${selectedFormat === "7v7"
                  ? "bg-amber-400 text-black font-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
                  }`}
              >
                7v7
              </button>
            </div>
          </div>

          {/* Directory Grid */}
          {filteredDirectoryLeagues.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#090D16] border border-white/10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Public Leagues Found</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  No public leagues match &ldquo;{searchQuery}&rdquo;. Note that private leagues do not appear in this directory and require a direct URL link from the commissioner.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFormat("all");
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDirectoryLeagues.map((league) => (
                <div
                  key={league.id}
                  className="bg-[#0B0F19] border border-white/10 hover:border-emerald-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_10px_40px_rgba(16,185,129,0.12)] group relative overflow-hidden"
                >
                  {/* Card Header & Status */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase text-black"
                          style={{ backgroundColor: league.primaryColor }}
                        >
                          {league.shortcode}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-neutral-400">
                          {league.rulesFormat}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400">
                        <Globe className="w-3 h-3" />
                        <span>Public Directory</span>
                      </span>
                    </div>

                    {/* League Branding & Title */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center p-1.5 shrink-0 border border-white/15 shadow-md overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${league.primaryColor}, ${league.accentColor})`,
                        }}
                      >
                        {league.logoUrl ? (
                          <img
                            src={league.logoUrl}
                            alt={league.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Shield className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black uppercase tracking-wide text-white group-hover:text-emerald-300 transition-colors leading-snug truncate">
                          {league.name}
                        </h3>
                        <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          {league.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Season</span>
                        </span>
                        <span className="font-bold text-white truncate max-w-[150px]">
                          {league.seasonTitle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Venue</span>
                        </span>
                        <span className="font-mono text-[10px] text-neutral-300 truncate max-w-[150px]">
                          {league.location}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Division Capacity</span>
                        </span>
                        <span className="font-mono text-[10px] text-amber-300 font-bold">
                          {league.teamCount} Teams
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/league/${league.id}`}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 text-center shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                      >
                        <span>View Portal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        href="/join"
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-1.5 text-center active:scale-[0.98]"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Register</span>
                      </Link>
                    </div>

                    {/* Copy Direct URL */}
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const url = `${window.location.origin}/league/${league.id}`;
                          navigator.clipboard?.writeText(url);
                          setCopiedLeagueId(league.id);
                          setTimeout(() => setCopiedLeagueId(null), 2000);
                        }
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg text-[10px] font-mono text-neutral-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLeagueId === league.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Direct URL Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Direct Access Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black px-4 sm:px-6 py-8 sm:py-10 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="text-lg font-black uppercase tracking-wider text-white">
              FLAG<span style={{ color: "#3CA505" }}>OS</span>
            </span>
            <p className="leading-relaxed text-neutral-500">The Flag Football Operating System</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Explore</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-cyan-400 transition-colors">Key Features</a></li>
              <li>
                <Link
                  href="/league/default?demo=true"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("flagos_demo_active", "true");
                      localStorage.setItem("flagos_demo_active", "true");
                    }
                  }}
                  className="hover:text-cyan-400 transition-colors"
                >
                  Demo League
                </Link>
              </li>
              <li><a href="#league-directory" className="hover:text-cyan-400 transition-colors">League Directory</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Get Started</h4>
            <ul className="space-y-2">
              <li><Link href="/pricing" className="hover:text-amber-300 transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Sign In</Link></li>
              <li><Link href="/league/default?demo=true" className="hover:text-cyan-400 transition-colors">Try the Demo</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 text-neutral-500">
          <span>© {new Date().getFullYear()} FlagOS. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
