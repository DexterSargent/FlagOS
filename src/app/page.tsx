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
import { FlagOSLogo } from "@/components/FlagOSLogo";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";
import SignedInHome from "@/components/home/SignedInHome";
import { useTheme } from "@/lib/themeContext";

export default function FlagOSPlatformLandingPage() {
  const router = useRouter();
  const { activeLeagueId, settings } = useLeague();
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

        {/* FIND A LEAGUE / WATCH A GAME */}
        <section id="find-a-league" data-tour="landing-find" className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-white/10 space-y-6 scroll-mt-24">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tight">Here to Play or Watch?</h2>
            <p className="text-neutral-400 text-sm max-w-2xl mx-auto">
              Leagues choose whether to appear publicly. If your league is private, ask your coach or organizer for the link.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/leagues" className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-500/40 transition-colors">
              <Search className="w-5 h-5 text-cyan-400" />
              <div className="mt-3 font-black uppercase text-white">Find a League</div>
              <p className="mt-1 text-xs text-neutral-400">Browse leagues that list themselves publicly, with fields, game days and organizer contact.</p>
            </Link>
            <Link href="/free-agents" className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-emerald-500/40 transition-colors">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <div className="mt-3 font-black uppercase text-white">Find a Team</div>
              <p className="mt-1 text-xs text-neutral-400">No team yet? See leagues accepting free agents, or leave your details so an organizer can reach you.</p>
            </Link>
            <Link
              href="/matches/match_w16_11?demo=true"
              onClick={() => {
                sessionStorage.setItem("flagos_demo_active", "true");
                localStorage.setItem("flagos_demo_active", "true");
              }}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-amber-500/40 transition-colors"
            >
              <PlayCircle className="w-5 h-5 text-amber-400" />
              <div className="mt-3 font-black uppercase text-white">Watch a Game</div>
              <p className="mt-1 text-xs text-neutral-400">See what fans see during a live game, using a sample game from the demo league.</p>
            </Link>
          </div>
        </section>
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
              <li><Link href="/free-agents" className="hover:text-cyan-400 transition-colors">Find a Team</Link></li>
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
