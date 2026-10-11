"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useLeague } from "@/lib/leagueContext";
import { useAuth } from "@/lib/authContext";
import LeagueHeader from "@/components/LeagueHeader";
import LeagueFooter from "@/components/LeagueFooter";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function PricingPage() {
  const router = useRouter();
  const { createLeague, userLeagues, activeLeagueId, subscription: currentSub } = useLeague();
  const { user, isLeagueAdmin, setDevRole } = useAuth();

  // League interactive slider
  const [teamCount, setTeamCount] = useState<number>(8);
  const baseLeagueFee = 40;
  const perTeamFee = 15;
  const totalLeagueMonthly = baseLeagueFee + teamCount * perTeamFee;

  // Modals
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // League Modal Form
  const [leagueName, setLeagueName] = useState("");
  const [leagueShortcode, setLeagueShortcode] = useState("");
  const [leagueColor, setLeagueColor] = useState("#3ca505");
  const [isSubmittingLeague, setIsSubmittingLeague] = useState(false);

  // Team Modal Form
  const [teamName, setTeamName] = useState("");
  const [teamShortcode, setTeamShortcode] = useState("");
  const [teamIcon, setTeamIcon] = useState("shield");
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);

  const handleSubscribeLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueName.trim() || !leagueShortcode.trim()) return;
    setIsSubmittingLeague(true);
    try {
      const newLeagueId = await createLeague({
        name: leagueName.trim(),
        shortcode: leagueShortcode.trim().toUpperCase(),
        teamCount,
        primaryColor: leagueColor,
        seasonTitle: `${new Date().getFullYear()} Championship`,
      });
      // Switch user to league admin
      setDevRole("league_admin");
      setIsLeagueModalOpen(false);
      router.push("/");
    } catch (err) {
      console.error("Failed to create league:", err);
      alert("Failed to activate league subscription. Please try again.");
    } finally {
      setIsSubmittingLeague(false);
    }
  };

  const handleSubscribeTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsSubmittingTeam(true);
    try {
      const shortcode = (teamShortcode.trim() || teamName.trim().slice(0, 3)).toUpperCase();
      const teamDocRef = await addDoc(collection(db, "teams"), {
        name: teamName.trim(),
        shortcode,
        icon: teamIcon,
        subscription: {
          plan: "team",
          monthlyFee: 19,
          status: "active",
          activatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      });

      // Save to local team subscription list
      if (typeof window !== "undefined") {
        const existing = JSON.parse(localStorage.getItem("flagos_team_subscriptions") || "[]");
        existing.push({
          teamId: teamDocRef.id,
          teamName: teamName.trim(),
          shortcode,
          monthlyFee: 19,
          status: "active",
        });
        localStorage.setItem("flagos_team_subscriptions", JSON.stringify(existing));
      }

      // Switch user role to team admin for this team
      setDevRole("team_admin", teamDocRef.id);
      setIsTeamModalOpen(false);
      router.push(`/teams/${teamDocRef.id}`);
    } catch (err) {
      console.error("Failed to create team subscription:", err);
      alert("Failed to activate team subscription. Please try again.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col relative overflow-hidden">
      <LeagueHeader activePage="pricing" />

      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[45rem] h-[30rem] bg-gradient-to-b from-cyan-600/20 via-blue-600/10 to-transparent rounded-full blur-[140px] pointer-events-none"></div>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex-1 w-full relative z-10 space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Business Infrastructure & SaaS Plans</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white">
            Choose Your Platform Tier
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
            Run an independent team with in-depth stats &amp; playbook design, or scale an entire league where <strong className="text-white">every team gets those exact same features</strong> plus live gameday clocks and complete administrative infrastructure.
          </p>
        </div>

        {/* The Multiplier Architecture Banner */}
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
              When you subscribe to a League, you aren&apos;t just getting commissioner tools. <strong className="text-white">Every single team in your organization receives their own full Team Plan access</strong> — complete player stats, career records, and up to 5 custom playbooks — backed by live countdown clocks and automated league infrastructure.
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* TIER 1: LEAGUE SUBSCRIPTION */}
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-cyan-500/40 p-8 md:p-10 flex flex-col justify-between shadow-[0_0_50px_rgba(var(--league-primary-rgb),0.15)] backdrop-blur-xl">
            <div className="absolute -top-3.5 right-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
              Most Flexible • Multi-Tenant
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                    League Subscription
                  </h2>
                  <p className="text-xs text-neutral-400">Everything in the Team Plan for Every Team + Full League Ops &amp; Live Clocks</p>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">${totalLeagueMonthly}</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md">
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
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={teamCount}
                      onChange={(e) => setTeamCount(Number(e.target.value))}
                      className="flex-1 accent-cyan-400 cursor-pointer"
                    />
                    <button
                      onClick={() => setTeamCount((c) => Math.min(32, c + 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Features List */}
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
                      badge: "Leaderboards",
                      title: "League-Wide Stat Leaderboards",
                      description: "Automated league rankings for passing TDs, passer rating, defensive flag pulls, sacks, and INT pick-sixes across all teams.",
                    },
                    {
                      icon: Users,
                      badge: "Delegation",
                      title: "Multi-Admin Delegation & Tenancy",
                      description: "Invite unlimited Team Admins/Coaches, grant scorekeeper access, and manage multiple divisions from one central desk.",
                    },
                    {
                      icon: Building2,
                      badge: "Branding",
                      title: "White-Label League Portal",
                      description: "Dedicated portal URL with your custom color palette, official logo, season branding, and tailored theme presets.",
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

            <div className="pt-8">
              <button
                onClick={() => setIsLeagueModalOpen(true)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(var(--league-primary-rgb),0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Launch &amp; Subscribe League</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TIER 2: TEAM SUBSCRIPTION */}
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-emerald-500/30 p-8 md:p-10 flex flex-col justify-between shadow-[0_0_50px_rgba(16,185,129,0.1)] backdrop-blur-xl hover:border-emerald-500/50 transition-all">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                    Team Subscription
                  </h2>
                  <p className="text-xs text-neutral-400">Independent Franchise Hub • Stats &amp; Playbook Studio</p>
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl md:text-5xl font-black text-white tabular-nums">$30</span>
                    <span className="text-neutral-400 text-sm font-semibold ml-2">/ month</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                    Single Flat Fee
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Full standalone access for 1 team without requiring a parent league.
                </p>
              </div>

              {/* Features List */}
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

            <div className="pt-8">
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-black text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Launch &amp; Subscribe Team</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-League & Tenancy Explanation Banner */}
        <div className="rounded-3xl bg-neutral-900/50 border border-white/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Multi-League & Multi-Team Architecture</h3>
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
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
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
                    max={32}
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
                      className={`w-8 h-8 rounded-lg transition-transform ${leagueColor === c ? "scale-110 ring-2 ring-white" : ""}`}
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
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/10 rounded-2xl text-white border border-white/10">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-white font-semibold"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-white font-mono uppercase"
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
                className="w-full py-3.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingTeam ? "Provisioning Team..." : "Confirm & Pay $30/mo"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <LeagueFooter />
    </div>
  );
}
