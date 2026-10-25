"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { LANDING_WALKTHROUGH } from "@/lib/walkthroughs/public";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crown,
  Shield,
  Zap,
  Sparkles,
  ListChecks,
  ChevronRight,
  Play,
  PlayCircle,
  Calendar,
  Users,
  Trophy,
  BookOpen,
  ArrowRight,
  Sliders,
  Search,
  Building2,
  Timer,
  Activity,
  Flame,
  BadgeDollarSign,
  UserPlus,
  Lock,
  Globe,
  Copy,
  Check,
  MapPin,
  Menu,
  X,
  RotateCcw,
  Loader2,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { FlagOSText, renderFlagOS } from "@/components/FlagOSText";
import { FlagOSLogo, FLAGOS_LOGO } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import SignedInHome from "@/components/home/SignedInHome";
import { useTheme } from "@/lib/themeContext";

export default function FlagOSPlatformLandingPage() {
  const router = useRouter();
  const { activeLeagueId, userLeagues, settings } = useLeague();
  const { user, isLeagueAdmin, isTeamAdmin, role, isAuthorized, isPlatformAdmin, loading: authLoading } = useAuth();
  usePageGuide(user ? null : LANDING_WALKTHROUGH);
  const isMe =
    user?.email?.trim().toLowerCase() === "dextersargent@flagos.ca" ||
    user?.email?.trim().toLowerCase() === "dextersargent@gmail.com" ||
    Boolean(isPlatformAdmin);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Set after mount (never during render) so returning members skip the marketing page while auth restores.
  const [expectSignedIn, setExpectSignedIn] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setExpectSignedIn(Object.keys(localStorage).some((key) => key.startsWith("flagos_profile_")));
    } catch {}
  }, []);

  // Interactive preview tabs & live frame state
  const [activeFeatureTab, setActiveFeatureTab] = useState<"stats" | "playbook" | "live-clock" | "infrastructure">("stats");
  const [wizardMode, setWizardMode] = useState<"sync" | "async">("sync");
  const [frameKey, setFrameKey] = useState(0);
  const [loadedFrameId, setLoadedFrameId] = useState<string | null>(null);
  const frameId = `${activeFeatureTab}-${wizardMode}-${frameKey}`;
  const isFrameLoading = loadedFrameId !== frameId;
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    // The frame may finish loading before hydration attaches onLoad.
    if (doc && doc.readyState === "complete" && doc.URL !== "about:blank") {
      setLoadedFrameId(frameId);
      return;
    }
    const fallback = window.setTimeout(() => setLoadedFrameId(frameId), 8000);
    return () => window.clearTimeout(fallback);
  }, [frameId]);

  const featureTabs = [
    { id: "stats", label: "Game scoring", shortLabel: "Scoring", icon: Activity },
    { id: "playbook", label: "Playbook Studio", shortLabel: "Playbook", icon: BookOpen },
    { id: "live-clock", label: "Schedule Builder", shortLabel: "Schedule", icon: Calendar },
    { id: "infrastructure", label: "League Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
  ] as const;

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
          title: "Game scoring",
          desc: "Track scores and stats live, or enter plays after the game.",
        };
      case "playbook":
        return {
          title: "Playbook Studio",
          desc: "Up to 5 custom offensive & defensive playbooks per team, interactive route designer & wristband export.",
        };
      case "live-clock":
        return {
          title: "Season schedule builder",
          desc: "Build a round-robin schedule, reorder games, assign fields, and set up playoffs.",
        };
      case "infrastructure":
        return {
          title: "FlagOS League Dashboard",
          desc: "Standings, season stats, and live scores for your league and its fans.",
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
      name: settings?.leagueName || "FlagOS Demo League",
      shortcode: settings?.shortcode || "FLAG",
      seasonTitle: settings?.seasonTitle || "2026 Season",
      location: settings?.defaultLocation || "Turf Field 1",
      rulesFormat: "IFAF 5v5 Non-Contact",
      teamCount: 8,
      primaryColor: settings?.primaryColor || "#3ca505",
      accentColor: settings?.accentColor || "#3b82f6",
      tagline: settings?.tagline || "The Flag Football Operating System",
      logoUrl: settings?.logoUrl || FLAGOS_LOGO,
      visibility: settings?.visibility || "public",
    },
    ...userLeagues
      .filter((l) => l.id !== (activeLeagueId || "default") && l.id !== "league_private_live")
      .map((l) => ({
        id: l.id,
        name: l.name,
        shortcode: l.shortcode || "MFL",
        seasonTitle: l.seasonTitle || "2026 Championship",
        location: "Metropolitan Sports Complex",
        rulesFormat: "IFAF 5v5 Non-Contact",
        teamCount: 8,
        primaryColor: l.primaryColor || "#3ca505",
        accentColor: l.accentColor || "#3b82f6",
        tagline: "Official FlagOS Circuit",
        logoUrl: l.logoUrl || FLAGOS_LOGO,
        visibility: l.visibility || "public",
      })),
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

  if (user || (authLoading && expectSignedIn)) {
    return <SignedInHome />;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-cyan-600/20 via-blue-600/10 to-transparent rounded-full blur-[160px]"></div>
        <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px]"></div>
        <div className="absolute top-[40rem] -right-40 w-[35rem] h-[35rem] bg-blue-600/10 rounded-full blur-[140px]"></div>
      </div>

      {/* TOP PLATFORM HEADER */}
      <header data-tour="public-nav" className="relative sticky top-0 z-50 border-b border-white/10 bg-[#07090E]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0">
              <FlagOSLogo
                variant="emblem"
                size="md"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FlagOSText className="text-lg sm:text-xl leading-none" />
              </div>
              <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase hidden 2xl:block mt-1">
                The Flag Football Operating System
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden xl:flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-white">
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
            <Link
              href="/leagues"
              className="text-white hover:text-[#3CA505] transition-colors flex items-center gap-1.5"
            >
              <span>League Directory</span>
            </Link>
            {isMe && (
              <Link
                href="/my-story"
                className="text-white hover:text-[#3CA505] transition-colors"
              >
                My Story
              </Link>
            )}
            <Link
              href="/pricing"
              className="text-white hover:text-[#3CA505] transition-colors flex items-center gap-1.5"
            >
              <BadgeDollarSign className="w-3.5 h-3.5" />
              <span>Pricing</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div data-tour="public-controls" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <PageGuideButton labelClassName="hidden sm:inline" />
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
                <span className="text-cyan-300 max-w-[80px] sm:max-w-none break-all text-right">{settings?.shortcode || "Active"}</span>
              </Link>
            ) : user ? null : (
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
                  className="hidden sm:inline-flex px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold rounded-xl border border-cyan-500/30 transition-all items-center gap-1.5 shadow-[0_0_15px_rgba(var(--league-primary-rgb),0.2)]"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Explore Demo League</span>
                </Link>
              </div>
            )}

            {user && <AccountMenu />}


            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="landing-navigation-menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {isMobileMenuOpen && (
          <div id="landing-navigation-menu" className="absolute top-full left-0 right-0 z-40 xl:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/10 bg-[#07090E]/98 px-6 py-4 space-y-2 animate-in slide-in-from-top-2 shadow-2xl">
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
            <Link
              href="/leagues"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>League Directory</span>
            </Link>
            {isMe && (
              <Link
                href="/my-story"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>My Story</span>
              </Link>
            )}
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:text-[#3CA505] hover:bg-white/5 transition-colors"
            >
              <BadgeDollarSign className="w-4 h-4" />
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
                Looking for your active league? You have access to <strong className="text-white">{settings?.leagueName || "FlagOS Demo League"}</strong>.
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
      <div className="flex-1 w-full relative z-10">
        <section data-tour="landing-intro" className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-5 md:pt-16 md:pb-5 text-center space-y-6 sm:space-y-8">
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
            The Operating System for Modern <span className="text-[#3CA505]"><br className="hidden sm:inline" />Flag Football</span>
          </h1>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Link
              href="/pricing"
              className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-[#3ca505] hover:bg-[#328b04] text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.3)] hover:scale-102 active:scale-98 flex items-center gap-2"
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
              <div className="text-lg sm:text-xl md:text-3xl font-black text-cyan-500 font-mono">Season <br /> Statistics</div>
              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 font-bold uppercase mt-0.5">Cumulative Team and Individual Stats</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-cyan-500 font-mono">Custom <br /> Playbooks</div>
              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 font-bold uppercase mt-0.5">Up to 5 Per Team</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">Customizable <br /> League Rules</div>
              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 font-bold uppercase mt-0.5">5v5 IFAF Rules Pre-loaded</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl md:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">Automatic <br /> Schedule Builder</div>
              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 font-bold uppercase mt-0.5">Build your season schedule</div>
            </div>
          </div>
        </section>

        {/* THE TEAM SIDE VS THE LEAGUE SIDE */}
        <section data-tour="landing-plans" className="max-w-6xl mx-auto px-4 sm:px-6 py-5 border-t border-white/10 space-y-5">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Choose Your Plan
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
                    Manage your roster, track game stats, and build up to 5 custom playbooks in one private space for your team.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      Included With Your Team
                    </span>
                    <span className="text-neutral-500 text-[10px]">Key Features</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        icon: Play,
                        badge: "Game scoring",
                        title: "Log During or After the Game",
                        description: "Record plays and stats as they happen, or enter them later for games and scrimmages.",
                      },
                      {
                        icon: Activity,
                        badge: "Live Updating",
                        title: "Full Play-by-Play & Box Scores",
                        description: "Parents and fans can follow live plays and box scores from any connected device. No sign-in needed.",
                      },
                      {
                        icon: BookOpen,
                        badge: "Playbook Studio",
                        title: "Build & Share Up to 5 Custom Playbooks",
                        description: "Design offensive and defensive plays with preset or custom routes, defensive zones, and man coverage tools.",
                      },
                      {
                        icon: Users,
                        badge: "Roster Hub",
                        title: "Private Team Portal",
                        description: "Keep depth charts, team stats, contact details, and playbooks private. Visitors can see your roster, schedule, and player stats.",
                      },
                      {
                        icon: Trophy,
                        badge: "Career Records",
                        title: "Athlete Career Profiles & Game Logs",
                        description: "Keep a player's game stats together across FlagOS seasons, teams, and leagues.",
                      },
                      {
                        icon: Sliders,
                        badge: "No league needed",
                        title: "Run Your Own Team",
                        description: "Manage a travel, intramural, or tournament team without joining a league.",
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
                          <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-1.5 sm:gap-2">
                            <span className="text-xs font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors leading-snug min-w-0 break-words">
                              {feat.title}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold shrink-0 text-center whitespace-normal leading-tight self-start max-w-[125px] sm:max-w-none">
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
            <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-[#3b82f6]/40 rounded-3xl p-5 sm:p-8 space-y-2 relative shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col justify-between backdrop-blur-xl hover:border-[#3b82f6]/60 transition-all">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 flex items-center gap-4 bg-[#3b82f6]/20 text-[#1d4ed8] dark:text-[#60a5fa] rounded-2xl border border-[#3b82f6]/30">
                    <Crown className="w-6 h-6" />
                    <h3 className="text-xl font-black uppercase text-white tracking-tight">League Subscription</h3>
                  </div>
                  <span className="px-3 py-1 text-center rounded-full bg-[#3b82f6]/10 text-[#1d4ed8] dark:text-[#93c5fd] text-xs font-mono font-bold border border-[#3b82f6]/20">
                    For Leagues<br /> of 4-64 Teams
                  </span>
                </div>

                <div>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                    Manage schedules, scores, and teams in one place. Give commissioners, coaches, and players the access they need, with public pages for fans.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1d4ed8] dark:text-[#60a5fa] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5" />
                      Included With Your League
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
                        description: "Make the league your own with custom branding, themes, and league information. Your league pages include a small \"Powered by FlagOS\" credit in the footer.",
                      },
                      {
                        icon: Calendar,
                        badge: "Automation",
                        title: "Season schedule builder",
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
                        description: "Let players register online. League and team admins can find registered players in the free-agent pool.",
                      },
                    ].map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[0.03] transition-all group"
                      >
                        <div className="p-2 rounded-xl bg-[#3b82f6]/10 text-[#1d4ed8] dark:text-[#60a5fa] border border-[#3b82f6]/20 shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-[#3b82f6]/20 transition-all">
                          <feat.icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-1.5 sm:gap-2">
                            <span className="text-xs font-bold text-white tracking-wide group-hover:text-[#1d4ed8] dark:group-hover:text-[#93c5fd] transition-colors leading-snug min-w-0 break-words">
                              {feat.title}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-[#3b82f6]/10 text-[#1d4ed8] dark:text-[#93c5fd] border border-[#3b82f6]/20 font-bold shrink-0 text-center whitespace-normal leading-tight self-start max-w-[125px] sm:max-w-none">
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
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-[1.01] active:scale-[0.99]"
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
              Try It Yourself
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
              <FlagOSText /> in Action
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-3xl mx-auto text-balance">
              Try scoring a game, designing a play, or building a schedule. Nothing you do here is saved.
            </p>
          </div>

          {/* Feature selector tabs */}
          <div data-tour="landing-demo-tabs" role="tablist" aria-label="Feature demos" className="grid grid-cols-2 md:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-neutral-900 border border-white/10 max-w-3xl mx-auto text-xs font-bold">
            {featureTabs.map(({ id, label, shortLabel, icon: Icon }) => {
              const active = activeFeatureTab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveFeatureTab(id)}
                  className={`px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${active
                    ? "bg-emerald-400 text-black font-black shadow-[0_0_18px_rgba(52,211,153,0.35)]"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* DYNAMIC PLAY-BY-PLAY WIZARD MODE SWITCHER (SYNCHRONOUS VS ASYNCHRONOUS) */}
          {activeFeatureTab === "stats" && (
            <div data-tour="landing-scoring-modes" className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 max-w-4xl mx-auto p-3 rounded-2xl bg-gradient-to-r from-neutral-900/90 via-neutral-950 to-neutral-900/90 border border-emerald-500/30 backdrop-blur-xl shadow-lg w-full">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full sm:w-auto">
                <span className="text-xs font-bold text-neutral-300 whitespace-nowrap">
                  Scoring mode:
                </span>
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 p-1 rounded-xl bg-black/80 border border-white/10 text-xs font-bold w-full sm:w-auto">
                  <button
                    onClick={() => setWizardMode("async")}
                    className={`flex-1 sm:flex-initial min-h-10 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${wizardMode === "async"
                      ? "bg-emerald-500 text-black font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Play className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">Log after the game</span>
                  </button>
                  <button
                    onClick={() => setWizardMode("sync")}
                    className={`flex-1 sm:flex-initial min-h-10 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${wizardMode === "sync"
                      ? "bg-cyan-500 text-black font-black shadow-md"
                      : "text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    <span className="leading-tight">Live scoring</span>
                  </button>
                </div>
                <span className="text-[11px] font-mono text-neutral-400 hidden lg:inline">
                  {wizardMode === "sync"
                    ? "Game and play clocks, ball position, and downs"
                    : "Enter plays and stats without running a clock"}
                </span>
              </div>
            </div>
          )}

          {/* INTERACTIVE APPLICATION FRAME */}
          <div className="bg-white dark:bg-[#090D16] border border-slate-200 dark:border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative w-full max-w-full">
            {/* Browser-style toolbar */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-slate-100 dark:bg-[#0B0F1A] border-b border-slate-200 dark:border-white/10">
              <div className="hidden sm:flex items-center gap-1.5 shrink-0" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-black/60 border border-slate-200 dark:border-white/10 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                <Lock className="w-3 h-3 shrink-0 text-emerald-500" />
                <span className="truncate">{getDisplayUrl()}</span>
              </div>
              <button data-tour="landing-demo-reset"
                type="button"
                onClick={() => setFrameKey((k) => k + 1)}
                className="p-2.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Reset demo"
                title="Reset demo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <a
                href={getFeatureUrl().replace("embed=true&", "")}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                aria-label="Open demo in a new tab"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Embedded Real Feature App Frame */}
            <div className="relative w-full h-[min(78svh,680px)] md:h-[720px] bg-black max-w-full overflow-hidden">
              <iframe
                key={frameId}
                ref={frameRef}
                src={getFeatureUrl()}
                title="FlagOS interactive demo"
                loading="lazy"
                onLoad={() => setLoadedFrameId(frameId)}
                className="w-full h-full border-0 bg-black block"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
              {isFrameLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-[#05070C] text-slate-600 dark:text-neutral-300 pointer-events-none">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-[11px] font-mono uppercase tracking-widest">Loading {getFeatureBadge().title}</span>
                </div>
              )}
            </div>

            {/* Frame Footer Info */}
            <div className="bg-slate-50 dark:bg-[#0B0F1A] border-t border-slate-200 dark:border-white/10 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-[11px] text-neutral-400">
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{getFeatureBadge().title}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline truncate">{getFeatureBadge().desc}</span>
              </div>
              <span className="font-mono text-[10px] text-neutral-500 shrink-0 whitespace-nowrap">
                Practice demo
              </span>
            </div>
          </div>
        </section>

        {/* FIND A LEAGUE / DIRECTORY SECTION (Requires User Authentication) */}
        {user && (
          <section id="league-directory" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 border-t border-white/10 space-y-8 sm:space-y-10 scroll-mt-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div data-tour="landing-directory-search" className="flex items-center gap-2">
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
                <div className="pt-2">
                  <Link
                    href="/leagues"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
                  >
                    <span>Launch Full Near-Me League Locator Tool</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
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
                  placeholder="Search by league name, shortcode (e.g. FLAG), or city..."
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
              <div data-tour="landing-directory-results" className="p-12 rounded-3xl bg-[#090D16] border border-white/10 text-center space-y-4">
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
                          className="w-12 h-12 rounded-2xl flex items-center justify-center p-1 shrink-0 bg-transparent overflow-hidden"
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
                          <h3 className="text-base font-black uppercase tracking-wide text-white group-hover:text-emerald-300 transition-colors leading-snug break-words">
                            {league.name}
                          </h3>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {league.tagline}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Specs */}
                      <div className="p-3 rounded-2xl bg-black/50 border border-white/5 space-y-2 text-[11px]">
                        <div className="flex items-start justify-between gap-3 text-neutral-300">
                          <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Season</span>
                          </span>
                          <span className="font-bold text-white max-w-[60%] whitespace-normal text-right break-words">
                            {league.seasonTitle}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3 text-neutral-300">
                          <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Venue</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-300 max-w-[60%] whitespace-normal text-right break-words">
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
        )}
      </div>

      <footer data-tour="public-footer" className="relative z-10 border-t border-white/10 bg-black px-4 sm:px-6 py-8 sm:py-10 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="text-lg font-black uppercase tracking-wider text-white">
              <FlagOSText />
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
              <li><Link href="/leagues" className="hover:text-cyan-400 transition-colors">League Directory</Link></li>
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
