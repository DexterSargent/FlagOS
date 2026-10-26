"use client";
import FlagOSLoader from "@/components/FlagOSLoader";
import { usePageGuide } from "@/lib/pageGuide";

import { TEAM_STATS_WALKTHROUGH } from "@/lib/walkthroughData";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Trophy, Crosshair, Shield, Flame, Hand, Zap, Target, ShieldAlert, type LucideIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { loadTeamPlayers } from "@/lib/matchRoster";
import { getCachedLeagueMatches, getCachedLeaguePlays } from "@/lib/leagueDataCache";
import { useLeague } from "@/lib/leagueContext";
import { useDemoSandbox } from "@/lib/useDemoSandbox";
import DemoLoadError from "@/components/DemoLoadError";
import { loadTeamSeasonData } from "@/lib/teamSeasonData";
import { loadTeamSeasonSummary, getPlayerNumber, TeamSeasonSummaryError } from "@/lib/teamSeasonSummary";
import { getAccentOnDark, getReadableTextColor, resolveTeamColorPalette } from "@/lib/teamColors";
import { calculateTeamComprehensiveStats, type TeamComprehensiveStats } from "@/lib/teamStatsCalculator";
import { useTeamColors } from "@/lib/teamColorContext";
import TeamNavBar from "@/components/team/TeamNavBar";
import TeamPortalFooter from "@/components/team/TeamPortalFooter";

export default function TeamStatLeadersPage({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(TEAM_STATS_WALKTHROUGH);
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const { settings, isDemoLeague } = useLeague();
  const { sandbox, error: demoError, retry: retryDemo } = useDemoSandbox(isDemoLeague);

  const { palette: contextPalette } = useTeamColors();
  const [team, setTeam] = useState<any>(null);
  const palette = resolveTeamColorPalette(team || contextPalette);
  const [stats, setStats] = useState<any[]>([]);
  const [teamStats, setTeamStats] = useState<TeamComprehensiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setTeam(null);
    setStats([]);
    setTeamStats(null);
    setLoadError(null);
    const fetchData = async () => {
      try {
        let tObj: any = null;
        let players: any[] = [];
        let matches: any[] = [];
        let plays: any[] = [];

        if (isDemoLeague) {
          if (!sandbox) return;
          const { getSandboxTeams, getSandboxPlayers, getSandboxMatches, getSandboxPlays } = sandbox;
          tObj = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
          const effectiveTeamId = tObj?.id || teamId;
          players = getSandboxPlayers().filter((p) => p.teamId === effectiveTeamId);
          matches = getSandboxMatches();
          plays = getSandboxPlays();
        } else {
          const teamSnap = await getDoc(doc(db, "teams", teamId));
          if (cancelled) return;
          if (teamSnap.exists()) tObj = { ...teamSnap.data(), id: teamSnap.id };
          const leagueId = typeof tObj?.leagueId === "string" ? tObj.leagueId : "";
          if (tObj) setTeam(tObj);
          setLoading(false);
          setStatsLoading(true);
          try {
            const summary = await loadTeamSeasonSummary(teamId);
            if (cancelled) return;
            setTeamStats(summary.teamStats);
            setStats(Object.entries(summary.playerStats).map(([name, player]) => ({ ...player, name, number: getPlayerNumber(summary, name) })));
            setLoadError(null);
            setStatsLoading(false);
            return;
          } catch (error) {
            if (!(error instanceof TeamSeasonSummaryError) || error.status !== 404) throw error;
          }
          if (!leagueId) {
            const [teamPlayers, season] = await Promise.all([
              loadTeamPlayers(teamId),
              loadTeamSeasonData(teamId),
            ]);
            players = teamPlayers;
            matches = season.matches;
            plays = season.plays;
          } else {
            const [teamPlayers, rawMatches, rawPlays] = await Promise.all([
              loadTeamPlayers(teamId, leagueId),
              getCachedLeagueMatches(leagueId),
              getCachedLeaguePlays(leagueId),
            ]);
            players = teamPlayers;
            matches = rawMatches.filter((m) => !m.isHidden && (!m.leagueId || m.leagueId === leagueId));
            plays = rawPlays;
          }
        }

        if (cancelled) return;
        if (tObj) setTeam(tObj);

        const statsMap: Record<string, any> = {};
        players.forEach((p: any) => {
          statsMap[p.playerName] = {
            name: p.playerName,
            number: p.number || p.jerseyNumber || "",
            gamesPlayed: 0,
            passComp: 0,
            passAtt: 0,
            passTD: 0,
            receptions: 0,
            recTD: 0,
            rushAtt: 0,
            rushTD: 0,
            flagPulls: 0,
            sacks: 0,
            int: 0,
            pbu: 0,
            totalTDs: 0,
          };
        });

        // Games played
        const targetTeamId = tObj?.id || teamId;
        matches.forEach((m) => {
          if ((m.status === "completed" || m.status === "Final") && (m.homeTeamId === targetTeamId || m.awayTeamId === targetTeamId)) {
            const dnp = m.didNotPlay || [];
            players.forEach((p: any) => {
              if (statsMap[p.playerName] && !dnp.includes(p.playerName)) {
                statsMap[p.playerName].gamesPlayed += 1;
              }
            });
          }
        });

        // Completed matches set (only stats from completed games are tracked)
        const completedMatchIds = new Set(
          matches
            .filter((m: any) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
            .map((m: any) => m.id)
        );

        // Plays aggregation (strictly for completed matches)
        plays.forEach((play) => {
          if (!play.matchId || !completedMatchIds.has(play.matchId)) return;
          const isEligible = (name: string) => name && statsMap[name];
          // Offensive stats only count on our possessions, defensive stats only on theirs.
          const possTeam = play.possessionTeamId;
          const weHaveBall = !possTeam || possTeam === targetTeamId;

          const isConversionPlay = Boolean(
            play.isConversion === true ||
            play.playType === "Conversion" ||
            (!play.isTouchdown && (
              (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
              play.conversionSuccess === true
            ))
          );

          // Passing
          if (weHaveBall && play.playType === "Pass" && isEligible(play.qbPlayerId) && !isConversionPlay) {
            statsMap[play.qbPlayerId].passAtt += 1;
            if (play.passOutcome === "Complete") {
              statsMap[play.qbPlayerId].passComp += 1;
            }
            if (play.isTouchdown) {
              statsMap[play.qbPlayerId].passTD += 1;
            }
          }

          // Receiving
          if (weHaveBall && play.playType === "Pass" && play.passOutcome === "Complete" && isEligible(play.receiverPlayerId) && !isConversionPlay) {
            statsMap[play.receiverPlayerId].receptions += 1;
            if (play.isTouchdown) {
              statsMap[play.receiverPlayerId].recTD += 1;
              statsMap[play.receiverPlayerId].totalTDs += 1;
            }
          }

          // Rushing
          if (weHaveBall && play.playType === "Run" && isEligible(play.runnerPlayerId) && !isConversionPlay) {
            statsMap[play.runnerPlayerId].rushAtt += 1;
            if (play.isTouchdown) {
              statsMap[play.runnerPlayerId].rushTD += 1;
              statsMap[play.runnerPlayerId].totalTDs += 1;
            }
          }

          // Defense
          if ((!possTeam || !weHaveBall) && play.defenders && Array.isArray(play.defenders)) {
            play.defenders.forEach((defenderName: string) => {
              if (!isEligible(defenderName)) return;

              if (play.passOutcome === "Interception") {
                statsMap[defenderName].int += 1;
                if (play.isPick6 || play.result === "Pick 6" || play.result === "Pick 6 Touchdown") {
                  statsMap[defenderName].totalTDs += 1;
                }
              } else if (play.passOutcome === "PBU") {
                statsMap[defenderName].pbu += 1;
              } else if (play.passOutcome === "Sack") {
                statsMap[defenderName].sacks += 1;
                statsMap[defenderName].flagPulls += 1;
              } else {
                statsMap[defenderName].flagPulls += 1;
              }
            });
          }

          // Flaggers
          if ((!possTeam || !weHaveBall) && play.passOutcome === "Interception" && play.flaggers && Array.isArray(play.flaggers)) {
            play.flaggers.forEach((flaggerName: string) => {
              if (isEligible(flaggerName)) {
                statsMap[flaggerName].flagPulls += 1;
              }
            });
          }
        });

        setStats(Object.values(statsMap));
        setTeamStats(calculateTeamComprehensiveStats(targetTeamId, matches, plays, {
          teamName: tObj?.name,
          teamAliases: [targetTeamId, tObj?.name].filter(Boolean),
        }));
        setLoadError(null);
      } catch (e) {
        console.error("Error fetching team stats:", e);
        if (!cancelled) setLoadError("We couldn't load this team's stats. Check your connection and try again.");
      }
      if (cancelled) return;
      setStatsLoading(false);
      setLoading(false);
    };

    fetchData();
    let unsubscribe: (() => void) | undefined;
    if (isDemoLeague && sandbox) {
      unsubscribe = sandbox.subscribeDemoSandbox(() => fetchData());
    }
    return () => { cancelled = true; unsubscribe?.(); };
  }, [teamId, isDemoLeague, reloadKey, sandbox]);

  const getTop3 = (key: string) => {
    const sorted = [...stats].sort((a, b) => (b[key] || 0) - (a[key] || 0)).filter((p) => (p[key] || 0) > 0);
    return sorted.slice(0, 3);
  };

  const accent = getAccentOnDark(palette);
  const badgeText = getReadableTextColor(palette.primary, palette.secondary);

  const sections: { title: string; icon: LucideIcon; categories: LeaderCategory[] }[] = [
    {
      title: "Offense",
      icon: Zap,
      categories: [
        { title: "Total Touchdowns", key: "totalTDs", icon: Trophy },
        { title: "Passing TDs", key: "passTD", icon: Crosshair },
        { title: "Completions", key: "passComp", icon: Target },
        { title: "Receptions", key: "receptions", icon: Hand },
        { title: "Receiving TDs", key: "recTD", icon: Activity },
        { title: "Rushing TDs", key: "rushTD", icon: Flame },
      ],
    },
    {
      title: "Defense",
      icon: Shield,
      categories: [
        { title: "Flags Pulled", key: "flagPulls", icon: Shield },
        { title: "Sacks", key: "sacks", icon: ShieldAlert },
        { title: "Interceptions", key: "int", icon: Hand },
        { title: "Pass Breakups", key: "pbu", icon: Shield },
      ],
    },
  ];

  if (demoError) return <DemoLoadError retry={retryDemo} />;
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  if (loadError && stats.length === 0) {
    return (
      <div data-tour="team-stats-error" role="alert" className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <Shield className="w-14 h-14 text-red-500/70 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Couldn&apos;t Load Stats</h2>
        <p className="text-neutral-400 text-sm mb-6 max-w-md">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider"
            style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
          >
            Retry
          </button>
          <Link
            href={`/teams/${teamId}`}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/10"
          >
            Back to Team
          </Link>
        </div>
      </div>
    );
  }


  const teamName = team?.name || "Team";
  const hasAnyLeader = sections.some((section) => section.categories.some((cat) => getTop3(cat.key).length > 0));

  return (
    <div className="min-h-screen bg-black text-white font-sans relative flex flex-col">
      <div
        className="absolute inset-x-0 top-0 h-80 pointer-events-none"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse 80% 100% at 50% 0%, ${accent}2E 0%, transparent 70%)` }}
      />
      <TeamNavBar teamId={teamId} />

      <div className="max-w-6xl mx-auto relative z-10 flex-1 w-full px-4 py-5 sm:px-6 sm:py-8 md:px-10 space-y-6 sm:space-y-8">
        {/* Header */}
        <header data-tour="team-stats-summary" className="flex flex-col items-center text-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest border"
            style={{ backgroundColor: `${accent}1A`, borderColor: `${accent}55`, color: "var(--team-ink)" }}
          >
            <Activity className="w-3.5 h-3.5" />
            Season Leaderboards
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
            <span className="text-white">{teamName}</span>{" "}
            <span style={{ color: "var(--team-ink)" }}>Stat Leaders</span>
          </h1>
          {teamStats && teamStats.gp > 0 && (
            <p className="text-xs sm:text-sm text-neutral-400 font-medium">
              {teamStats.gp} completed {teamStats.gp === 1 ? "game" : "games"}
            </p>
          )}
        </header>

        {statsLoading ? (
          <div role="status" aria-label="Loading stat leaders" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-48 rounded-2xl border border-white/5 bg-neutral-900/70 animate-pulse" />
            ))}
            <span className="sr-only">Loading stat leaders...</span>
          </div>
        ) : !hasAnyLeader ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/50 px-6 py-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
            <h2 className="text-lg font-black uppercase tracking-wider">No stats yet</h2>
            <p className="mt-1 text-sm text-neutral-400">Leaders will appear here once {teamName} finishes a game with tracked plays.</p>
          </div>
        ) : (
          sections.map((section) => (
            <section data-tour={section.title === "Offense" ? "team-stats-offense" : "team-stats-defense"} key={section.title} aria-label={`${section.title} leaders`} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm sm:text-base font-black uppercase tracking-widest text-white">
                <section.icon className="h-4 w-4" style={{ color: "var(--team-ink)" }} />
                {section.title}
                <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {section.categories.map((cat) => (
                  <LeaderCard
                    key={cat.key}
                    category={cat}
                    leaders={getTop3(cat.key)}
                    accent={accent}
                    badgeBackground={palette.primary}
                    badgeText={badgeText}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      <TeamPortalFooter section="Stat Leaders" />
    </div>
  );
}

interface LeaderCategory {
  title: string;
  key: string;
  icon: LucideIcon;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function LeaderCard({
  category,
  leaders,
  accent,
  badgeBackground,
  badgeText,
}: {
  category: LeaderCategory;
  leaders: any[];
  accent: string;
  badgeBackground: string;
  badgeText: string;
}) {
  const [leader, ...rest] = leaders;
  const max = leader ? Number(leader[category.key]) || 1 : 1;
  const Icon = category.icon;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 shadow-lg">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--team-ink)" }} />
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">{category.title}</h3>
      </div>

      {leader ? (
        <>
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: `linear-gradient(90deg, ${accent}1F, transparent)` }}>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-base shadow-md"
              style={{ backgroundColor: badgeBackground, color: badgeText }}
              aria-hidden="true"
            >
              {leader.number ? `#${leader.number}` : initials(leader.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--team-ink)" }}>Leader</div>
              <div className="truncate font-black text-white" title={leader.name}>{leader.name}</div>
            </div>
            <div className="shrink-0 font-mono text-3xl font-black tabular-nums text-white">{leader[category.key]}</div>
          </div>
          <div className="flex-1 space-y-2.5 px-4 pb-3.5 pt-1">
            {rest.map((player, index) => (
              <div key={player.name}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-xs font-black text-neutral-500">{index + 2}</span>
                    <span className="truncate font-semibold text-neutral-300" title={player.name}>{player.name}</span>
                    {player.number && <span className="shrink-0 text-xs text-neutral-600">#{player.number}</span>}
                  </div>
                  <span className="shrink-0 font-mono font-black tabular-nums text-neutral-300">{player[category.key]}</span>
                </div>
                <div className="ml-7 mt-1 h-1 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((Number(player[category.key]) || 0) / max) * 100)}%`, backgroundColor: accent, opacity: 0.55 }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs font-medium text-neutral-500">No recorded stats yet</div>
      )}
    </div>
  );
}
