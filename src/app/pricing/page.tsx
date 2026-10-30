"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { PRICING_WALKTHROUGH, TEAM_SUBSCRIPTION_WALKTHROUGH, LEAGUE_SUBSCRIPTION_WALKTHROUGH, DEVELOPMENT_NOTICE_WALKTHROUGH } from "@/lib/walkthroughs/public";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import PricingValueComparison from "@/components/pricing/PricingValueComparison";
import PricingFeatureMatrix from "@/components/pricing/PricingFeatureMatrix";
import PricingFaqAccordion from "@/components/pricing/PricingFaqAccordion";
import LeagueCheckoutModal from "@/components/pricing/LeagueCheckoutModal";
import TeamCheckoutModal from "@/components/pricing/TeamCheckoutModal";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  Check,
  Sparkles,
  ListChecks,
  Receipt,
  Building2,
  Users,
  X,
  Trophy,
  Play,
  ArrowRight,
  CheckCircle2,
  Menu,
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
    isPlatformAdmin ||
    (!!user?.emailVerified && isPlatformAdminEmail(user?.email)) ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview"));

  // League interactive slider
  const [teamCount, setTeamCount] = useState<number>(4);
  const baseLeagueFee = 40;
  const perTeamFee = 20;
  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  // Active comparison tab / category filter

  // Mobile nav state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // FAQ Accordion open states

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

            {!isAuthorized ? (
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
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Free spectator access
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

        <PricingValueComparison />

        <PricingFeatureMatrix />

        <PricingFaqAccordion />
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


      <LeagueCheckoutModal
        isOpen={isLeagueModalOpen}
        onClose={() => setIsLeagueModalOpen(false)}
        leagueName={leagueName}
        setLeagueName={setLeagueName}
        leagueShortcode={leagueShortcode}
        setLeagueShortcode={setLeagueShortcode}
        leagueLogoUrl={leagueLogoUrl}
        setLeagueLogoUrl={setLeagueLogoUrl}
        leaguePrimaryColor={leaguePrimaryColor}
        setLeaguePrimaryColor={setLeaguePrimaryColor}
        leagueSecondaryColor={leagueSecondaryColor}
        setLeagueSecondaryColor={setLeagueSecondaryColor}
        leagueTertiaryColor={leagueTertiaryColor}
        setLeagueTertiaryColor={setLeagueTertiaryColor}
        teamCount={teamCount}
        setTeamCount={setTeamCount}
        finishingLeague={finishingLeague}
        paidPurchase={paidPurchase}
        baseLeagueFee={baseLeagueFee}
        perTeamFee={perTeamFee}
        usesCheckout={usesCheckout}
        isSubmittingLeague={isSubmittingLeague}
        checkoutError={checkoutError}
        handleSubscribeLeague={handleSubscribeLeague}
      />

      <TeamCheckoutModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teamName={teamName}
        setTeamName={setTeamName}
        teamShortcode={teamShortcode}
        setTeamShortcode={setTeamShortcode}
        teamLogoUrl={teamLogoUrl}
        setTeamLogoUrl={setTeamLogoUrl}
        teamPrimaryColor={teamPrimaryColor}
        setTeamPrimaryColor={setTeamPrimaryColor}
        teamSecondaryColor={teamSecondaryColor}
        setTeamSecondaryColor={setTeamSecondaryColor}
        teamTertiaryColor={teamTertiaryColor}
        setTeamTertiaryColor={setTeamTertiaryColor}
        teamVisibility={teamVisibility}
        setTeamVisibility={setTeamVisibility}
        finishingTeam={finishingTeam}
        usesCheckout={usesCheckout}
        isSubmittingTeam={isSubmittingTeam}
        checkoutError={checkoutError}
        handleSubscribeTeam={handleSubscribeTeam}
      />

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
