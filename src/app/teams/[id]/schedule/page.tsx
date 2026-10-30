"use client";
import FlagOSLoader from "@/components/FlagOSLoader";
import { canRecordMatch } from "@/lib/scorerAccess";
import VenueDirections from "@/components/VenueDirections";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";
import { usePageGuide } from "@/lib/pageGuide";

import { TEAM_SCHEDULE_WALKTHROUGH, TEAM_SCHEDULE_GAME_WALKTHROUGH } from "@/lib/walkthroughData";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Trophy, History, PlayCircle, Shield, Plus, X, Sparkles, Timer, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, deleteDoc, updateDoc, limit } from "firebase/firestore";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";
import { useLeague } from "@/lib/leagueContext";
import { useLeagueArchived, isTeamSeasonArchived } from "@/lib/useLeagueArchived";
import { formatMatchTime } from "@/lib/formatMatchTime";
import { useAuth } from "@/lib/authContext";
import { useDemoSandbox } from "@/lib/useDemoSandbox";
import DemoLoadError from "@/components/DemoLoadError";
import { isPrimaryTeamAdmin, isDexterUser } from "@/lib/teamAdminRbac";
import { loadTeamManagedMatches } from "@/lib/teamSeasonData";
import { getCurrentTeamSeasonId } from "@/lib/teamSeasons";
import { isMatchInSeason } from "@/lib/leagueSeasons";
import { getCachedLeagueTeams, subscribeLeagueSeasonMatches } from "@/lib/leagueDataCache";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";
import { resolveTeamColorPalette, getReadableTextColor } from "@/lib/teamColors";
import { useTeamColors } from "@/lib/teamColorContext";
import { getCachedTeamRecord, loadTeamRecord } from "@/lib/teamRecord";
import TeamNavBar from "@/components/team/TeamNavBar";
import TeamPortalFooter from "@/components/team/TeamPortalFooter";
import { getGameDisplayState, useNow } from "@/lib/gameLiveState";

// Date-only strings parse as UTC and display a day early in western time zones.
function localMatchDate(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
}

export default function TeamSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  usePageGuide(TEAM_SCHEDULE_WALKTHROUGH);
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const { settings, activeLeagueId, isDemoLeague } = useLeague();
  const { sandbox, error: demoError, retry: retryDemo } = useDemoSandbox(isDemoLeague);

  const { canManageTeam, isLeagueAdmin, user } = useAuth();
  const { palette: contextPalette } = useTeamColors();
  const [team, setTeam] = useState<any>(() => getCachedTeamRecord(teamId));
  const palette = resolveTeamColorPalette(team || contextPalette);
  const [allTeams, setAllTeams] = useState<Record<string, any>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  const isDexter = isDexterUser(user?.email);
  const isPrimary = isPrimaryTeamAdmin(user?.email, team, isDexter);
  const isTeamLeagueArchived = useLeagueArchived(team?.leagueId) || isTeamSeasonArchived(team);
  const canScheduleMatches = (isLeagueAdmin || canManageTeam(teamId)) && !isTeamLeagueArchived;
  // Independent teams own their games; only league teams defer deletion to league admins.
  const isIndependentTeam = !isDemoLeague && !!team && !team.leagueId;
  const canDeleteMatch = !isTeamLeagueArchived && (isPrimary || (!isIndependentTeam && isLeagueAdmin));

  // Admin emails live in team_private, so the primary-coach check needs the private settings.
  const hasTeam = !!team;
  useEffect(() => {
    if (isDemoLeague || !hasTeam || !canManageTeam(teamId)) return;
    let cancelled = false;
    requestPrivateData<{ team: Record<string, unknown> }>("team", { teamId })
      .then((privateData) => {
        if (!cancelled) setTeam((current: Record<string, unknown> | null) => current ? { ...current, ...privateData.team } : current);
      })
      .catch((error: unknown) => console.warn("Unable to load private team settings:", error));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, isDemoLeague, hasTeam, user?.uid]);

  // Match Scheduling Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  usePageGuide(isScheduleModalOpen ? TEAM_SCHEDULE_GAME_WALKTHROUGH : null, 2);
  const [opponentName, setOpponentName] = useState("");
  const [isHostHome, setIsHostHome] = useState(true);
  const [gameType, setGameType] = useState<"regular" | "playoff" | "championship">("regular");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [matchTime, setMatchTime] = useState("14:00");
  const [matchLocation, setMatchLocation] = useState(settings?.defaultLocation || "");
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!isScheduleModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsScheduleModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isScheduleModalOpen]);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (canScheduleMatches && (sp.get("create") === "1" || sp.get("create") === "true")) {
        setIsScheduleModalOpen(true);
      }
    }
  }, [canScheduleMatches]);

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDeleteMatch) {
      alert("Permission Denied: Only the primary team admin (head coach) can delete scheduled games.");
      return;
    }
    if (!canScheduleMatches) return;
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;

    if (isDemoLeague) {
      if (!sandbox) {
        setScheduleError("The demo is not loaded. Please retry.");
        return;
      }
      sandbox.deleteSandboxPlaysForMatch(matchId);
      sandbox.deleteSandboxMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      return;
    }

    if (isIndependentTeam) {
      // Team-managed games are hidden rather than erased so their play history stays recoverable.
      try {
        await updateDoc(doc(db, "matches", matchId), { isHidden: true });
        invalidatePublicTeamData();
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
      } catch (err) {
        console.error("Could not delete team match:", err);
        setScheduleError("The game could not be deleted from the server. No deletion was confirmed.");
      }
      return;
    }

    try {
      await deleteDoc(doc(db, "matches", matchId));
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch (err) {
      console.error("Failed to delete match:", err);
      alert("Failed to delete match. Please check permissions.");
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canScheduleMatches) return;
    if (!opponentName.trim()) return;
    setIsScheduling(true);
    setScheduleError("");
    try {
      const oppId = `opponent_${Date.now()}`;
      const newMatchDoc = {
        homeTeamName: isHostHome ? (team?.name || "Team") : opponentName.trim(),
        awayTeamName: isHostHome ? opponentName.trim() : (team?.name || "Team"),
        homeTeamId: isHostHome ? teamId : oppId,
        awayTeamId: isHostHome ? oppId : teamId,
        homeScore: 0,
        awayScore: 0,
        date: matchDate,
        time: matchTime,
        location: matchLocation || "Field 1",
        week: gameType === "championship" ? "Championship" : gameType === "playoff" ? "Playoffs" : "Regular Season",
        ...(gameType !== "regular"
          ? { isPlayoff: true, playoffRound: gameType === "championship" ? "Championship" : "Playoffs" }
          : {}),
        status: "scheduled" as const,
        isIndependent: true,
        isAsyncStatKeeping: true,
        managingTeamId: teamId,
        matchdayIndex: 1,
      };

      if (isDemoLeague) {
        if (!sandbox) throw new Error("The demo is not loaded.");
        sandbox.addSandboxMatch(newMatchDoc);
        setOpponentName("");
        setGameType("regular");
        setIsScheduleModalOpen(false);
        setIsScheduling(false);
        return;
      }

      const createdId = await createSecureRecord("match", {
        ...newMatchDoc,
        leagueId: team?.leagueId || "",
      });

      const createdMatch = { id: createdId, ...newMatchDoc };
      invalidatePublicTeamData();

      setMatches((prev) => {
        const exists = prev.some((m) => m.id === createdMatch.id);
        return exists ? prev.map((m) => (m.id === createdMatch.id ? createdMatch : m)) : [...prev, createdMatch];
      });

      setOpponentName("");
      setGameType("regular");
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error("Failed to schedule match:", err);
      setScheduleError("The game could not be saved to the server. Check your connection and coach permissions, then retry.");
    } finally {
      setIsScheduling(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const fetchData = async () => {
      if (isDemoLeague) {
        if (!sandbox) return;
        const { getSandboxTeams, getSandboxMatches, subscribeDemoSandbox } = sandbox;
        const loadDemo = () => {
          if (cancelled) return;
          const tObj = getSandboxTeams().find((t) => t.id === teamId || (teamId === "team_apex" && t.id === "team_kc"));
          const effectiveTeamId = tObj?.id || teamId;
          if (tObj && isRealTeam(tObj)) setTeam(tObj);
          else setTeam(null);
          const tMap: Record<string, any> = {};
          getSandboxTeams().filter(isRealTeam).forEach((t) => { tMap[t.id] = t; });
          setAllTeams(tMap);
          const mList = getSandboxMatches().filter(
            (m: any) => !m.isHidden && (m.homeTeamId === effectiveTeamId || m.awayTeamId === effectiveTeamId)
          );
          mList.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMatches(mList);
          setLoading(false);
        };
        loadDemo();
        unsubscribe = subscribeDemoSandbox(() => loadDemo());
        if (cancelled) unsubscribe();
        return;
      }

      try {
        const teamData = await loadTeamRecord(teamId);



        const leagueId = typeof teamData?.leagueId === "string" ? teamData.leagueId : "";
        if (teamData && !leagueId) {
          // Past seasons are explored read-only from the team stats page; the schedule stays current.
          const currentSeasonId = getCurrentTeamSeasonId(teamData as Record<string, unknown>);
          const teamMatches = (await loadTeamManagedMatches(teamId))
            .filter((match) => isMatchInSeason(match, currentSeasonId));
          if (cancelled) return;
          if (isRealTeam(teamData)) setTeam(teamData);
          else setTeam(null);
          setAllTeams({ [teamData.id]: teamData });
          setMatches([...teamMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          setScheduleError("");
          setLoading(false);
          // Started games flip between live and paused as scorekeepers come and go; keep just those fresh.
          unsubscribe = onSnapshot(query(
            collection(db, "matches"),
            where("managingTeamId", "==", teamId),
            where("isHidden", "==", false),
            where("status", "==", "in_progress"),
            limit(16),
          ), (snap) => {
            if (cancelled) return;
            const fresh = new Map(snap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as any) }]));
            setMatches((prev) => prev.map((m) => fresh.get(m.id) || m));
          }, (err) => console.warn("Live game status listener error:", err));
          if (cancelled) unsubscribe();
          return;
        }
        const allTeams = await getCachedLeagueTeams(leagueId);
        if (cancelled) return;

        if (teamData) {
          const tData = teamData;
          if (isRealTeam(tData)) setTeam(tData);
          else setTeam(null);
        }

        const teamsMap: Record<string, any> = {};
        allTeams
          .filter(isRealTeam)
          .forEach((t: any) => {
            teamsMap[t.id] = t;
          });
        setAllTeams(teamsMap);

        // Fetch matches involving this team
        const unsub = subscribeLeagueSeasonMatches(leagueId, (snap) => {
          if (cancelled) return;
          const mList = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((m) => !m.isHidden && (m.homeTeamId === teamId || m.awayTeamId === teamId));

          mList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMatches(mList);
          setLoading(false);
        }, (err) => {
          console.warn("Teams schedule matches onSnapshot error:", err);
          setLoading(false);
        });

        unsubscribe = unsub;
        if (cancelled) unsubscribe();
        return;
      } catch (e) {
        console.error("Error fetching team schedule:", e);
        if (cancelled) return;
        setScheduleError("The schedule could not be loaded. Please try again.");
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [teamId, isDemoLeague, sandbox]);

  if (demoError) return <DemoLoadError retry={retryDemo} />;
  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans">
        <FlagOSLoader />
      </div>
    );
  }

  if (!team || !isRealTeam(team)) {
    return (
      <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <h2 className="text-3xl font-black mb-4">{scheduleError ? "Schedule Unavailable" : "Team Not Found"}</h2>
        <p role={scheduleError ? "alert" : undefined} className="text-neutral-400 mb-6 max-w-md">
          {scheduleError || "This team could not be found. It may have been removed."}
        </p>
        <Link
          href="/teams"
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500  font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)]"
          style={{ backgroundColor: palette.primary, color: getReadableTextColor(palette.primary, "#FFFFFF") }}
        >
          Back to Teams
        </Link>
      </div>
    );
  }

  const pastMatches = matches.filter((m) => m.status === "completed" || m.status === "Final");
  const wonChampionship = pastMatches.find((m) => {
    if (m.playoffRound !== "Championship") return false;
    const isHome = m.homeTeamId === teamId;
    const scored = Number((isHome ? m.homeScore : m.awayScore) ?? 0);
    const allowed = Number((isHome ? m.awayScore : m.homeScore) ?? 0);
    return scored > allowed;
  });
  const upcomingMatches = matches.filter((m) => m.status !== "completed" && m.status !== "Final");


  const teamName = team?.name || "Team";
  const hasManagementAccess = canManageTeam(teamId) || isLeagueAdmin;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-500/30 selection:text-[var(--team-ink)] relative flex flex-col">

      {/* Dynamic Background styled to team colors */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-15">
        <div 
          className="absolute -top-40 -left-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-25 animate-pulse"
          style={{ backgroundColor: palette.primary }}
        />
        <div 
          className="absolute top-40 -right-40 w-[35rem] h-[35rem] rounded-full mix-blend-screen filter blur-[140px] opacity-20 animate-pulse delay-1000"
          style={{ backgroundColor: palette.secondary !== "#FFFFFF" ? palette.secondary : palette.primary }}
        />
      </div>
      <TeamNavBar teamId={teamId} />

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 relative z-10 flex-1 w-full px-4 py-6 sm:p-6 md:p-12">
        {scheduleError && <p role="alert" className="text-red-300">{scheduleError}</p>}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div 
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "var(--team-ink)" }}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
              {teamName} <span className="text-neutral-500 font-normal">Schedule</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Past scores, upcoming matchups, and live game tracking.</p>
            {wonChampionship && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <Trophy className="w-3.5 h-3.5" /> Champions {localMatchDate(wonChampionship.date).getFullYear()}
              </p>
            )}
          </div>

          {/* Schedule Game Button (Admins & Coaches) */}
          {canScheduleMatches && (
            <button
              data-tour="team-schedule-actions"
                onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 rounded-2xl hover:opacity-90 font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
              style={{
                backgroundColor: palette.primary,
                color: getReadableTextColor(palette.primary, "#000000"),
              }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Schedule Game</span>
            </button>
          )}
        </div>

        {/* Schedule Grid: Upcoming & Past */}
        <div className="grid grid-cols-1 gap-8">
          {/* Upcoming Games */}
          <div data-tour="team-upcoming" className="space-y-4">
            <div 
              className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider"
              style={{ color: "var(--team-ink)" }}
            >
              <Clock className="w-5 h-5" />
              <span>Upcoming Games</span>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center text-neutral-500 italic text-sm flex flex-col items-center gap-3">
                <span>No upcoming games scheduled.</span>
                {canScheduleMatches && (
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {pastMatches.length > 0 ? "Schedule a Game" : "Schedule Your First Game"}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMatches.map((m) => {
                  const isHome = m.homeTeamId === teamId;
                  const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                  const opponentName = allTeams[opponentId]?.name || (isHome ? m.awayTeamName : m.homeTeamName) || "Opponent";
                  const isAsyncMatch = !!(m.isAsyncStatKeeping || m.isIndependent);
                  const statKeeperUrl = isAsyncMatch
                    ? `/teams/${teamId}/matches/${m.id}/stat-keeper`
                    : `/matches/${m.id}/play-by-play`;
                  // League games are scored by the league admin or a scorer they invite, not the teams playing.
                  const canRecordThis = !isTeamLeagueArchived && (isIndependentTeam ||
                    canRecordMatch(m, { isDemo: isDemoLeague, isLeagueAdmin, canManageTeam }));

                  return (
                    <div
                      key={m.id}
                      className="bg-neutral-900/70 border border-white/5 rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-white/15 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-[11px] font-mono text-neutral-400 bg-white/5 px-2 sm:px-2.5 py-1 rounded-md border border-white/5 whitespace-nowrap">
                              {m.week || "Gameday"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest whitespace-nowrap ${m.status === "in_progress" ? (getGameDisplayState(m, now) === "live" ? "text-red-600 dark:text-red-300" : "text-amber-400") : "text-emerald-400"}`}>
                              {m.status === "in_progress" ? (getGameDisplayState(m, now) === "live" ? "● LIVE NOW" : "Ⅱ PAUSED") : "Upcoming"}
                            </span>
                            {canDeleteMatch && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteMatch(e, m.id)}
                                title="Delete Event"
                                className="min-h-9 min-w-9 inline-flex items-center justify-center p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 my-4">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <TeamLogo
                              teamName={teamName}
                              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
                              isDemo={isDemoLeague}
                              primaryColor={team?.primaryColor || team?.color}
                            />
                            <span className="font-bold text-sm sm:text-base leading-tight min-w-0 break-words">{teamName}</span>
                          </div>
                          <span className="text-xs font-black text-neutral-500 uppercase shrink-0">{isHome ? "VS" : "@"}</span>
                          <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0 flex-1 text-right">
                            <span className="font-bold text-sm sm:text-base leading-tight min-w-0 break-words text-neutral-300">{opponentName}</span>
                            <TeamLogo
                              teamName={opponentName}
                              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0"
                              isDemo={isDemoLeague}
                              primaryColor={allTeams[opponentId]?.primaryColor || allTeams[opponentId]?.color}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-white/5 text-xs text-neutral-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{localMatchDate(m.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                          </div>
                          {m.time && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              <span>{formatMatchTime(m.time)}</span>
                            </div>
                          )}
                          {m.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                              <span className="truncate">{m.location}</span>
                              <VenueDirections location={m.location} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5">
                        <Link
                          href={canRecordThis ? statKeeperUrl : `/matches/${m.id}/play-by-play${isDemoLeague ? "?demo=true" : ""}`}
                          title={canRecordThis ? undefined : "Only the league admin or a scorer they invite can record this game."}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm border ${
                            canRecordThis && isAsyncMatch
                              ? "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-black border-emerald-500/30 hover:border-emerald-500"
                              : "bg-white/5 hover:bg-white/10 text-slate-700 dark:text-neutral-300 hover:text-white border-white/10 hover:border-cyan-500"
                          }`}
                        >
                          <PlayCircle className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">{!canRecordThis ? "Watch Game" : isAsyncMatch ? <>Record Stats</> : "Track Game"}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Matches */}
          <div data-tour="team-past-results" className="space-y-4 pt-4">
            <div className="flex items-center gap-2.5 text-base sm:text-lg font-black uppercase tracking-wide sm:tracking-wider whitespace-nowrap text-blue-400">
              <History className="w-5 h-5 shrink-0" />
              <span>Past Results & Box Scores</span>
            </div>

            {pastMatches.length === 0 ? (
              <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-8 text-center text-neutral-400 italic text-sm">
                No completed games recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastMatches.map((m) => {
                  const isHome = m.homeTeamId === teamId;
                  const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                  const opponentName = allTeams[opponentId]?.name || (isHome ? m.awayTeamName : m.homeTeamName) || "Opponent";
                  const scored = isHome ? m.homeScore : m.awayScore;
                  const allowed = isHome ? m.awayScore : m.homeScore;
                  const isWin = scored > allowed;
                  const isLoss = scored < allowed;
                  const isAsyncMatch = !!(m.isAsyncStatKeeping || m.isIndependent);
                  const matchUrl = isAsyncMatch ? `/teams/${teamId}/matches/${m.id}/stat-keeper` : `/matches/${m.id}`;

                  return (
                    <Link
                      key={m.id}
                      href={matchUrl}
                      className="bg-neutral-900/70 border border-white/5 rounded-3xl p-4 sm:p-6 backdrop-blur-md shadow-xl flex items-center justify-between gap-3 hover:bg-neutral-900 hover:border-white/15 transition-all group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 font-mono">
                            {localMatchDate(m.date).toLocaleDateString()}
                          </span>
                          {m.isPlayoff && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {m.playoffRound || "Playoffs"}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-sm sm:text-base leading-snug text-white group-hover:text-[var(--team-ink)] transition-colors break-words">
                          {isHome ? "vs" : "@"} {opponentName}
                        </div>
                        <div className="text-xs text-neutral-400 whitespace-nowrap">Box Score & Plays →</div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <span className="text-xl sm:text-2xl font-black tabular-nums tracking-tight whitespace-nowrap">
                          {scored} - {allowed}
                        </span>
                        <span
                          className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm ${
                            isWin
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isLoss
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30"
                          }`}
                        >
                          {isWin ? "W" : isLoss ? "L" : "T"}
                        </span>
                        {canDeleteMatch && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMatch(e, m.id)}
                            title="Delete Event"
                            className="p-1.5 sm:p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded-xl transition-colors cursor-pointer z-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <TeamPortalFooter section="Schedule" />

      {/* SCHEDULE MATCH MODAL */}
      {isScheduleModalOpen && canScheduleMatches && (
        <div className="fixed inset-0 top-[var(--role-switcher-height,0px)] z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="exhibition-game-modal-title" className="bg-neutral-950 border border-emerald-500/40 rounded-3xl max-w-lg w-full max-h-[calc(100dvh-var(--role-switcher-height,0px)-2rem)] overflow-y-auto p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              aria-label="Close"
              className="absolute top-6 right-6 text-neutral-400 hover:text-white p-2 rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 border border-emerald-500/30">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <PageGuideButton className="mb-2" />
                <h3 id="exhibition-game-modal-title" className="text-xl font-black uppercase text-white">Schedule Exhibition Game</h3>
                <p className="text-xs text-neutral-400">Independent game against a custom named opponent</p>
              </div>
            </div>

            <form data-tour="team-game-opponent" onSubmit={handleCreateMatch} className="space-y-4">
              {scheduleError && <p role="alert" className="text-red-300">{scheduleError}</p>}
              <div>
                <label htmlFor="exhibition-opponent-name" className="text-xs font-bold text-neutral-300 block mb-1">Opponent Team Name</label>
                <input
                  id="exhibition-opponent-name"
                  type="text"
                  required
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="e.g. Gotham Rogues, Eastside Blitz"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-semibold"
                />
              </div>

              {/* Home or Away Selection */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">Host Designation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHostHome(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isHostHome
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900 border-white/10 text-neutral-400"
                    }`}
                  >
                    Home Team ({teamName})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHostHome(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      !isHostHome
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-neutral-900 border-white/10 text-neutral-400"
                    }`}
                  >
                    Away / Visiting Team
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="team-game-type" className="text-xs font-bold text-neutral-300 block mb-1">Game Type</label>
                <select
                  data-tour="team-game-details"
                  id="team-game-type"
                  value={gameType}
                  onChange={(e) => setGameType(e.target.value as "regular" | "playoff" | "championship")}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-semibold"
                >
                  <option value="regular">Regular season</option>
                  <option value="playoff">Playoff game</option>
                  <option value="championship">Championship game</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exhibition-match-date" className="text-xs font-bold text-neutral-300 block mb-1">Date</label>
                  <input
                    id="exhibition-match-date"
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="exhibition-match-time" className="text-xs font-bold text-neutral-300 block mb-1">Time</label>
                  <input
                    id="exhibition-match-time"
                    type="time"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="exhibition-match-location" className="text-xs font-bold text-neutral-300 block mb-1">Field / Venue Location</label>
                <input
                  id="exhibition-match-location"
                  type="text"
                  value={matchLocation}
                  onChange={(e) => setMatchLocation(e.target.value)}
                  placeholder="e.g. Field 2 Turf"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-sm outline-none focus:border-emerald-400"
                />
              </div>

              {/* Mode information callout */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-xs text-neutral-300 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>Untimed Game</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  All timing, play clocks, and timeout features are automatically disabled. Stat keeping is tracked simply by First Half and Second Half with Start Play and Halftime controls.
                </p>
              </div>

              <button
                type="submit"
                data-tour="team-game-save"
                disabled={isScheduling}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>{isScheduling ? "Scheduling..." : "Confirm & Schedule Game"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
