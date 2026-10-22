"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Check,
  ChevronDown,
  Sparkles,
  ListChecks,
  Receipt,
  BadgeDollarSign,
  Building2,
  Users,
  X,
  Trophy,
  Play,
  ArrowRight,
  CreditCard,
  CheckCircle2,
  Minus,
  BadgePercent,
  Menu,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { createSecureRecord } from "@/lib/secureWrites";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import { FLAGOS_LOGO } from "@/lib/brandTokens";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

export default function PricingPage() {
  const router = useRouter();
  const { activeLeagueId, settings, createLeague } = useLeague();
  const { user, isAuthorized, isPlatformAdmin } = useAuth();

  // Until real billing exists, only the platform owner's verified account can "pay".
  const isOwnerEmail = !!user?.emailVerified && isPlatformAdminEmail(user.email);

  // League interactive slider
  const [teamCount, setTeamCount] = useState<number>(4);
  const baseLeagueFee = 40;
  const perTeamFee = 15;
  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  // Active comparison tab / category filter
  const [activeMatrixTab, setActiveMatrixTab] = useState<"all" | "stats" | "playbook" | "league">("all");

  // Mobile nav state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // FAQ Accordion open states
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const [showDevelopmentNotice, setShowDevelopmentNotice] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // League subscription state
  const [leagueName, setLeagueName] = useState("");
  const [leagueShortcode, setLeagueShortcode] = useState("");
  const [leaguePrimaryColor, setLeaguePrimaryColor] = useState("#3ca505");
  const [leagueSecondaryColor, setLeagueSecondaryColor] = useState("#3b82f6");
  const [leagueTertiaryColor, setLeagueTertiaryColor] = useState("#ffffff");
  const [leagueLogoUrl, setLeagueLogoUrl] = useState("");
  const [isSubmittingLeague, setIsSubmittingLeague] = useState(false);

  // Team subscription state
  const [teamName, setTeamName] = useState("");
  const [teamShortcode, setTeamShortcode] = useState("");
  const [teamPrimaryColor, setTeamPrimaryColor] = useState("#22c55e");
  const [teamSecondaryColor, setTeamSecondaryColor] = useState("#06b6d4");
  const [teamTertiaryColor, setTeamTertiaryColor] = useState("#ffffff");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamVisibility, setTeamVisibility] = useState<"public" | "private">("public");
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleSubscribeLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerEmail || !leagueName.trim() || !leagueShortcode.trim()) return;
    setIsSubmittingLeague(true);
    setCheckoutError("");
    try {
      const newLeagueId = await createLeague({
        name: leagueName.trim(),
        shortcode: leagueShortcode.trim().toUpperCase(),
        teamCount: teamCount,
        primaryColor: leaguePrimaryColor,
        secondaryColor: leagueSecondaryColor,
        accentColor: leagueSecondaryColor,
        tertiaryColor: leagueTertiaryColor,
        logoUrl: leagueLogoUrl.trim() || FLAGOS_LOGO,
        seasonTitle: `${new Date().getFullYear()} Season`,
        visibility: "public",
      });
      setIsLeagueModalOpen(false);
      router.push(`/league/${newLeagueId}`);
    } catch (err) {
      console.error("Failed to provision league:", err);
      setCheckoutError(err instanceof Error ? err.message : "Could not create the league.");
    } finally {
      setIsSubmittingLeague(false);
    }
  };

  const handleSubscribeTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerEmail || !user?.email || !teamName.trim()) return;
    setIsSubmittingTeam(true);
    setCheckoutError("");
    try {
      const newTeamId = await createSecureRecord("team", {
        name: teamName.trim(),
        shortcode: teamShortcode.trim().toUpperCase(),
        leagueId: "",
        isStandalone: true,
        visibility: teamVisibility,
        primaryColor: teamPrimaryColor,
        secondaryColor: teamSecondaryColor,
        tertiaryColor: teamTertiaryColor,
        logoUrl: teamLogoUrl.trim() || FLAGOS_LOGO,
        adminEmails: [user.email.trim().toLowerCase()],
        subscription: {
          plan: "team",
          status: "active",
          monthlyFee: 30,
          billingCycle: "monthly",
          paymentMethod: "complimentary",
          renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
      setIsTeamModalOpen(false);
      router.push(`/teams/${newTeamId}`);
    } catch (err) {
      console.error("Failed to provision team:", err);
      setCheckoutError(err instanceof Error ? err.message : "Could not create the team.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

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
      feature: "Live Clocks (Synchronous Mode) & Customizable Clocks",
      detail: "Synchronized regulation countdown clocks, customizable play clock, and timeouts",
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
      detail: "Export print-ready 1, 2, 4, or 8-play wristband inserts and full gameday call sheets",
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
      detail: "Generate round-robin game slates and assign field locations",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Drag-and-Drop Game Rescheduling & Reordering",
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

  const faqs = [
    {
      q: "How does the per-team pricing work for leagues?",
      a: "A League Subscription has a predictable $40/month baseline fee plus $15/month for each active team. You can easily adjust your team count as divisions expand or contract. Most importantly, every team in your league receives their own private Team Portal (complete with stats, roster hub, and up to 5 playbooks) at no extra charge to the coaches.",
    },
    {
      q: "What happens during the off-season? Can we pause our subscription?",
      a: "Yes. FlagOS is built specifically for seasonal flag football circuits. You can pause or cancel your subscription at the conclusion of a season. All your league historical data, player career records, box scores, and playbooks remain safely stored and immediately reactivate when your next season begins.",
    },
    {
      q: "Do coaches or players have to pay anything if our league is subscribed?",
      a: "No! When the league is subscribed, all member teams and coaches receive full Team Plan access for free through the league license. Coaches can manage their rosters, build playbooks, and export wristbands without paying a cent.",
    },
    {
      q: "Can an independent team join a league later without losing playbooks or stats?",
      a: "Absolutely. Player stats and team playbooks are portable throughout FlagOS. If a team begins as an independent squad and subsequently enters a FlagOS league, their roster and playbooks seamlessly link to their new league division.",
    },
    {
      q: "Do parents, fans, or spectators need a subscription to view games?",
      a: "Never. Public box scores, live play-by-play tickers, league standings, and stat leaderboards are 100% free and open for fans, parents, and recruiters to follow on any device with no login required.",
    },
    {
      q: "Are there any hidden setup fees, contracts, or per-player roster charges?",
      a: "None. All FlagOS plans are month-to-month with zero contract lock-ins, zero roster headcount fees, and zero per-player surcharges. What you see on this page is all you ever pay.",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-cyan-600/15 via-emerald-600/10 to-transparent rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-[45rem] -right-40 w-[35rem] h-[35rem] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      </div>

      {/* DEDICATED FLAGOS MARKETING NAV HEADER (Replaces League Header) */}
      <header className="relative sticky top-0 z-50 border-b border-white/10 bg-[#07090E]/90 backdrop-blur-xl">
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

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-white">
            <Link
              href="/#features"
              className="text-neutral-300 hover:text-[#3CA505] transition-colors"
            >
              Features
            </Link>
            <Link
              href="/league/default?demo=true"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("flagos_demo_active", "true");
                  localStorage.setItem("flagos_demo_active", "true");
                }
              }}
              className="text-neutral-300 hover:text-[#3CA505] transition-colors"
            >
              Demo League
            </Link>
            <Link
              href="/leagues"
              className="text-neutral-300 hover:text-[#3CA505] transition-colors"
            >
              League Directory
            </Link>
            <Link
              href="/pricing"
              className="text-emerald-400 font-extrabold flex items-center gap-1.5"
            >
              <BadgeDollarSign className="w-3.5 h-3.5" />
              <span>Pricing</span>
            </Link>
          </nav>

          {/* Desktop Action CTAs */}
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
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span className="hidden xs:inline">Try Demo</span>
                </Link>
              </div>
            )}

            {user && <AccountMenu />}


            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-40 xl:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/10 bg-[#07090E] px-4 py-4 space-y-3 shadow-2xl">
            <Link
              href="/#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-300 hover:text-white py-1"
            >
              Features
            </Link>
            <Link
              href="/league/default?demo=true"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-300 hover:text-white py-1"
            >
              Demo League
            </Link>
            <Link
              href="/leagues"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-300 hover:text-white py-1"
            >
              League Directory
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-emerald-400 py-1"
            >
              Pricing
            </Link>
          </div>
        )}
      </header>

      {/* MAIN PRICING CONTENT */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16 flex-1 w-full max-w-full overflow-hidden relative z-10 space-y-12 sm:space-y-16">
        {/* Page Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transparent, Predictable Rates</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white">
            Plans Available for Teams &amp; Leagues
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
            Run an independent club with elite stats and up to 5 custom playbooks, or scale an entire league where <strong className="text-white">every franchise gets full Team Plan access at 50% off</strong> alongside automated scheduling and live gameday clocks.
          </p>

          {/* Key Value Guarantee Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Month-to-month, cancel anytime
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Zero per-player or roster surcharges
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
              <Check className="w-3.5 h-3.5 text-cyan-400" /> Free spectator &amp; parent access
            </span>
          </div>
        </div>

        {/* SIDE-BY-SIDE PLANS GRID (TEAM VS LEAGUE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* TIER 1: THE TEAM PLAN (LEFT) */}
          <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-emerald-500/40 rounded-3xl p-5 sm:p-8 space-y-6 relative shadow-[0_0_50px_rgba(16,185,129,0.12)] flex flex-col justify-between backdrop-blur-xl hover:border-emerald-500/60 transition-all">
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
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Dedicated digital headquarters for independent clubs, travel tournament squads, and coaches. Includes complete stat-tracking, private roster management, and up to 5 custom playbooks with printable wristband inserts.
                </p>
              </div>

              {/* Pricing Callout */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 min-h-[224px] flex flex-col justify-between">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">$30</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md font-bold">
                    Single Flat Fee
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  One team, with no per-team add-ons
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-neutral-400">
                    Full standalone autonomy for 1 team without requiring a parent league.
                  </p>
                </div>
              </div>

              {/* What You Get Inclusions */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Included in Team Subscription
                  </span>
                  <span className="text-neutral-500 text-[10px]">All-Inclusive</span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Private Team Portal:</strong> Depth charts, roster management, contact directory, and player game logs.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Up to 5 Custom Playbooks:</strong> Offensive &amp; defensive schemes with progression notes.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Visual Route Designer:</strong> 10+ route presets plus up to 20 custom route slots per team.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Printable Wristband Inserts:</strong> Export print-ready 1, 2, 4, or 8-play gameday inserts and call sheets.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Dynamic Play-by-Play Wizard:</strong> Rapid clockless stat logging during games or scrimmages.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Public Box Scores:</strong> Live updating play-by-play for parents &amp; fans (no login required).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Multi-Season Career Logs:</strong> Player stats follow athletes across seasons and leagues.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">100% Autonomy:</strong> Log non-league scrimmages and travel tournament matches anytime.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 space-y-3">
              <button
                onClick={() => {
                  if (isOwnerEmail) {
                    setCheckoutError("");
                    setIsTeamModalOpen(true);
                  } else {
                    setShowDevelopmentNotice(true);
                  }
                }}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>Subscribe Team Portal ($30/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TIER 2: THE LEAGUE PLAN (RIGHT) */}
          <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-[#3b82f6]/40 rounded-3xl p-5 sm:p-8 space-y-6 relative shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col justify-between backdrop-blur-xl hover:border-[#3b82f6]/60 transition-all">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="p-3 flex items-center gap-4 bg-[#3b82f6]/20 text-[#60a5fa] rounded-2xl border border-[#3b82f6]/30">
                  <Building2 className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase text-white tracking-tight">League Subscription</h3>
                </div>
                <span className="px-3 py-1 text-center rounded-full bg-[#3b82f6]/10 text-[#93c5fd] text-xs font-mono font-bold border border-[#3b82f6]/20">
                  For Leagues<br /> of 4-64 Teams
                </span>
              </div>

              <div>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  The complete flag football operating system for commissioners and organizers. Centralizes scheduling, official live clocks, standings, and automatically provisions full Team Portals for every franchise.
                </p>
              </div>

              {/* Pricing Breakdown & Dynamic Slider */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 min-h-[224px] flex flex-col justify-between space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">${totalLeagueMonthly}</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-[#60a5fa] bg-[#3b82f6]/10 px-2.5 py-1 rounded-md font-bold">
                    ${baseLeagueFee} base + ${perTeamFee}/team
                  </span>
                </div>

                {/* Team slider */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#60a5fa]" />
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
                      className="flex-1 accent-[#3b82f6] cursor-pointer"
                    />
                    <button
                      onClick={() => setTeamCount((c) => Math.min(64, c + 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bulk Savings Badge */}
                <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-xl p-2.5 text-[11px] flex items-center justify-between text-[#93c5fd]">
                  <span>Standalone Value: ${teamCount * 30}/mo</span>
                  <span className="font-bold text-white bg-[#3b82f6]/20 px-2 py-0.5 rounded font-mono">
                    Save ${teamCount * 15}/mo (50% Off)
                  </span>
                </div>
              </div>

              {/* What You Get Inclusions */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#60a5fa] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Included in League Subscription
                  </span>
                  <span className="text-neutral-500 text-[10px]">Turnkey League Engine</span>
                </div>

                <ul className="space-y-2.5 text-xs text-neutral-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">All Team Features Included:</strong> Every team gets their private portal, full stats, and up to 5 playbooks.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Official Gameday Clocks:</strong> Synchronized regulation countdown clocks, customizable play clock, and timeouts.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Automated Seasonal Scheduler:</strong> Generate round-robin match slates, reorder slots, and assign fields.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Standings &amp; Playoff Brackets:</strong> Automated tiebreaker logic, point differential, and seeded brackets.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">League Stat Leaderboards:</strong> Automatic leaderboards for passers, receivers, flaggers, and scorers.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Customizable League Portal:</strong> Custom brand colors, logo, season titles, and custom shortcodes.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Registration Pipeline:</strong> Optional public registration intake &amp; free agent recruit pool.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-white">Multi-Division Ready:</strong> Run recreational, competitive, and co-ed divisions seamlessly.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6">
              <button
                onClick={() => {
                  if (isOwnerEmail) {
                    setCheckoutError("");
                    setIsLeagueModalOpen(true);
                  } else {
                    setShowDevelopmentNotice(true);
                  }
                }}
                className="w-full py-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>Launch &amp; Subscribe League (${totalLeagueMonthly}/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* VALUE COMPARISON: WHY FLAGOS REPLACES FRAGMENTED TOOLS */}
        <section className="space-y-8 pt-8 border-t border-white/10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Total Cost of Ownership
            </span>
            <h2 className="text-2xl md:text-4xl font-black uppercase text-white tracking-tight">
              One Unified OS vs 4 Fragmented Subscriptions
            </h2>
            <p className="text-neutral-400 text-xs md:text-sm">
              Most leagues juggle multiple single-purpose subscriptions with disconnected rosters and manual spreadsheet work. FlagOS unifies your entire circuit under one predictable rate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Fragmented Apps */}
            <div className="p-6 rounded-3xl bg-[#0B0F19] border border-red-500/20 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Traditional Way</span>
                  <h3 className="text-base font-black text-white uppercase">Fragmented Software</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-400 border-t border-white/5 pt-3">
                <div className="flex justify-between">
                  <span>Sports Stat Tracking App:</span>
                  <span className="text-white font-mono">$75 - $120/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Team Communication Tool:</span>
                  <span className="text-white font-mono">$20 - $35/team</span>
                </div>
                <div className="flex justify-between">
                  <span>Tournament / League Scheduler:</span>
                  <span className="text-white font-mono">$30 - $60/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Playbook &amp; Armband Software:</span>
                  <span className="text-white font-mono">$15/mo per coach</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                <div className="text-xs text-red-400 font-bold">Result: Disconnected data, duplicate rosters, $200+/mo.</div>
              </div>
            </div>

            {/* Column 2: FlagOS Standalone Team */}
            <div className="p-6 rounded-3xl bg-[#0B0F19] border border-emerald-500/30 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Single Team</span>
                  <h3 className="text-base font-black text-white uppercase"><span className="normal-case">FlagOS</span> Team Plan</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-300 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Dynamic Stat-Tracking Wizard included</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Up to 5 Playbooks &amp; Wristband export</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Public live updating box scores</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Persistent career player records</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Total Flat Cost:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">$30 / month</span>
              </div>
            </div>

            {/* Column 3: FlagOS Bundled League */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0B0F19] to-[#1e3a8a]/20 border border-[#3b82f6]/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#60a5fa]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#93c5fd] uppercase tracking-wider block">Ultimate Value</span>
                  <h3 className="text-base font-black text-white uppercase"><span className="normal-case">FlagOS</span> League Plan</h3>
                </div>
              </div>

              <div className="space-y-2 text-xs text-neutral-300 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#60a5fa]" />
                  <span>Turnkey scheduling &amp; live gameday clocks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#60a5fa]" />
                  <span>Full Team Plan hubs for <strong>every team</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#60a5fa]" />
                  <span>50% bulk discount ($15 vs $30/team)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#60a5fa]" />
                  <span>Automated standings, brackets &amp; leaders</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Starts At (4 Teams):</span>
                <span className="text-xl font-black text-[#60a5fa] font-mono">$100 / month</span>
              </div>
            </div>
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
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold max-w-full overflow-x-auto hide-scrollbar shrink-0">
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

        {/* FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
        <section className="space-y-6 pt-8 border-t border-white/10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              Got Questions?
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tight">
              Pricing &amp; Billing FAQ
            </h2>
            <p className="text-neutral-400 text-xs md:text-sm">
              Everything you need to know about team portals, season billing pauses, and data retention.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-[#0B0F19] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    id={`pricing-faq-question-${index}`}
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`pricing-faq-answer-${index}`}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-white text-sm">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-cyan-400" : ""
                      }`}
                    />
                  </button>
                  <div
                    id={`pricing-faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`pricing-faq-question-${index}`}
                    hidden={!isOpen}
                    className="px-5 pb-4 text-xs text-neutral-300 leading-relaxed border-t border-white/5 pt-3"
                  >
                    {faq.a}
                  </div>
                </div>
              );
            })}
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
            href="/league/default?demo=true"
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold whitespace-nowrap border border-white/10 transition-colors"
          >
            Explore Active Demo
          </Link>
        </div>
      </main>

      {/* DEDICATED MARKETING FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-black px-4 sm:px-6 py-8 sm:py-10 text-xs text-neutral-400 mt-12">
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
              <li><Link href="/#features" className="hover:text-cyan-400 transition-colors">Key Features</Link></li>
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
              {user && (
                <li><Link href="/#league-directory" className="hover:text-cyan-400 transition-colors">League Directory</Link></li>
              )}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Get Started</h4>
            <ul className="space-y-2">
              <li><Link href="/pricing" className="hover:text-emerald-400 transition-colors text-emerald-400 font-bold">Pricing Plans</Link></li>
              <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Sign In</Link></li>
              <li><Link href="/league/default?demo=true" className="hover:text-cyan-400 transition-colors">Try the Demo</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} FlagOS. All rights reserved.</span>
          <span className="text-neutral-600 text-[11px]">Empowering flag football teams and leagues worldwide.</span>
        </div>
      </footer>

      {/* LEAGUE CHECKOUT MODAL */}
      {isLeagueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-950 border border-cyan-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsLeagueModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-cyan-500/20 rounded-2xl text-cyan-400 border border-cyan-500/30">
                <Building2 className="w-6 h-6" />
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

              {/* League Logo (Optional, defaults to FlagOS logo) */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>League Logo (Optional)</span>
                  </label>
                  {leagueLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setLeagueLogoUrl("")}
                      className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/20 bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={leagueLogoUrl.trim() || FLAGOS_LOGO}
                      alt="League Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={leagueLogoUrl}
                      onChange={(e) => setLeagueLogoUrl(e.target.value)}
                      placeholder="Paste image URL or upload below..."
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-white text-xs outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold cursor-pointer border border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-cyan-400" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (typeof ev.target?.result === "string") setLeagueLogoUrl(ev.target.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {leagueLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200">Brand Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: leaguePrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: leagueSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: leagueTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{leaguePrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3ca505", "#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League primary color ${c}`}
                        onClick={() => setLeaguePrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-white/20 ${leaguePrimaryColor === c ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leaguePrimaryColor}
                        onChange={(e) => setLeaguePrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{leagueSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3B82F6", "#06B6D4", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League secondary color ${c}`}
                        onClick={() => setLeagueSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-white/20 ${leagueSecondaryColor === c ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueSecondaryColor}
                        onChange={(e) => setLeagueSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{leagueTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League tertiary color ${c}`}
                        onClick={() => setLeagueTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-white/20 ${leagueTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueTertiaryColor.startsWith("#") ? leagueTertiaryColor : "#ffffff"}
                        onChange={(e) => setLeagueTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
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
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isSubmittingLeague ? "Provisioning League..." : `Confirm & Pay $${totalLeagueMonthly}/mo`}</span>
              </button>
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{checkoutError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TEAM CHECKOUT MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-950 border border-white/20 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsTeamModalOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
                <Users className="w-6 h-6" />
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

              {/* Team Logo (Optional, defaults to FlagOS logo) */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Team Logo / Crest (Optional)</span>
                  </label>
                  {teamLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setTeamLogoUrl("")}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-white/20 bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                    <img
                      src={teamLogoUrl.trim() || FLAGOS_LOGO}
                      alt="Team Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={teamLogoUrl}
                      onChange={(e) => setTeamLogoUrl(e.target.value)}
                      placeholder="Paste image URL or upload below..."
                      className="w-full px-3 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-400"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold cursor-pointer border border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-emerald-400" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (typeof ev.target?.result === "string") setTeamLogoUrl(ev.target.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {teamLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200">Team Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: teamPrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: teamSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: teamTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{teamPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team primary color ${c}`}
                        onClick={() => setTeamPrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-white/20 transition-transform cursor-pointer ${teamPrimaryColor === c ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamPrimaryColor}
                        onChange={(e) => setTeamPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{teamSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#06B6D4", "#3B82F6", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team secondary color ${c}`}
                        onClick={() => setTeamSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-white/20 transition-transform cursor-pointer ${teamSecondaryColor === c ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamSecondaryColor}
                        onChange={(e) => setTeamSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-400">{teamTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team tertiary color ${c}`}
                        onClick={() => setTeamTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-white/20 transition-transform cursor-pointer ${teamTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamTertiaryColor.startsWith("#") ? teamTertiaryColor : "#ffffff"}
                        onChange={(e) => setTeamTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="team-visibility" className="text-xs font-bold text-neutral-300 block mb-1">Team Portal Visibility</label>
                <select
                  id="team-visibility"
                  value={teamVisibility}
                  onChange={(e) => setTeamVisibility(e.target.value === "private" ? "private" : "public")}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400"
                >
                  <option value="public">Public – anyone can view schedule, roster names &amp; stats</option>
                  <option value="private">Private – only coaches &amp; rostered players</option>
                </select>
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
                <CreditCard className="w-4 h-4" />
                <span>{isSubmittingTeam ? "Provisioning Team..." : "Confirm & Pay $30/mo"}</span>
              </button>
              <p className="text-center text-[11px] text-neutral-500">Owner account: payment is recorded as complimentary — no card is charged.</p>
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{checkoutError}</p>
              )}
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
