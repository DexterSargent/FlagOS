"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { PRICING_WALKTHROUGH, TEAM_SUBSCRIPTION_WALKTHROUGH, LEAGUE_SUBSCRIPTION_WALKTHROUGH, DEVELOPMENT_NOTICE_WALKTHROUGH } from "@/lib/walkthroughs/public";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Check,
  ChevronDown,
  Sparkles,
  ListChecks,
  Receipt,
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
import {
  clearCheckoutDraft, getCheckoutStatus, listUnusedPurchases, readCheckoutDraft, saveCheckoutDraft, startCheckout,
  type CheckoutStatus,
} from "@/lib/billingClient";
import { FlagOSText } from "@/components/FlagOSText";
import { FlagOSLogo } from "@/components/FlagOSLogo";
import { FLAGOS_LOGO } from "@/lib/brandTokens";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

export default function PricingPage() {
  usePageGuide(PRICING_WALKTHROUGH);
  const router = useRouter();
  const { activeLeagueId, settings, createLeague } = useLeague();
  const { user, isAuthorized, isPlatformAdmin } = useAuth();

  // Until real billing exists, only the platform owner's verified account can "pay" (or ?preview mode).
  const isOwnerEmail =
    (!!user?.emailVerified && isPlatformAdminEmail(user.email)) ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview"));

  // League interactive slider
  const [teamCount, setTeamCount] = useState<number>(4);
  const baseLeagueFee = 40;
  const perTeamFee = 20;
  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  // Active comparison tab / category filter
  const [activeMatrixTab, setActiveMatrixTab] = useState<"all" | "team" | "playbook" | "stats" | "league">("all");

  // Mobile nav state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // FAQ Accordion open states
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const [showDevelopmentNotice, setShowDevelopmentNotice] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  usePageGuide(isLeagueModalOpen ? LEAGUE_SUBSCRIPTION_WALKTHROUGH : isTeamModalOpen ? TEAM_SUBSCRIPTION_WALKTHROUGH : showDevelopmentNotice ? DEVELOPMENT_NOTICE_WALKTHROUGH : null, 2);

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

  // Stripe checkout (server-flagged). The platform owner keeps the complimentary path.
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [paidPurchase, setPaidPurchase] = useState<CheckoutStatus | null>(null);
  const [unusedPurchases, setUnusedPurchases] = useState<CheckoutStatus[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const usesCheckout = !isOwnerEmail && billingEnabled;
  const finishingLeague = paidPurchase?.kind === "league";
  const finishingTeam = paidPurchase?.kind === "team";

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { enabled: false })
      .then((result: { enabled?: boolean }) => { if (!cancelled) setBillingEnabled(result.enabled === true); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user || !billingEnabled || isOwnerEmail) return;
    let cancelled = false;
    listUnusedPurchases()
      .then((result) => { if (!cancelled) setUnusedPurchases(result.unused); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user, billingEnabled, isOwnerEmail]);

  const openPurchaseSetup = (purchase: CheckoutStatus) => {
    const draft = readCheckoutDraft();
    setPaidPurchase(purchase);
    setCheckoutError("");
    if (purchase.kind === "league") {
      setTeamCount(purchase.teamCount);
      if (draft?.kind === "league") {
        if (typeof draft.name === "string") setLeagueName(draft.name);
        if (typeof draft.shortcode === "string") setLeagueShortcode(draft.shortcode);
        if (typeof draft.primaryColor === "string") setLeaguePrimaryColor(draft.primaryColor);
        if (typeof draft.secondaryColor === "string") setLeagueSecondaryColor(draft.secondaryColor);
        if (typeof draft.tertiaryColor === "string") setLeagueTertiaryColor(draft.tertiaryColor);
        if (typeof draft.logoUrl === "string") setLeagueLogoUrl(draft.logoUrl);
      }
      setIsLeagueModalOpen(true);
    } else {
      if (draft?.kind === "team") {
        if (typeof draft.name === "string") setTeamName(draft.name);
        if (typeof draft.shortcode === "string") setTeamShortcode(draft.shortcode);
        if (typeof draft.primaryColor === "string") setTeamPrimaryColor(draft.primaryColor);
        if (typeof draft.secondaryColor === "string") setTeamSecondaryColor(draft.secondaryColor);
        if (typeof draft.tertiaryColor === "string") setTeamTertiaryColor(draft.tertiaryColor);
        if (typeof draft.logoUrl === "string") setTeamLogoUrl(draft.logoUrl);
        if (draft.visibility === "private" || draft.visibility === "public") setTeamVisibility(draft.visibility);
      }
      setIsTeamModalOpen(true);
    }
  };

  // Returning from Stripe: confirm payment with the server (never the redirect itself), then finish setup.
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("checkout");
    const requestId = params.get("request");
    if (!result) return;
    window.history.replaceState(null, "", "/pricing");
    if (result === "canceled") {
      setCheckoutNotice({ tone: "info", text: "Checkout was cancelled. Nothing was charged." });
      return;
    }
    if (result !== "success" || !requestId) return;
    let cancelled = false;
    setCheckoutNotice({ tone: "info", text: "Confirming your payment…" });
    void (async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        try {
          const status = await getCheckoutStatus(requestId);
          if (cancelled) return;
          if (status.status === "consumed" && status.createdEntityId) {
            router.push(status.kind === "league" ? `/league/${status.createdEntityId}` : `/teams/${status.createdEntityId}`);
            return;
          }
          if (status.status === "paid") {
            setCheckoutNotice({ tone: "info", text: "Payment confirmed. Review your details and finish setup." });
            openPurchaseSetup(status);
            return;
          }
          if (status.status === "expired" || status.status === "failed") {
            setCheckoutNotice({ tone: "error", text: "That checkout did not complete. Nothing was charged." });
            return;
          }
        } catch (error) {
          if (attempt === 9) {
            setCheckoutNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not confirm your payment." });
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!cancelled) {
        setCheckoutNotice({ tone: "info", text: "Your payment is still processing. This page will offer setup once Stripe confirms it — refresh in a minute." });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per signed-in return from Stripe
  }, [user]);

  const openPlanModal = (kind: "team" | "league") => {
    setCheckoutError("");
    if (isOwnerEmail || usesCheckout) {
      if (usesCheckout && !user) {
        router.push("/login?redirect=/pricing");
        return;
      }
      setPaidPurchase(null);
      if (kind === "team") setIsTeamModalOpen(true);
      else setIsLeagueModalOpen(true);
      return;
    }
    setShowDevelopmentNotice(true);
  };

  const beginCheckout = async (kind: "team" | "league", draft: Record<string, unknown>) => {
    saveCheckoutDraft({ kind, ...draft });
    await startCheckout(kind, kind === "league" ? teamCount : undefined);
  };

  const handleSubscribeLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!isOwnerEmail && !usesCheckout && !finishingLeague) || !leagueName.trim() || !leagueShortcode.trim()) return;
    setIsSubmittingLeague(true);
    setCheckoutError("");
    try {
      if (usesCheckout && !finishingLeague) {
        await beginCheckout("league", {
          name: leagueName.trim(), shortcode: leagueShortcode.trim().toUpperCase(), primaryColor: leaguePrimaryColor,
          secondaryColor: leagueSecondaryColor, tertiaryColor: leagueTertiaryColor, logoUrl: leagueLogoUrl.trim(),
        });
        return;
      }
      const newLeagueId = await createLeague({
        name: leagueName.trim(),
        shortcode: leagueShortcode.trim().toUpperCase(),
        teamCount: finishingLeague ? paidPurchase.teamCount : teamCount,
        primaryColor: leaguePrimaryColor,
        secondaryColor: leagueSecondaryColor,
        accentColor: leagueSecondaryColor,
        tertiaryColor: leagueTertiaryColor,
        logoUrl: leagueLogoUrl.trim() || FLAGOS_LOGO,
        seasonTitle: `${new Date().getFullYear()} Season`,
        visibility: "public",
        ...(finishingLeague ? { billingRequestId: paidPurchase.requestId } : {}),
      });
      clearCheckoutDraft();
      setPaidPurchase(null);
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
    if ((!isOwnerEmail && !usesCheckout && !finishingTeam) || !user?.email || !teamName.trim()) return;
    setIsSubmittingTeam(true);
    setCheckoutError("");
    try {
      if (usesCheckout && !finishingTeam) {
        await beginCheckout("team", {
          name: teamName.trim(), shortcode: teamShortcode.trim().toUpperCase(), visibility: teamVisibility,
          primaryColor: teamPrimaryColor, secondaryColor: teamSecondaryColor, tertiaryColor: teamTertiaryColor,
          logoUrl: teamLogoUrl.trim(),
        });
        return;
      }
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
        ...(finishingTeam
          ? { billingRequestId: paidPurchase.requestId }
          : {
            subscription: {
              plan: "team",
              status: "active",
              monthlyFee: 40,
              billingCycle: "monthly",
              paymentMethod: "complimentary",
              renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          }),
      });
      clearCheckoutDraft();
      setPaidPurchase(null);
      setIsTeamModalOpen(false);
      router.push(`/teams/${newTeamId}`);
    } catch (err) {
      console.error("Failed to provision team:", err);
      setCheckoutError(err instanceof Error ? err.message : "Could not create the team.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  // Comprehensive Feature Comparison Matrix items (Coach & League Director friendly)
  const matrixRows = [
    // --- 1. TEAM & ROSTER HUB (team) ---
    {
      category: "team",
      feature: "Private Team Hub",
      detail: "Your private team home for roster management, player contact info, depth charts, and playbooks",
      team: "1 Dedicated Team",
      league: "Included for Every Team",
    },
    {
      category: "team",
      feature: "Free Fan & Spectator Pages",
      detail: "Parents and fans follow your schedule, scores, and player stats on any phone with zero login required",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Roster & Depth Charts",
      detail: "Set offensive and defensive starters, backups, jersey numbers, and custom positions",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Independent Team Freedom",
      detail: "Run travel teams, tournament squads, or scrimmages on your own without needing a parent league",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Take Your Team Anywhere",
      detail: "Keep your playbooks, rosters, and player stats intact when entering tournaments or joining a FlagOS league",
      team: true,
      league: true,
    },
    {
      category: "team",
      feature: "Coach & Staff Permissions",
      detail: "Give assistant coaches access while keeping playbooks and team contact lists private from outside eyes",
      team: true,
      league: true,
    },

    // --- 2. PLAYBOOK DESIGNER (playbook) ---
    {
      category: "playbook",
      feature: "Custom Playbooks",
      detail: "Build complete offensive and defensive pass and run schemes designed specifically for flag football",
      team: "Up to 5 Playbooks",
      league: "Up to 5 per Team (All Teams)",
    },
    {
      category: "playbook",
      feature: "Visual Route Designer",
      detail: "Interactive field board with standard presets: Slant, Out, Post, Go, Dig, Wheel, Drag, Corner, Hitch, Comeback",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Save Custom Routes",
      detail: "Draw unique team route concepts and save up to 20 custom routes to reuse across any play",
      team: "Up to 20 Custom Routes",
      league: "Up to 20 per Team",
    },
    {
      category: "playbook",
      feature: "Coach Notes & Progression Reads",
      detail: "Add quarterback reads, receiver assignments, and coaching keys directly to each play",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Defensive Schemes & Coverages",
      detail: "Set up Cover 2, Cover 3, blitz packages, designated rusher alignments, and man-to-man coverage",
      team: true,
      league: true,
    },
    {
      category: "playbook",
      feature: "Printable Wristbands & Call Sheets",
      detail: "One-click PDF export for 1, 2, 4, or 8-play wristband inserts and formatted sideline call sheets",
      team: true,
      league: true,
    },

    // --- 3. SIDELINE STATS & CLOCKS (stats) ---
    {
      category: "stats",
      feature: "Clockless Sideline Stat Tracking",
      detail: "Tap-and-go stat logger built for a single coach on the sideline during scrimmages or post-game",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Live Clocks & Gameday Management",
      detail: "Official regulation game clock, 25-second play clock, stoppage tracking, and timeout controls",
      team: false,
      league: true,
    },
    {
      category: "stats",
      feature: "Down & Distance Tracker",
      detail: "Live line of scrimmage, first down line, down counter, and possession indicators updated in real time",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Live Play-by-Play & Box Scores",
      detail: "Real-time game feed and box scores updated down-by-down for parents and fans watching from anywhere",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Season Player & Team Stats",
      detail: "Track completions, passing/rushing/receiving yards, touchdowns, sacks, flag pulls, and extra points",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "Multi-Season Player Career Stats",
      detail: "Player game logs and stats follow athletes across all FlagOS seasons, teams, and leagues",
      team: true,
      league: true,
    },
    {
      category: "stats",
      feature: "League Stat Leaderboards",
      detail: "Automatic rankings for top passers, receivers, rushers, flag pullers, defensive stoppers, and scorers",
      team: false,
      league: true,
    },

    // --- 4. LEAGUE OPERATIONS (league) ---
    {
      category: "league",
      feature: "Free Team Portals for Every Coach",
      detail: "Every team in your league gets their own private portal, stats hub, and 5 playbooks at no extra cost to them",
      team: "1 Independent Portal",
      league: "Included for All Teams",
    },
    {
      category: "league",
      feature: "Automated Season Scheduler",
      detail: "Generate a complete regular season schedule with balanced home/away games and field times in seconds",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "No Back-to-Back Games",
      detail: "Scheduler automatically prevents teams from playing back-to-back games and avoids field double-booking",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Drag-and-Drop Rescheduling",
      detail: "Easily adjust kickoff times, swap fields, or move games to different dates with a quick drag",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Standings & Tiebreakers",
      detail: "Real-time league standings with automatic head-to-head tiebreakers and point differential calculations",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Playoff Bracket Generator",
      detail: "Automatically generate seeded single or double elimination playoff brackets based on regular season finish",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Multiple Divisions",
      detail: "Run youth, adult, recreational, competitive, and co-ed divisions all within the same league",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Custom League Branding",
      detail: "Feature your league logo, custom colors, division names, league rules, and personalized web link",
      team: "Team Colors Only",
      league: true,
    },
    {
      category: "league",
      feature: "Public Directory or Private Link",
      detail: "List your league publicly for new players to find you, or keep it unlisted with a direct invite link",
      team: "Public or Unlisted",
      league: true,
    },
    {
      category: "league",
      feature: "Player Registration & Free Agent Pool",
      detail: "Online signup form for players, plus an unassigned free agent board to quickly build and fill team rosters",
      team: false,
      league: true,
    },
    {
      category: "league",
      feature: "Run Multiple Leagues or Tournaments",
      detail: "Manage multiple leagues, weekend tournaments, or seasonal divisions all under one commissioner account",
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
      a: "A League Subscription has a predictable $40/month baseline fee plus $20/month for each active team. You can easily adjust your team count as divisions expand or contract. Most importantly, every team in your league receives their own private Team Portal (complete with stats, roster hub, and up to 5 playbooks) at no extra charge to the coaches.",
    },
    {
      q: "What happens during the off-season? Can we pause our subscription?",
      a: "Yes. FlagOS is built specifically for seasonal flag football leagues. You can pause or cancel your subscription at the conclusion of a season. All your league historical data, player career records, box scores, and playbooks remain safely stored and immediately reactivate when your next season begins.",
    },
    {
      q: "Do coaches or players have to pay anything if our league is subscribed?",
      a: "No. When the league is subscribed, all member teams and coaches receive full Team Plan access for free through the league license. Coaches can manage their rosters, build playbooks, and export wristbands without paying a cent.",
    },
    {
      q: "Are there any limits on roster sizes or headcount fees?",
      a: "Rosters hold up to five players per spot on the field: 25 players for 5v5, 35 for 7v7 and 40 for 8v8. There are never per-player fees, per-athlete roster charges or registration penalties.",
    },
    {
      q: "Can an independent team join a league later without losing playbooks or stats?",
      a: "Yes. An independent team can join a FlagOS league without starting over. Its roster, playbooks and recorded player stats stay with the team.",
    },
    {
      q: "Do parents, fans, or spectators need a subscription to view games?",
      a: "Never. Public box scores, live play-by-play tickers, league standings, and stat leaderboards are 100% free and open for fans, parents, and recruiters to follow on any device with no login or app download required.",
    },
    {
      q: "What sideline equipment or devices do I need on gameday?",
      a: "Any smartphone, tablet, or laptop with a web browser works. No special hardware, proprietary timers, or app store downloads are required. A coach can record plays without running a game clock.",
    },
    {
      q: "What if we play at a park with spotty or weak cell service?",
      a: "You can download and print clean PDF call sheets and wristband inserts before heading to the field. For live scoring, you need an internet connection. If service is unreliable, record plays on paper and enter them after the game.",
    },
    {
      q: "Can FlagOS accommodate custom rules like 5v5, 7v7, youth, or adult divisions?",
      a: "Yes. Whether you run non-contact 5v5 youth divisions, competitive adult 7v7 formats, or recreational co-ed brackets, FlagOS supports customizable rush counts, blitz rules, clock lengths, and field dimensions.",
    },
    {
      q: "Can coaches share playbooks and wristband inserts with their players?",
      a: "Yes. Coaches can export formatted wristband inserts (in 1, 2, 4, or 8-play layouts) and full-page play sheets directly to PDF, or share read-only play links with their athletes ahead of practice.",
    },
    {
      q: "What if teams drop out or new teams join mid-season?",
      a: "League subscriptions prorate cleanly. If you add a team mid-season, you simply adjust your team slider up and they receive an instant team portal. If a team drops, reduce your active team count and your next monthly invoice adjusts down automatically.",
    },
    {
      q: "Who owns our league and team data? Can we export our records?",
      a: "You own 100% of your data. You can export complete game logs, player career stats, box scores, and league standings anytime. We never sell your team contact information or advertise third-party products to your players and families.",
    },
    {
      q: "How difficult is it to migrate our league from spreadsheets or another system?",
      a: "Very straightforward. You can create teams, organize divisions, and generate your balanced regular season schedule in minutes. The clean interface means volunteer coaches and officials can start logging stats and viewing rosters immediately without training sessions.",
    },
    {
      q: "Are there any hidden setup fees, contracts, or cancellation penalties?",
      a: "None. All FlagOS plans are month-to-month with zero contract lock-ins, zero onboarding charges, and zero cancellation penalties. What you see on this page is all you ever pay.",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#07090E] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-800 dark:selection:text-emerald-200 flex flex-col relative transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 dark:opacity-100 transition-opacity">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-blue-600/15 via-emerald-600/10 to-transparent rounded-full blur-[160px] pointer-events-none"></div>
        <div className="absolute top-96 -left-40 w-[35rem] h-[35rem] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-[45rem] -right-40 w-[35rem] h-[35rem] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      </div>

      {/* DEDICATED FLAGOS MARKETING NAV HEADER (Replaces League Header) */}
      <header data-tour="public-nav" className="relative sticky top-0 z-50 border-b border-neutral-200/80 dark:border-white/10 bg-white/80 dark:bg-[#07090E]/80 backdrop-blur-xl">
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
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono tracking-widest uppercase hidden 2xl:block mt-1">
                The Flag Football Operating System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-5 text-[11px] font-bold uppercase tracking-wider">
            <Link
              href="/#features"
              className="text-neutral-600 dark:text-neutral-300 hover:text-[#3CA505] dark:hover:text-[#3CA505] transition-colors"
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
              className="text-neutral-600 dark:text-neutral-300 hover:text-[#3CA505] dark:hover:text-[#3CA505] transition-colors"
            >
              Demo League
            </Link>
            <Link
              href="/leagues"
              className="text-neutral-600 dark:text-neutral-300 hover:text-[#3CA505] dark:hover:text-[#3CA505] transition-colors"
            >
              League Directory
            </Link>
            <Link
              href="/pricing"
              className="text-[#3CA505] font-extrabold transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Action CTAs */}
          <div data-tour="public-controls" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <PageGuideButton labelClassName="hidden sm:inline" />
            <ThemeToggle size="md" />

            {isPlatformAdmin && (
              <Link
                href="/admin"
                aria-label="Platform Admin"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-500/20"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Platform Admin</span>
              </Link>
            )}

            {isAuthorized ? (
              <Link
                href={`/league/${activeLeagueId || "default"}`}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white text-xs font-bold rounded-xl border border-neutral-200 dark:border-white/10 transition-colors flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">League Portal:</span>
                <span className="text-cyan-700 dark:text-cyan-300 truncate max-w-[80px] sm:max-w-none">{settings?.shortcode || "Active"}</span>
              </Link>
            ) : user ? null : (
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/20 bg-white dark:bg-white/5 hover:bg-neutral-50 dark:hover:bg-white/10 text-neutral-900 dark:text-white hover:text-[#3CA505] text-xs font-bold transition-all shadow-sm"
              >
                Sign In
              </Link>
            )}

            {user && <AccountMenu />}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 z-40 xl:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-[#07090E] px-4 py-4 space-y-3 shadow-2xl">
            <Link
              href="/#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white py-1"
            >
              Features
            </Link>
            <Link
              href="/league/default?demo=true"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white py-1"
            >
              Demo League
            </Link>
            <Link
              href="/leagues"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white py-1"
            >
              League Directory
            </Link>
            <Link
              href="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-bold text-[#3CA505] py-1"
            >
              Pricing
            </Link>
          </div>
        )}
      </header>

      {/* MAIN PRICING CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full max-w-full overflow-hidden relative z-10 space-y-12 sm:space-y-16">
        {(checkoutNotice || (unusedPurchases.length > 0 && !isLeagueModalOpen && !isTeamModalOpen)) && (
          <div className="max-w-3xl mx-auto space-y-3">
            {checkoutNotice && (
              <p
                role={checkoutNotice.tone === "error" ? "alert" : "status"}
                className={`rounded-xl border px-4 py-3 text-sm ${checkoutNotice.tone === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"}`}
              >
                {checkoutNotice.text}
              </p>
            )}
            {!isLeagueModalOpen && !isTeamModalOpen && unusedPurchases.map((purchase) => (
              <div key={purchase.requestId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                <span>
                  You have a paid {purchase.kind === "league" ? `league plan (${purchase.teamCount} teams)` : "team plan"} that is not set up yet.
                </span>
                <button
                  type="button"
                  onClick={() => openPurchaseSetup(purchase)}
                  className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-black uppercase tracking-wider text-white cursor-pointer"
                >
                  Finish setup
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Page Hero Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Transparent, Predictable Rates</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-neutral-950 dark:text-white">
            Plans Available for Teams &amp; Leagues
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base leading-relaxed">
            Manage a team with game stats and up to 5 custom playbooks, or run a league where <strong className="text-neutral-950 dark:text-white">every team gets full Team Plan access at 50% off</strong> with scheduling, player registration, and league management included.
          </p>

          {/* Key Value Guarantee Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 shadow-sm">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Month-to-month, cancel anytime
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 shadow-sm">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Zero per-player or roster surcharges
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300 shadow-sm">
              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa]" /> Free spectator access
            </span>
          </div>
        </div>

        {/* SIDE-BY-SIDE PLANS GRID (TEAM VS LEAGUE) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">          {/* TIER 1: THE TEAM PLAN (LEFT) */}
          <div data-tour="pricing-team" className="bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 relative shadow-lg dark:shadow-none hover:shadow-xl transition-all flex flex-col justify-between">
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">Independent Club</span>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">Team Plan</h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                  Flat Rate
                </span>
              </div>

              {/* Subtitle description (Equalized 3 lines on desktop) */}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed sm:min-h-[52px]">
                Manage your roster, record game stats, and design up to 5 custom playbooks for your independent or travel team.
              </p>

              {/* Pricing & Capacity Section (Symmetrically aligned 4 rows) */}
              <div className="space-y-3 pt-2 pb-1 border-y border-neutral-100 dark:border-white/5">
                {/* Row 1: Price and Badge */}
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className="text-4xl sm:text-5xl font-black text-neutral-950 dark:text-white tabular-nums tracking-tight">$40</span>
                    <span className="text-neutral-500 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-bold">
                    Single Flat Fee
                  </span>
                </div>

                {/* Row 2: Capacity Metric */}
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 pt-1 flex-wrap gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Roster Capacity: <span className="font-mono font-bold">Up to 25 players (5v5) · 40 (8v8)</span>
                  </span>
                  <span className="font-mono">($40 flat • Zero per-player fees)</span>
                </div>

                {/* Row 3: Height-matched Status Row (Matches the League slider bar height) */}
                <div className="min-h-10 flex-wrap gap-2 py-2 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 px-3 flex items-center justify-between text-xs">
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    Tournament &amp; Scrimmage Ready
                  </span>
                  <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Month-to-Month
                  </span>
                </div>

                {/* Row 4: Value and Savings Callout */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] flex flex-wrap gap-2 items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <span>Standalone Value: $100/mo</span>
                  <span className="font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-950 dark:text-white">
                    Save $60/mo ($720/yr) • 60% Off
                  </span>
                </div>
              </div>

              {/* What You Get Inclusions */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center justify-between h-5">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Included in Team Plan
                  </span>
                  <span className="text-neutral-500 text-[10px]">All-Inclusive</span>
                </div>

                <ul className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Private Team Portal:</strong> Manage full roster, player contacts, depth charts, jersey numbers, and game logs.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">5 Custom Playbooks:</strong> Build offensive and defensive pass &amp; run schemes with progression reads and coach notes.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Visual Route Designer:</strong> 10+ standard route presets plus 20 custom route slots tailored to your playbook.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Gameday Call Sheets:</strong> One-click PDF export for clean sideline call sheets and printable wristband cards.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Game Scoring:</strong> Record completions, touchdowns, interceptions, and flag pulls without running a game clock.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Live Public Box Scores:</strong> Real-time play-by-play links for parents and fans with no sign-in or subscription needed.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Multi-Season Career Stats:</strong> Track athlete progression, lifetime yardage, and scoring across multiple years.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">No League Required:</strong> Track non-league tournaments, weekend invitationals, and team scrimmages anytime.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 dark:border-white/10 mt-6">
              <button
                onClick={() => openPlanModal("team")}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>{isOwnerEmail ? "Create Team Portal (no charge)" : "Subscribe Team Portal ($40/mo)"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TIER 2: THE LEAGUE PLAN (RIGHT) */}
          <div data-tour="pricing-league" className="bg-white dark:bg-neutral-900/80 border-2 border-blue-500/50 dark:border-blue-500/40 rounded-3xl p-6 sm:p-8 space-y-6 relative shadow-xl hover:border-blue-500/70 transition-all flex flex-col justify-between">
            <div className="space-y-6">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#60a5fa]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-[#60a5fa] uppercase tracking-widest block">4 to 64 Teams</span>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">League Plan</h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-800 dark:text-[#93c5fd] text-xs font-mono font-bold border border-blue-500/20 whitespace-nowrap shrink-0">
                  50% Bulk Rate
                </span>
              </div>

              {/* Subtitle description (Equalized 3 lines on desktop) */}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed sm:min-h-[52px]">
                Manage schedules, game clocks, and standings in one place. Every team gets its own private team portal.
              </p>

              {/* Pricing Breakdown & Dynamic Slider (Symmetrically aligned 4 rows) */}
              <div className="space-y-3 pt-2 pb-1 border-y border-neutral-100 dark:border-white/5">
                {/* Row 1: Price and Badge */}
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className="text-4xl sm:text-5xl font-black text-neutral-950 dark:text-white tabular-nums tracking-tight">${totalLeagueMonthly}</span>
                    <span className="text-neutral-500 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-blue-800 dark:text-[#60a5fa] bg-blue-500/10 px-2.5 py-1 rounded-lg font-bold">
                    ${baseLeagueFee} base + ${perTeamFee}/team
                  </span>
                </div>

                {/* Row 2: Capacity Metric */}
                <div className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400 pt-1 flex-wrap gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa]" />
                    Active Teams: <span className="font-mono font-bold">{teamCount} Teams</span>
                  </span>
                  <span className="font-mono">
                    (${baseLeagueFee} base + {teamCount} × ${perTeamFee})
                  </span>
                </div>

                {/* Row 3: Team Stepper & Slider */}
                <div className="flex items-center gap-3 min-h-10">
                  <button
                    onClick={() => setTeamCount((c) => Math.max(4, c - 1))}
                    aria-label="Decrease team count"
                    className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer border border-neutral-200 dark:border-transparent shrink-0"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={4}
                    max={64}
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                    aria-label="League team count slider"
                    className="min-w-0 min-h-10 flex-1 accent-[#2563eb] cursor-pointer"
                  />
                  <button
                    onClick={() => setTeamCount((c) => Math.min(64, c + 1))}
                    aria-label="Increase team count"
                    className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 text-neutral-900 dark:text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer border border-neutral-200 dark:border-transparent shrink-0"
                  >
                    +
                  </button>
                </div>

                {/* Row 4: Bulk Savings Callout */}
                {(() => {
                  const standaloneMonthly = teamCount * 40;
                  const leagueMonthly = baseLeagueFee + teamCount * perTeamFee;
                  const monthlySavings = Math.max(0, standaloneMonthly - leagueMonthly);
                  const annualSavings = monthlySavings * 12;
                  const savingsPct = standaloneMonthly > 0 ? Math.round((monthlySavings / standaloneMonthly) * 100) : 0;
                  return (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] flex flex-wrap gap-2 items-center justify-between text-blue-800 dark:text-[#93c5fd]">
                      <span>Standalone Value: ${standaloneMonthly}/mo</span>
                      <span className="font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded text-blue-950 dark:text-white">
                        Save ${monthlySavings}/mo (${annualSavings.toLocaleString()}/yr) • {savingsPct}% Off
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* What You Get Inclusions */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-800 dark:text-[#60a5fa] flex items-center justify-between h-5">
                  <span className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    Included in League Plan
                  </span>
                  <span className="text-neutral-500 text-[10px]">Turnkey League Engine</span>
                </div>

                <ul className="space-y-3 text-xs text-neutral-700 dark:text-neutral-300">
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">All Team Features Included:</strong> Every team gets its own private portal, roster manager, and 5 playbooks.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Official Gameday Clocks:</strong> Synchronized regulation countdown timers, play clocks, stoppage tracking, and timeouts.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Automated Scheduler:</strong> Generate fair round-robin slates, adjust field slots, and prevent back-to-back conflicts.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Standings &amp; Playoff Brackets:</strong> Automatic tiebreakers, point differential tracking, and seeded tournament brackets.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">League Leaderboards:</strong> Live rankings for passing, receiving, flag pulls, defensive stops, and total scoring.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Custom League Branding:</strong> Add custom logos, colors, division names, league rules, and custom web links.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Registration &amp; Free Agents:</strong> Collect signups and assign unattached free agents into division rosters easily.</span>
                  </li>
                  <li className="sm:min-h-[38px] flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa] shrink-0 mt-0.5" />
                    <span><strong className="text-neutral-950 dark:text-white">Multi-Division Support:</strong> Run competitive, recreational, youth, and co-ed divisions under one league roof.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 dark:border-white/10 mt-6">
              <button
                onClick={() => openPlanModal("league")}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>{isOwnerEmail ? "Create League (no charge)" : `Launch & Subscribe League ($${totalLeagueMonthly} CAD/mo)`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* VALUE COMPARISON: WHAT IT WOULD COST TO BUILD THIS STACK FROM SCRATCH */}
        <section data-tour="pricing-savings" className="space-y-8 pt-8 border-t border-neutral-200 dark:border-white/10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
              Everything in One Plan
            </span>
            <h2 className="text-2xl md:text-4xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">
              Compare the Cost of Separate Tools
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm">
              Compare the estimated cost of separate tools with a FlagOS plan. Schedules, playbooks, rosters, and stats are included in one subscription.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* PANEL 1: SINGLE TEAM COST BREAKDOWN (PER MONTH) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900/90 border border-emerald-500/30 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block font-bold">Independent Clubs</span>
                      <h3 className="text-lg font-black text-neutral-950 dark:text-white uppercase">Single Team Breakdown</h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20 whitespace-nowrap shrink-0">
                    Software Worth: $100 / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fragmented Standalone Tools (Team) */}
                  <div className="p-4 rounded-2xl bg-red-500/[0.04] dark:bg-red-950/20 border border-red-500/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                        <X className="w-4 h-4 shrink-0" />
                        <span>Fragmented Tools</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <div className="flex justify-between">
                          <span>Playbook Builder &amp; Routes:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$20/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Roster Hub &amp; Depth Charts:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sideline Stat Logger &amp; Scores:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$40/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Live Parent &amp; Fan Passes:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Call Sheets &amp; Wristband Inserts:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Career Stats &amp; Season Logs:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$10/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex justify-between items-baseline">
                      <span className="text-[11px] text-neutral-500">Standalone Value:</span>
                      <span className="text-sm font-black text-red-700 dark:text-red-400 font-mono">$100 / mo</span>
                    </div>
                  </div>

                  {/* FlagOS Team Plan */}
                  <div className="p-4 rounded-2xl bg-emerald-500/[0.06] dark:bg-emerald-950/30 border border-emerald-500/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>FlagOS Team Plan</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>5 Playbooks &amp; Route Designer</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Full Roster Hub &amp; Depth Charts</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Sideline Stat Logger &amp; Box Scores</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Free spectator links for parents</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>One-click PDF call sheet export</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Multi-season player career stats</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400">FlagOS Flat Rate:</span>
                      <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 font-mono">$40 / mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Callout */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-950 dark:text-emerald-300">
                <span className="font-semibold">Total Team Savings:</span>
                <span className="font-bold text-neutral-950 dark:text-white font-mono bg-emerald-500/20 px-2 py-0.5 rounded">
                  Save $60/mo ($720/yr) • $100 worth for $40/mo
                </span>
              </div>
            </div>

            {/* PANEL 2: LEAGUE COST BREAKDOWN (10-TEAM LEAGUE) */}
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-neutral-900/90 border border-[#3b82f6]/30 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-blue-700 dark:text-[#60a5fa]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-blue-800 dark:text-[#60a5fa] uppercase tracking-wider block font-bold">10-Team League Setup</span>
                      <h3 className="text-lg font-black text-neutral-950 dark:text-white uppercase">10-Team League Savings</h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#3b82f6]/10 text-blue-800 dark:text-[#93c5fd] text-xs font-mono font-bold border border-[#3b82f6]/20 whitespace-nowrap shrink-0">
                    Software Worth: $650 / mo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fragmented Stack (League) */}
                  <div className="p-4 rounded-2xl bg-red-500/[0.04] dark:bg-red-950/20 border border-red-500/20 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                        <X className="w-4 h-4 shrink-0" />
                        <span>Fragmented Tools</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <div className="flex justify-between">
                          <span>10 Team Portals:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$400/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>League Hub &amp; Registration:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$90/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Live Stats &amp; Play-by-Play:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$70/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Automated Scheduler:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$35/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Standings &amp; Brackets:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$25/mo</span>
                        </div>
                        <div className="flex justify-between">
                          <span>League Leaderboards:</span>
                          <span className="text-neutral-900 dark:text-white font-mono font-semibold">$30/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-200 dark:border-white/10 flex justify-between items-baseline">
                      <span className="text-[11px] text-neutral-500">Combined Value:</span>
                      <span className="text-sm font-black text-red-700 dark:text-red-400 font-mono">$650 / mo</span>
                    </div>
                  </div>

                  {/* FlagOS League Plan */}
                  <div className="p-4 rounded-2xl bg-[#3b82f6]/[0.06] dark:bg-[#1e3a8a]/20 border border-[#3b82f6]/30 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-[#60a5fa] font-bold text-xs uppercase tracking-wider">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>FlagOS League Plan</span>
                      </div>
                      <div className="space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>10 Private Team Portals with Playbooks</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Public League Hub ($0 per-player fees)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Live updating play-by-play &amp; box scores</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Automated scheduler &amp; conflict solver</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>Multi-way tiebreakers &amp; seeded brackets</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa] shrink-0" />
                          <span>League leaderboards &amp; career stats</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#3b82f6]/20 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-600 dark:text-neutral-400">FlagOS All-In Rate:</span>
                      <span className="text-sm font-black text-blue-800 dark:text-[#60a5fa] font-mono">$240 / mo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Callout */}
              <div className="p-3 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-xs flex items-center justify-between text-blue-950 dark:text-[#93c5fd]">
                <span className="font-semibold">Total League Savings:</span>
                <span className="font-bold text-neutral-950 dark:text-white font-mono bg-[#3b82f6]/20 px-2 py-0.5 rounded">
                  Save $410/mo ($4,920/yr) • $650 worth for $240/mo all-in
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* COMPREHENSIVE FEATURE COMPARISON MATRIX */}
        <section data-tour="pricing-features" className="space-y-8 pt-8 border-t border-neutral-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-400">
                Side-by-Side Breakdown
              </span>
              <h2 className="text-2xl md:text-4xl font-black uppercase text-neutral-950 dark:text-white tracking-tight mt-1">
                Compare Team &amp; League Plans
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm mt-1">
                Everything you need to know about what is included for individual teams versus full league setups.
              </p>
            </div>

            {/* Matrix Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 text-xs font-bold max-w-full overflow-x-auto hide-scrollbar shrink-0">
              <button
                onClick={() => setActiveMatrixTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "all" ? "bg-white dark:bg-white/15 text-neutral-950 dark:text-white shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                All Features ({matrixRows.length})
              </button>
              <button
                onClick={() => setActiveMatrixTab("team")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "team" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Team &amp; Roster Hub
              </button>
              <button
                onClick={() => setActiveMatrixTab("playbook")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "playbook" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Playbook Designer
              </button>
              <button
                onClick={() => setActiveMatrixTab("stats")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "stats" ? "bg-emerald-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                Sideline Stats &amp; Clocks
              </button>
              <button
                onClick={() => setActiveMatrixTab("league")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeMatrixTab === "league" ? "bg-blue-600 text-white font-black shadow-sm" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                }`}
              >
                League Operations
              </button>
            </div>
          </div>

          {/* Desktop Matrix Table */}
          <div className="hidden md:block bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-black/60 border-b border-neutral-200/80 dark:border-white/10 text-neutral-600 dark:text-neutral-400 font-mono uppercase">
                    <th className="py-4 px-6 w-1/2">Capability</th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-neutral-950 dark:text-white text-sm">Team Subscription</div>
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold lowercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block mt-1 font-mono">
                        $40 / month flat
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center w-1/4">
                      <div className="font-black text-neutral-950 dark:text-white text-sm">League Subscription</div>
                      <div className="text-[10px] text-blue-800 dark:text-[#60a5fa] font-semibold lowercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md inline-block mt-1 font-mono">
                        $40 base + $20/team/mo
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                  {filteredMatrixRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-neutral-950 dark:text-white text-sm">{row.feature}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">{row.detail}</div>
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.team === "boolean" ? (
                          row.team ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">{row.team}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center font-mono">
                        {typeof row.league === "boolean" ? (
                          row.league ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-[#60a5fa] mx-auto" />
                          ) : (
                            <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600 mx-auto" />
                          )
                        ) : (
                          <span className="font-bold text-blue-800 dark:text-[#93c5fd] text-xs">{row.league}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Feature Cards (Prevents horizontal overflow and clipping on small screens) */}
          <div className="md:hidden space-y-3">
            <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">Team: $40/mo</span>
              <span className="text-blue-800 dark:text-[#60a5fa] bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">League: $40 + $20/team</span>
            </div>

            {filteredMatrixRows.map((row, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 shadow-sm space-y-3"
              >
                <div>
                  <div className="font-bold text-neutral-950 dark:text-white text-sm">{row.feature}</div>
                  <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">{row.detail}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-white/5">
                  {/* Team Status */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Team</span>
                    <div>
                      {typeof row.team === "boolean" ? (
                        row.team ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                        )
                      ) : (
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px]">{row.team}</span>
                      )}
                    </div>
                  </div>

                  {/* League Status */}
                  <div className="p-2 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">League</span>
                    <div>
                      {typeof row.league === "boolean" ? (
                        row.league ? (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-[#60a5fa]" />
                        ) : (
                          <Minus className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
                        )
                      ) : (
                        <span className="font-bold text-blue-800 dark:text-[#93c5fd] text-[10px]">{row.league}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
        <section data-tour="pricing-faq" className="space-y-6 pt-8 border-t border-neutral-200 dark:border-white/10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-800 dark:text-[#60a5fa]">
              Common Questions
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase text-neutral-950 dark:text-white tracking-tight">
              Pricing &amp; Season FAQ
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm">
              Clear answers on how team portals work, off-season billing pauses, and free spectator access.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    id={`pricing-faq-question-${index}`}
                    onClick={() => setExpandedFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`pricing-faq-answer-${index}`}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-neutral-950 dark:text-white text-sm">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-blue-600 dark:text-[#60a5fa]" : ""
                      }`}
                    />
                  </button>
                  <div
                    id={`pricing-faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`pricing-faq-question-${index}`}
                    hidden={!isOpen}
                    className="px-5 pb-4 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-neutral-100 dark:border-white/5 pt-3"
                  >
                    {faq.a}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Multi-League & Multi-Team Explanation Banner */}
        <div className="rounded-3xl bg-white dark:bg-[#0B0F19] border border-neutral-200/80 dark:border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-[#60a5fa] shrink-0 mt-1">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white">Run Multiple Leagues or Independent Teams</h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs md:text-sm mt-1 leading-relaxed">
                Run multiple leagues, weekend tournaments or separate travel teams under one login. Switch between your leagues and teams from the top menu.
              </p>
            </div>
          </div>
          <Link
            href="/league/default?demo=true"
            className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-xs font-bold whitespace-nowrap border border-neutral-300 dark:border-white/10 transition-colors shadow-sm shrink-0"
          >
            Explore Active Demo
          </Link>
        </div>
      </div>

      {/* DEDICATED MARKETING FOOTER */}
      <footer data-tour="public-footer" className="relative z-10 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-black px-4 sm:px-6 py-8 sm:py-10 text-xs text-neutral-600 dark:text-neutral-400 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <span className="text-lg font-black uppercase tracking-wider text-neutral-950 dark:text-white">
              <FlagOSText />
            </span>
            <p className="leading-relaxed text-neutral-500">The Flag Football Operating System</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950 dark:text-white">Explore</h4>
            <ul className="space-y-2">
              <li><Link href="/#features" className="hover:text-blue-600 dark:hover:text-[#60a5fa] transition-colors">Key Features</Link></li>
              <li>
                <Link
                  href="/league/default?demo=true"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      sessionStorage.setItem("flagos_demo_active", "true");
                      localStorage.setItem("flagos_demo_active", "true");
                    }
                  }}
                  className="hover:text-blue-600 dark:hover:text-[#60a5fa] transition-colors"
                >
                  Demo League
                </Link>
              </li>
              {user && (
                <li><Link href="/#league-directory" className="hover:text-blue-600 dark:hover:text-[#60a5fa] transition-colors">League Directory</Link></li>
              )}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950 dark:text-white">Get Started</h4>
            <ul className="space-y-2">
              <li><Link href="/pricing" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-emerald-700 dark:text-emerald-400 font-bold">Pricing Plans</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 dark:hover:text-[#60a5fa] transition-colors">Sign In</Link></li>
              <li><Link href="/league/default?demo=true" className="hover:text-blue-600 dark:hover:text-[#60a5fa] transition-colors">Try the Demo</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-neutral-200 dark:border-white/10 text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} FlagOS. All rights reserved.</span>
          <span className="text-neutral-500 dark:text-neutral-600 text-[11px]">Empowering flag football teams and leagues worldwide.</span>
        </div>
      </footer>


      {/* LEAGUE CHECKOUT MODAL */}
      {isLeagueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-label="Subscribe League Portal" className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-blue-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-neutral-950 dark:text-white">
            <button
              onClick={() => setIsLeagueModalOpen(false)}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-950 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600 dark:text-[#60a5fa] border border-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h3 className="text-xl font-black uppercase text-neutral-950 dark:text-white">Subscribe League Portal</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Baseline fee + per-team scaling • Includes full team hubs for every team</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeLeague} className="space-y-4">
              <div data-tour="subscribe-league-identity" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">League Name</label>
                  <input
                    type="text"
                    required
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    placeholder="e.g. Gotham Flag Football League"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Shortcode</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={leagueShortcode}
                      onChange={(e) => setLeagueShortcode(e.target.value.toUpperCase())}
                      placeholder="e.g. GFFL"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Capacity</label>
                    <input
                      type="number"
                      min={4}
                      max={64}
                      value={teamCount}
                      onChange={(e) => setTeamCount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* League Logo (Optional, defaults to FlagOS logo) */}
              <div data-tour="subscribe-league-logo" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-[#60a5fa]" />
                    <span>League Logo (Optional)</span>
                  </label>
                  {leagueLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setLeagueLogoUrl("")}
                      className="text-[11px] text-blue-600 dark:text-[#60a5fa] hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
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
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-xs outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-[11px] font-semibold cursor-pointer border border-neutral-300 dark:border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-blue-600 dark:text-[#60a5fa]" />
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
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {leagueLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div data-tour="subscribe-league-colors" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Brand Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leaguePrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leagueSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: leagueTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leaguePrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3ca505", "#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League primary color ${c}`}
                        onClick={() => setLeaguePrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leaguePrimaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leaguePrimaryColor}
                        onChange={(e) => setLeaguePrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leagueSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#3B82F6", "#06B6D4", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League secondary color ${c}`}
                        onClick={() => setLeagueSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leagueSecondaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueSecondaryColor}
                        onChange={(e) => setLeagueSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{leagueTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`League tertiary color ${c}`}
                        onClick={() => setLeagueTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform cursor-pointer border border-neutral-300 dark:border-white/20 ${leagueTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={leagueTertiaryColor.startsWith("#") ? leagueTertiaryColor : "#ffffff"}
                        onChange={(e) => setLeagueTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Baseline League Fee</span>
                  <span className="font-mono text-neutral-950 dark:text-white">${baseLeagueFee}/mo</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>{teamCount} Teams Add-on (${perTeamFee}/team)</span>
                  <span className="font-mono text-neutral-950 dark:text-white">${teamCount * perTeamFee}/mo</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-white/10 pt-2 flex justify-between font-bold text-neutral-950 dark:text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-blue-600 dark:text-[#60a5fa] font-mono">${totalLeagueMonthly}/mo</span>
                </div>
              </div>

              <button data-tour="subscribe-league-confirm"
                type="submit"
                disabled={isSubmittingLeague}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isSubmittingLeague
                    ? (usesCheckout && !finishingLeague ? "Opening secure checkout..." : "Creating League...")
                    : finishingLeague ? "Finish League Setup · Paid"
                    : usesCheckout ? "Continue to Secure Checkout"
                    : "Create League · Complimentary"}
                </span>
              </button>
              {finishingLeague && (
                <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">Payment confirmed for {paidPurchase.teamCount} teams. Change your team count later from League Settings.</p>
              )}
              {usesCheckout && !finishingLeague && (
                <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">You will pay on Stripe, then return here to finish setup. Prices in CAD.</p>
              )}
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{checkoutError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TEAM CHECKOUT MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-label="Subscribe Team Portal" className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto text-neutral-950 dark:text-white">
            <button
              onClick={() => setIsTeamModalOpen(false)}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-950 dark:hover:text-white p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h3 className="text-xl font-black uppercase text-neutral-950 dark:text-white">Subscribe Team Portal</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Single monthly fee • Full stats tracking, roster hub &amp; up to 5 playbooks</p>
              </div>
            </div>

            <form onSubmit={handleSubscribeTeam} className="space-y-4">
              <div data-tour="subscribe-team-identity" className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team / Club Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Apex Predators"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Shortcode</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={teamShortcode}
                    onChange={(e) => setTeamShortcode(e.target.value.toUpperCase())}
                    placeholder="e.g. APX"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Team Logo (Optional, defaults to FlagOS logo) */}
              <div data-tour="subscribe-team-logo" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Team Logo / Crest (Optional)</span>
                  </label>
                  {teamLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setTeamLogoUrl("")}
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Reset to FlagOS Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-neutral-200 dark:border-white/20 bg-white dark:bg-neutral-950 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
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
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-xs outline-none focus:border-emerald-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-900 dark:text-white text-[11px] font-semibold cursor-pointer border border-neutral-300 dark:border-white/10 transition-colors">
                        <Upload className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
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
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {teamLogoUrl ? "Custom logo active" : "Defaulting to FlagOS emblem"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Colors: Primary, Secondary, Tertiary */}
              <div data-tour="subscribe-team-colors" className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-neutral-900/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Team Color Palette</span>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    <span>Preview:</span>
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamPrimaryColor }} title="Primary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamSecondaryColor }} title="Secondary" />
                    <span className="w-3.5 h-3.5 rounded-full border border-neutral-300 dark:border-white/30" style={{ backgroundColor: teamTertiaryColor }} title="Tertiary" />
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Primary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#22c55e", "#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team primary color ${c}`}
                        onClick={() => setTeamPrimaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamPrimaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamPrimaryColor}
                        onChange={(e) => setTeamPrimaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Secondary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#06B6D4", "#3B82F6", "#22c55e", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team secondary color ${c}`}
                        onClick={() => setTeamSecondaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamSecondaryColor === c ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamSecondaryColor}
                        onChange={(e) => setTeamSecondaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Tertiary Color */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">Tertiary Color</label>
                    <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{teamTertiaryColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["#FFFFFF", "#F3F4F6", "#9CA3AF", "#F59E0B", "#FCD34D", "#06B6D4", "#3B82F6", "#111827"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Team tertiary color ${c}`}
                        onClick={() => setTeamTertiaryColor(c)}
                        className={`w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 transition-transform cursor-pointer ${teamTertiaryColor.toLowerCase() === c.toLowerCase() ? "scale-110 ring-2 ring-neutral-950 dark:ring-white" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <label className="relative cursor-pointer" title="Custom color picker">
                      <input
                        type="color"
                        value={teamTertiaryColor.startsWith("#") ? teamTertiaryColor : "#ffffff"}
                        onChange={(e) => setTeamTertiaryColor(e.target.value)}
                        className="w-7 h-7 rounded-lg border border-neutral-300 dark:border-white/20 p-0 cursor-pointer bg-transparent"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div data-tour="subscribe-team-visibility">
                <label htmlFor="team-visibility" className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Team Portal Visibility</label>
                <select
                  id="team-visibility"
                  value={teamVisibility}
                  onChange={(e) => setTeamVisibility(e.target.value === "private" ? "private" : "public")}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 text-neutral-950 dark:text-white text-sm outline-none focus:border-emerald-500"
                >
                  <option value="public">Public – anyone can view schedule, roster names &amp; stats</option>
                  <option value="private">Private – only coaches &amp; rostered players</option>
                </select>
              </div>

              {/* Order Summary */}
              <div className="bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-xs space-y-2 mt-4">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Single Team Portal Subscription</span>
                  <span className="font-mono text-neutral-950 dark:text-white">$40/mo</span>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Full Stats &amp; Up to 5 Custom Playbooks</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">$0 (Included)</span>
                </div>
                <div className="border-t border-neutral-200 dark:border-white/10 pt-2 flex justify-between font-bold text-neutral-950 dark:text-white text-sm">
                  <span>Total Due Monthly</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">$40/mo</span>
                </div>
              </div>

              <button data-tour="subscribe-team-confirm"
                type="submit"
                disabled={isSubmittingTeam}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isSubmittingTeam
                    ? (usesCheckout && !finishingTeam ? "Opening secure checkout..." : "Creating Team...")
                    : finishingTeam ? "Finish Team Setup · Paid"
                    : usesCheckout ? "Continue to Secure Checkout"
                    : "Create Team · Complimentary"}
                </span>
              </button>
              <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                {finishingTeam
                  ? "Payment confirmed. Your team portal is created as soon as you finish."
                  : usesCheckout
                    ? "You will pay on Stripe, then return here to finish setup. Prices in CAD."
                    : "Owner account: payment is recorded as complimentary — no card is charged."}
              </p>
              {checkoutError && (
                <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{checkoutError}</p>
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
          <section data-tour="pricing-development"
            role="dialog"
            aria-modal="true"
            aria-labelledby="development-notice-title"
            className="relative w-full max-w-md rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950 p-7 shadow-2xl text-neutral-950 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close development notice"
              onClick={() => setShowDevelopmentNotice(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors hover:bg-neutral-100 dark:hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-[#60a5fa]">
              <Sparkles className="h-6 w-6" />
            </div>
            <PageGuideButton className="mb-3" />
            <h2 id="development-notice-title" className="text-xl font-black text-neutral-950 dark:text-white">
              FlagOS is still in development
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Subscriptions and purchases are not available yet. No payment will be taken and no league or team will be created. You can continue exploring the demo league while we finish building the service.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/league/default?demo=true"
                onClick={() => setShowDevelopmentNotice(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 text-xs font-black uppercase tracking-wide transition-colors shadow-md hover:shadow-lg"
              >
                <Play className="h-4 w-4" />
                Explore demo league
              </Link>
              <button
                type="button"
                onClick={() => setShowDevelopmentNotice(false)}
                className="rounded-xl border border-neutral-200 dark:border-white/10 px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
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
