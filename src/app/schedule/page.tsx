"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import VenueDirections from "@/components/VenueDirections";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Database,
  Plus,
  Edit2,
  X,
  GripVertical,
  Zap,
  Sparkles,
  Trophy,
  Filter,
  Trash2,
  Layers,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, where, limit } from "firebase/firestore";
import { createSecureRecord } from "@/lib/secureWrites";
import { useAuth } from "@/lib/authContext";
import { useLeague, PlayoffFormat, resolveLeaguePlayoffFormat } from "@/lib/leagueContext";
import { renderFlagOS } from "@/components/FlagOSText";
import { isRealTeam } from "@/components/TeamAssets";
import { usePrivateLeagueAccess } from "@/lib/usePrivateLeagueAccess";
import { simulateFullGame } from "@/lib/gameSimulator";
import {
  getSandboxTeams,
  getSandboxMatches,
  addSandboxMatch,
  updateSandboxMatch,
  deleteSandboxMatch,
  deleteSandboxPlaysForMatch,
  setSandboxMatches,
  clearSandboxMatches,
  subscribeDemoSandbox,
  saveSandboxScheduleBackup,
  getSandboxScheduleBackup,
  restoreSandboxScheduleBackup,
  clearSandboxScheduleBackup,
  ScheduleBackup,
} from "@/lib/demoSandbox";
import { getLeagueSeasonMatchDocs, subscribeLeagueSeasonMatches } from "@/lib/leagueDataCache";
import { isDemoExplicitlyRequested } from "@/lib/demoSandboxRuntime";
import NoLeagueSelected from "@/components/league/NoLeagueSelected";
import {
  calculateStandings,
  isPlayoffActive,
  isPlayoffMatch,
  generatePlayoffBracket,
  computePlayoffMatchupUpdates,
  getPlayoffChampionId,
} from "@/lib/standingsEngine";
import PlayoffBracketView from "@/components/schedule/PlayoffBracketView";
import AutomatedScheduleBuilderModal from "@/components/schedule/AutomatedScheduleBuilderModal";
import EditPlayoffFormatModal from "@/components/schedule/EditPlayoffFormatModal";
import FieldHelpTooltip from "@/components/FieldHelpTooltip";
import { getGameDisplayState, useNow } from "@/lib/gameLiveState";
import { usePageGuide } from "@/lib/pageGuide";
import { SCHEDULE_WALKTHROUGH, SCHEDULE_EVENT_MODAL_WALKTHROUGH, PLAYOFF_FORMAT_MODAL_WALKTHROUGH } from "@/lib/walkthroughs/league";
import PageGuideButton from "@/components/walkthrough/PageGuideButton";

interface Match {
  id: string;
  week: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
  date: string;
  time: string;
  location: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
  matchdayIndex: number;
  isPreseason?: boolean;
  isPlayoff?: boolean;
  playoffRound?: string;
  bracketSlot?: number;
  manualMatchup?: boolean;
  order?: number;
}

export default function Calendar() {
  usePageGuide(SCHEDULE_WALKTHROUGH);
  const { user, isLeagueAdmin, isPlatformAdmin } = useAuth();
  const { settings, updateSettings, isDemoLeague, activeLeagueId, isLeagueArchived, currentSeasonId, portalLeagueId } = useLeague();
  // `?league=` opens the schedule on a specific league; hold off loading until the provider has picked it up.
  const [awaitingLeague, setAwaitingLeague] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("league"),
  );
  useEffect(() => {
    if (awaitingLeague && activeLeagueId === awaitingLeague) {
      setAwaitingLeague(null);
      return;
    }
    if (!awaitingLeague) return;
    const timer = setTimeout(() => setAwaitingLeague(null), 2500);
    return () => clearTimeout(timer);
  }, [awaitingLeague, activeLeagueId]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [simulatingMatchId, setSimulatingMatchId] = useState<string | null>(null);

  const handleSimulateMatch = async (matchId: string, homeTeamName: string, awayTeamName: string) => {
    if (!isPlatformAdmin) return;
    if (
      !window.confirm(
        `⚡ Simulate Full Game?\n\nThis will randomly generate a complete, realistic game of play-by-play (passes, runs, TDs, 1/2pt conversions, flags, PBUs, sacks) between ${homeTeamName} and ${awayTeamName}.\n\nAll events and scores will calculate into official team standings and player stat leaderboards.`
      )
    ) {
      return;
    }
    setSimulatingMatchId(matchId);
    try {
      const res = await simulateFullGame(matchId, {
        leagueId: activeLeagueId,
        isDemo: isDemoLeague,
      });
      if (res.success) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                ...m,
                status: "completed",
                homeScore: res.homeScore,
                awayScore: res.awayScore,
              }
              : m
          )
        );
      } else {
        alert(res.error || "Failed to simulate match.");
      }
    } catch (err: any) {
      console.error("Simulation error:", err);
      alert(err.message || "Failed to simulate match.");
    } finally {
      setSimulatingMatchId(null);
    }
  };
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  // Active Main View: "schedule" (Regular Season) vs "playoffs" (Playoff Picture / Playoffs)
  const [activeView, setActiveView] = useState<"schedule" | "playoffs">("schedule");
  // Week Filter for Regular Season view; resolved to the current week once matches load
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string | null>(null);
  const weekFilterResolvedRef = useRef(false);

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const isEmbedQuery = sp.get("embed") === "true";
      let isIframe = false;
      try {
        isIframe = window.self !== window.top;
      } catch (e) { }
      return isEmbedQuery || isIframe;
    }
    return false;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const isEmbedQuery = sp.get("embed") === "true";
      let isIframe = false;
      try {
        isIframe = window.self !== window.top;
      } catch (e) { }
      if (isEmbedQuery || isIframe) setIsEmbedded(true);
      if (sp.get("view") === "playoffs") setActiveView("playoffs");
      if (sp.get("week")) {
        setSelectedWeekFilter(sp.get("week"));
        weekFilterResolvedRef.current = true;
      }
    }
  }, []);

  // The demo league is only shown when it was explicitly entered (demo button/URL, embed, or the
  // in-memory demo portal). A bare "/schedule" visit has no league to show. The real context
  // always provides portalLeagueId (null when no portal is being browsed).
  const demoRequested = isDemoExplicitlyRequested(portalLeagueId) || isEmbedded;
  const noLeagueSelected = portalLeagueId === null && !awaitingLeague && !demoRequested;
  // The server cannot read the query string, so the picker only renders after mount; until then
  // the page shows its usual loading state, keeping server and first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Archived leagues are read-only; the server rejects schedule writes until reactivation.
  const canManageSchedule = Boolean((isLeagueAdmin || isEmbedded) && !isLeagueArchived);

  // Manual Match Edit/Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  usePageGuide(isModalOpen ? SCHEDULE_EVENT_MODAL_WALKTHROUGH : null, 1);
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [matchSaveError, setMatchSaveError] = useState<string | null>(null);

  const { isDenied, deniedElement } = usePrivateLeagueAccess();



  // Automated Schedule Builder Modal
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  // Clear Schedule Confirmation
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  // In-Season Playoff Format Customizer Modal
  const [isEditPlayoffFormatOpen, setIsEditPlayoffFormatOpen] = useState(false);
  usePageGuide(isEditPlayoffFormatOpen ? PLAYOFF_FORMAT_MODAL_WALKTHROUGH : null, 1);

  // 24-Hour Overwrite Schedule Backup State (Single Snapshot)
  const [scheduleBackup, setScheduleBackup] = useState<ScheduleBackup | null>(null);
  const [backupTimeRemaining, setBackupTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateBackupState = () => {
      const backup = getSandboxScheduleBackup();
      setScheduleBackup(backup);
      if (backup) {
        const msLeft = backup.expiresAt - Date.now();
        if (msLeft <= 0) {
          clearSandboxScheduleBackup();
          setScheduleBackup(null);
          setBackupTimeRemaining("");
        } else {
          const hours = Math.floor(msLeft / (1000 * 60 * 60));
          const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
          setBackupTimeRemaining(`${hours}h ${minutes}m`);
        }
      }
    };

    updateBackupState();
    const interval = setInterval(updateBackupState, 30000);
    const unsub = subscribeDemoSandbox(() => updateBackupState());
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setIsModalOpen(false);
        setMatchSaveError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const sortMatches = (mData: Match[]) => {
    return [...mData].sort((a, b) => {
      if (typeof a.order === "number" && typeof b.order === "number") {
        return a.order - b.order;
      }
      if (typeof a.order === "number") return -1;
      if (typeof b.order === "number") return 1;

      if (a.matchdayIndex !== b.matchdayIndex) return a.matchdayIndex - b.matchdayIndex;
      return (a.time || "").localeCompare(b.time || "");
    });
  };

  useEffect(() => {
    setLoading(true);
    if (awaitingLeague) return;
    if (noLeagueSelected) {
      setTeams([]);
      setMatches([]);
      setLoading(false);
      return;
    }

    if (isDemoLeague || isEmbedded) {
      const loadDemoData = () => {
        const tList = getSandboxTeams().filter(isRealTeam);
        setTeams(tList);
        const mList = (getSandboxMatches() as unknown as Match[]).filter(
          (m) => m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents"
        );
        setMatches(sortMatches(mList));
        setLoading(false);
      };
      loadDemoData();
      const unsub = subscribeDemoSandbox(() => loadDemoData());
      return () => unsub();
    }

    // Fetch teams once
    getDocs(query(
      collection(db, "teams"),
      where("leagueId", "==", activeLeagueId),
      limit(64),
    )).then((teamsSnap) => {
      setTeams(
        teamsSnap.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .filter((t: any) => isRealTeam(t) && (!t.leagueId || t.leagueId === activeLeagueId))
      );
    }).catch((err) => {
      console.warn("Failed to fetch teams from firestore:", err);
    });

    // Listen to matches in real-time
    const unsub = subscribeLeagueSeasonMatches(
      activeLeagueId,
      (snap) => {
        const mData = snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as unknown as Match))
          .filter((m: any) => !m.isHidden && (!m.leagueId || m.leagueId === activeLeagueId));

        setMatches(sortMatches(mData));
        setLoading(false);
      },
      (error) => {
        console.warn("Schedule onSnapshot warning:", error);
        setLoading(false);
      },
      currentSeasonId,
    );

    return () => unsub();
  }, [isDemoLeague, isEmbedded, activeLeagueId, currentSeasonId, awaitingLeague, noLeagueSelected]);

  // Standings & Playoff Calculations
  const playoffActive = useMemo(() => isPlayoffActive(matches), [matches]);
  const playoffTabLabel = playoffActive ? "Playoffs" : "Playoff Picture";

  const playoffFormat: PlayoffFormat = useMemo(() => {
    return resolveLeaguePlayoffFormat(settings?.playoffFormat, teams.length, isDemoLeague);
  }, [settings?.playoffFormat, teams.length, isDemoLeague]);

  const standings = useMemo(() => {
    return calculateStandings(teams, matches, playoffFormat.teamsCount);
  }, [teams, matches, playoffFormat.teamsCount]);

  const bracketRounds = useMemo(() => {
    return generatePlayoffBracket(standings, playoffFormat, matches);
  }, [standings, playoffFormat, matches]);

  const championTeam = useMemo(() => {
    const championId = getPlayoffChampionId(bracketRounds);
    return championId ? teams.find((t) => t.id === championId) : undefined;
  }, [bracketRounds, teams]);

  const playoffMatches = useMemo(
    () => matches
      .filter((m) => isPlayoffMatch(m))
      .sort((a, b) => (a.matchdayIndex ?? 0) - (b.matchdayIndex ?? 0) || (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0)),
    [matches],
  );

  // Once the regular season is final, seed the playoff games from standings and advance winners.
  const appliedPlayoffUpdatesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isLeagueAdmin || isLeagueArchived || isDemoLeague || isEmbedded || loading || teams.length === 0) return;
    const updates = computePlayoffMatchupUpdates(standings, playoffFormat, matches).filter((update) => {
      const key = `${update.matchId}:${update.homeTeamId}:${update.awayTeamId}`;
      if (appliedPlayoffUpdatesRef.current.has(key)) return false;
      appliedPlayoffUpdatesRef.current.add(key);
      return true;
    });
    if (updates.length === 0) return;
    (async () => {
      for (const update of updates) {
        try {
          await createSecureRecord("match_update", { ...update });
        } catch (err) {
          console.warn("Failed to update playoff matchup:", err);
        }
      }
    })();
  }, [isLeagueAdmin, isLeagueArchived, isDemoLeague, isEmbedded, loading, teams.length, standings, playoffFormat, matches]);

  // Unique list of Regular Season Weeks for the week pill filter
  const regularSeasonWeeks = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (!m.isPlayoff && !m.week?.toString().toLowerCase().includes("playoff")) {
        set.add(m.week);
      }
    });
    return Array.from(set).sort((a, b) => {
      const nA = parseInt(a.replace(/\D/g, "") || "0", 10);
      const nB = parseInt(b.replace(/\D/g, "") || "0", 10);
      return nA - nB;
    });
  }, [matches]);

  // Default to the first week that still has unfinished games (or the last week).
  useEffect(() => {
    if (loading) return;
    if (selectedWeekFilter && !regularSeasonWeeks.includes(selectedWeekFilter)) {
      weekFilterResolvedRef.current = false;
    }
    if (weekFilterResolvedRef.current || regularSeasonWeeks.length === 0) return;
    weekFilterResolvedRef.current = true;
    const currentWeek = regularSeasonWeeks.find((week) =>
      matches.some((m) => m.week === week && m.status !== "completed" && m.status !== "Final")
    );
    setSelectedWeekFilter(currentWeek || regularSeasonWeeks[regularSeasonWeeks.length - 1]);
  }, [loading, regularSeasonWeeks, matches, selectedWeekFilter]);

  // Filtered Regular Season Matches
  const displayedRegularSeasonMatches = useMemo(() => {
    return matches.filter((m) => {
      if (m.isPlayoff || m.week?.toString().toLowerCase().includes("playoff")) {
        return false;
      }
      if (selectedWeekFilter && m.week !== selectedWeekFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (selectedWeekFilter) return 0;
      const weekA = parseInt(a.week?.replace(/\D/g, "") || "0", 10);
      const weekB = parseInt(b.week?.replace(/\D/g, "") || "0", 10);
      return weekA - weekB;
    });
  }, [matches, selectedWeekFilter]);

  // Drag and Drop ordering
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    if (!canManageSchedule) return;
    setDraggedMatchId(matchId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetMatchId: string) => {
    e.preventDefault();
    if (!canManageSchedule || !draggedMatchId || draggedMatchId === targetMatchId) return;

    const oldIndex = matches.findIndex((m) => m.id === draggedMatchId);
    const newIndex = matches.findIndex((m) => m.id === targetMatchId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newMatches = [...matches];
    const [removed] = newMatches.splice(oldIndex, 1);
    newMatches.splice(newIndex, 0, removed);

    const updatedMatches = newMatches.map((m, idx) => ({ ...m, order: idx }));
    setMatches(sortMatches(updatedMatches));

    if (isDemoLeague || isEmbedded) {
      for (let i = 0; i < newMatches.length; i++) {
        updateSandboxMatch(newMatches[i].id, { order: i });
      }
      setDraggedMatchId(null);
      return;
    }

    try {
      for (let i = 0; i < newMatches.length; i++) {
        await updateDoc(doc(db, "matches", newMatches[i].id), { order: i });
      }
    } catch (err) {
      console.error("Failed to save match order", err);
    }
    setDraggedMatchId(null);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    const homeT = teams.find((t) => t.id === editingMatch.homeTeamId);
    const awayT = teams.find((t) => t.id === editingMatch.awayTeamId);
    const isPlayoffGame = Boolean(editingMatch.isPlayoff || editingMatch.week?.toString().toLowerCase().includes("playoff"));
    const originalMatch = editingMatch.id ? matches.find((m) => m.id === editingMatch.id) : undefined;

    const matchDataToSave = {
      ...editingMatch,
      homeTeamName: homeT?.name || (isPlayoffGame && !editingMatch.homeTeamId ? originalMatch?.homeTeamName || "TBD" : ""),
      awayTeamName: awayT?.name || (isPlayoffGame && !editingMatch.awayTeamId ? originalMatch?.awayTeamName || "TBD" : ""),
      matchdayIndex: isPlayoffGame && typeof editingMatch.matchdayIndex === "number"
        ? editingMatch.matchdayIndex
        : parseInt(editingMatch.week?.replace(/\D/g, "") || "0", 10),
      status: editingMatch.status || "upcoming",
    };
    setMatchSaveError(null);

    if (isDemoLeague || isEmbedded) {
      if (editingMatch.id) {
        updateSandboxMatch(editingMatch.id, matchDataToSave as any);
      } else {
        addSandboxMatch(matchDataToSave as any);
      }
      setIsModalOpen(false);
      return;
    }

    try {
      if (editingMatch.id) {
        const teamsChanged = !originalMatch ||
          (originalMatch.homeTeamId || "") !== (matchDataToSave.homeTeamId || "") ||
          (originalMatch.awayTeamId || "") !== (matchDataToSave.awayTeamId || "");
        if (teamsChanged) {
          await createSecureRecord("match_update", {
            matchId: editingMatch.id,
            homeTeamId: matchDataToSave.homeTeamId || "",
            awayTeamId: matchDataToSave.awayTeamId || "",
            homeTeamName: matchDataToSave.homeTeamName,
            awayTeamName: matchDataToSave.awayTeamName,
            ...(isPlayoffGame ? { manualMatchup: true } : {}),
          });
        }
        const {
          id: _id, homeTeamId: _home, awayTeamId: _away, leagueId: _league,
          homeTeamName: _homeName, awayTeamName: _awayName,
          createdAt: _created, managingTeamId: _managing, isStandalone: _standalone,
          ...otherFields
        } = matchDataToSave as any;
        await updateDoc(doc(db, "matches", editingMatch.id), otherFields);
      } else {
        await createSecureRecord("match", {
          ...matchDataToSave,
          leagueId: activeLeagueId,
        });
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      setMatchSaveError(e instanceof Error ? e.message : "Could not save this game. Please try again.");
    }
  };

  const handleDeleteSingleMatch = async (matchId: string) => {
    if (!canManageSchedule) return;
    if (!window.confirm("Are you sure you want to permanently delete this event? This action cannot be undone.")) {
      return;
    }

    if (isDemoLeague || isEmbedded) {
      deleteSandboxPlaysForMatch(matchId);
      deleteSandboxMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      if (editingMatch?.id === matchId) {
        setIsModalOpen(false);
        setEditingMatch(null);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, "matches", matchId));
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      if (editingMatch?.id === matchId) {
        setIsModalOpen(false);
        setEditingMatch(null);
      }
    } catch (err) {
      console.error("Failed to delete match:", err);
      alert("Failed to delete match. Please check permissions.");
    }
  };

  const handleClearSchedule = async () => {
    if (isDemoLeague || isEmbedded) {
      clearSandboxMatches();
      setMatches([]);
      setSelectedWeekFilter(null);
      setIsClearConfirmOpen(false);
      return;
    }

    try {
      for (const d of await getLeagueSeasonMatchDocs(activeLeagueId)) {
        await deleteDoc(d.ref);
      }
      setMatches([]);
      setSelectedWeekFilter(null);
      setIsClearConfirmOpen(false);
    } catch (err) {
      console.error("Failed to clear matches:", err);
    }
  };

  const handleApplyGeneratedSchedule = async (
    generatedMatches: any[],
    newPlayoffFormat: PlayoffFormat,
    clearExisting: boolean,
    targetView?: "schedule" | "playoffs"
  ) => {
    // 1. If replacing/clearing an existing schedule, save a single backup copy for 24 hours.
    // Overwriting again permanently discards previous backup and starts a fresh 24h clock.
    if (clearExisting && matches.length > 0) {
      saveSandboxScheduleBackup(matches);
      setScheduleBackup(getSandboxScheduleBackup());
    }

    // 2. Update playoff format in league settings
    await updateSettings({ playoffFormat: newPlayoffFormat });

    // 3. Commit matches
    if (isDemoLeague || isEmbedded) {
      generatedMatches = generatedMatches.map((m, i) => ({
        ...m,
        id: m.id || `sandbox_match_${Date.now()}_${i}`,
      }));
      if (clearExisting) {
        setSandboxMatches(generatedMatches);
        setMatches(sortMatches(generatedMatches as Match[]));
      } else {
        const existing = getSandboxMatches();
        const combined = [...existing, ...generatedMatches];
        setSandboxMatches(combined);
        setMatches(sortMatches(combined as Match[]));
      }
      setSelectedWeekFilter(null);
      if (targetView) setActiveView(targetView);
      return;
    }

    try {
      if (clearExisting) {
        for (const d of await getLeagueSeasonMatchDocs(activeLeagueId)) {
          await deleteDoc(d.ref);
        }
      }
      for (const m of generatedMatches) {
        await createSecureRecord("match", { ...m, leagueId: activeLeagueId });
      }
      if (targetView) setActiveView(targetView);
    } catch (err) {
      console.error("Failed to apply generated schedule:", err);
    }
  };

  const handleRestoreBackup = async () => {
    if (!scheduleBackup || !scheduleBackup.matches) return;

    if (isDemoLeague || isEmbedded) {
      restoreSandboxScheduleBackup();
      setScheduleBackup(null);
      return;
    }

    try {
      for (const d of await getLeagueSeasonMatchDocs(activeLeagueId)) {
        await deleteDoc(d.ref);
      }
      for (const m of scheduleBackup.matches) {
        const { id, ...data } = m as any;
        await createSecureRecord("match", { ...data, leagueId: activeLeagueId });
      }
      clearSandboxScheduleBackup();
      setScheduleBackup(null);
    } catch (err) {
      console.error("Failed to restore schedule backup:", err);
    }
  };

  const handleClearBackup = () => {
    clearSandboxScheduleBackup();
    setScheduleBackup(null);
  };

  const handleSavePlayoffFormat = async (
    newTeamsCount: number,
    newStructure?: "single_elimination" | "double_elimination"
  ) => {
    // Modify playoff format at any point in the season WITHOUT touching fixtures or regenerating
    let P = 2;
    while (P < newTeamsCount) P *= 2;
    const byes = P - newTeamsCount;
    const structure = newStructure || playoffFormat.structure || "single_elimination";
    const baseWeeks = Math.round(Math.log2(P));
    const playoffWeeks = structure === "double_elimination" ? baseWeeks + 1 : baseWeeks;
    const updated: PlayoffFormat = {
      ...playoffFormat,
      teamsCount: newTeamsCount,
      structure,
      hasByes: byes > 0,
      byesCount: byes,
      playoffWeeks,
    };
    await updateSettings({ playoffFormat: updated });
    setIsEditPlayoffFormatOpen(false);
  };

  if (isDenied) {
    return deniedElement;
  }

  if (mounted && noLeagueSelected) {
    return <NoLeagueSelected pagePath="/schedule" noun="Schedules" />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-cyan-900/5 dark:bg-cyan-900/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-10 w-[35rem] h-[35rem] bg-blue-900/5 dark:bg-blue-900/10 rounded-full blur-[170px]" />
      </div>


      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 relative z-10 w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 max-w-full">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-widest">
                {settings.seasonTitle || "Current Season"} Schedule
              </span>
              <span className="text-slate-400 dark:text-[var(--text-muted)] text-xs">•</span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] dark:text-neutral-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                <span>Main venue: {settings.defaultLocation || "Turf Field 1"}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight flex items-center gap-2.5 sm:gap-3">
              <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-500 dark:text-blue-400 shrink-0" />
              <span>{renderFlagOS(settings.leagueName)} Calendar</span>
            </h1>
            <p className="text-[var(--text-muted)] dark:text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
              Game times, fields, scores, and playoff brackets.
            </p>
          </div>

          {canManageSchedule && (
            <div data-tour="schedule-actions" className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <button
                onClick={() => setIsAutoScheduleOpen(true)}
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current shrink-0" />
                <span>Build Schedule</span>
              </button>

              <button
                onClick={() => {
                  setEditingMatch({
                    week:
                      selectedWeekFilter ||
                      (regularSeasonWeeks.length > 0
                        ? `Week ${parseInt(regularSeasonWeeks[regularSeasonWeeks.length - 1].replace(/\D/g, "") || "0", 10) + 1}`
                        : "Week 1"),
                    date: new Date().toISOString().split("T")[0],
                    time: "10:00 AM",
                    location: settings.defaultLocation || "Turf Field 1",
                  });
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Schedule Game</span>
              </button>

              {matches.length > 0 && (
                <button
                  onClick={() => setIsClearConfirmOpen(true)}
                  title="Clear Schedule (Admin Reset)"
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 24-Hour Schedule Restore Alert Banner (Single Snapshot) */}
        {canManageSchedule && scheduleBackup && (
          <div data-tour="schedule-backup" className="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/95 dark:bg-gradient-to-r dark:from-amber-950/40 dark:via-neutral-900/90 dark:to-black/80 p-4 md:p-5 backdrop-blur-md shadow-md dark:shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-400">
                    Previous Schedule Archived (24-Hour Restore Window)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                    {backupTimeRemaining || "24h"} Left to Restore
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-neutral-300 leading-relaxed">
                  You regenerated your schedule. Your previous <strong className="text-slate-900 dark:text-white font-bold">{scheduleBackup.matches.length} games</strong> are saved in case this was accidental. Regenerating again will permanently overwrite this backup.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
              <button
                onClick={handleRestoreBackup}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 border border-amber-400/60 dark:border-amber-500/40 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Schedule</span>
              </button>
              <button
                onClick={handleClearBackup}
                title="Dismiss backup permanently"
                className="px-3 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-neutral-400 dark:hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300/80 dark:border-transparent"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* View Switcher Tabs: "Regular Season" vs "Playoff Picture" / "Playoffs" */}
        <div data-tour="schedule-views" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 bg-neutral-900/80 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveView("schedule")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeView === "schedule"
                ? "bg-cyan-700 text-[#fff] shadow-lg shadow-cyan-500/20"
                : "text-neutral-400 hover:text-white"
                }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Regular Season</span>
            </button>

            <button
              onClick={() => setActiveView("playoffs")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeView === "playoffs"
                ? "bg-cyan-700 text-[#fff] shadow-lg shadow-cyan-500/20"
                : "text-neutral-400 hover:text-white"
                }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{playoffTabLabel}</span>
              {playoffActive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ) : (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  Projected
                </span>
              )}
            </button>
          </div>

          {/* Regular Season Week Filter Pills (Only visible in schedule view when weeks exist) */}
          {activeView === "schedule" && regularSeasonWeeks.length > 1 && (
            <div className="scroll-hint-x flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedWeekFilter(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors whitespace-nowrap ${selectedWeekFilter === null
                  ? "bg-white text-black"
                  : "bg-white/5 text-neutral-400 hover:text-white border border-white/5"
                  }`}
              >
                All Weeks ({regularSeasonWeeks.length})
              </button>
              {regularSeasonWeeks.map((wk) => (
                <button
                  key={wk}
                  onClick={() => setSelectedWeekFilter(wk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors whitespace-nowrap ${selectedWeekFilter === wk
                    ? "bg-cyan-500 text-black font-black"
                    : "bg-white/5 text-neutral-400 hover:text-white border border-white/5"
                    }`}
                >
                  {wk}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <FlagOSLoader />
          </div>
        ) : activeView === "playoffs" ? (
          /* Playoff Picture / Playoffs View */
          <div data-tour="schedule-games" className="space-y-8">
            {championTeam && (
              <div className="flex items-center gap-4 p-5 md:p-6 rounded-3xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    {playoffFormat.championshipName || "League Champion"}
                  </p>
                  <p className="text-xl md:text-2xl font-black text-white">{championTeam.name} are champions!</p>
                </div>
              </div>
            )}
            <PlayoffBracketView
              standings={standings}
              bracketRounds={bracketRounds}
              format={playoffFormat}
              isPlayoffActive={playoffActive}
              canManageSchedule={canManageSchedule}
              onOpenScheduleBuilder={() => setIsAutoScheduleOpen(true)}
              onOpenPlayoffFormatModal={() => setIsEditPlayoffFormatOpen(true)}
            />
            {playoffMatches.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-5 md:p-6 space-y-3">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Playoff Games</h3>
                  <p className="text-xs text-neutral-400">
                    Matchups fill in automatically from final standings and advance as winners are decided.
                    {canManageSchedule ? " Use Edit to set a matchup manually." : ""}
                  </p>
                </div>
                <ul className="divide-y divide-white/5">
                  {playoffMatches.map((match) => (
                    <li key={match.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <Link href={`/matches/${match.id}`} className="min-w-0 hover:text-cyan-300">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                          {match.playoffRound || "Playoffs"} • {match.date} {match.time}
                        </p>
                        <p className="text-sm font-semibold text-white truncate">
                          {match.homeTeamName || "TBD"} vs {match.awayTeamName || "TBD"}
                          {(match.status === "completed" || match.status === "Final") &&
                            ` • ${match.homeScore ?? 0}-${match.awayScore ?? 0}`}
                        </p>
                      </Link>
                      {canManageSchedule && match.status !== "completed" && match.status !== "Final" && match.status !== "in_progress" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMatchSaveError(null);
                            setEditingMatch(match);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-200 flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* Regular Season View */
          <div data-tour="schedule-games" className="space-y-12">
            {/* Empty Schedule State Call-to-Action */}
            {matches.length === 0 ? (
              <div className="p-12 md:p-16 rounded-3xl border border-dashed border-cyan-500/30 bg-gradient-to-b from-neutral-900/50 to-black/80 text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <Zap className="w-8 h-8 fill-current" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    Season Schedule Is Empty
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
                    No games have been scheduled for this season yet. Use Build Schedule to
                    define your season weeks, kickoff time slots, field venues, and playoff format, and watch the
                    schedule build out right in front of you.
                  </p>
                </div>

                {canManageSchedule && (
                  <button
                    onClick={() => setIsAutoScheduleOpen(true)}
                    className="inline-flex items-center gap-2.5 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Build Schedule</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Regular Season Section */}
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedWeekFilter ? `${selectedWeekFilter} Matchups` : "Regular Season Schedule"}
                    </h2>
                    <span className="text-xs font-mono text-neutral-400">
                      {displayedRegularSeasonMatches.length} Games
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {displayedRegularSeasonMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`relative group ${draggedMatchId === match.id ? "opacity-50" : ""}`}
                        draggable={canManageSchedule}
                        onDragStart={(e) => handleDragStart(e, match.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, match.id)}
                      >
                        <Link
                          href={isEmbedded ? "#" : `/matches/${match.id}`}
                          onClick={(e) => {
                            if (isEmbedded) e.preventDefault();
                          }}
                          className={`block bg-neutral-900/50 border border-white/5 rounded-3xl p-6 hover:bg-neutral-900 transition-all duration-300 relative overflow-hidden hover:border-cyan-500/40 ${isEmbedded ? "cursor-default" : ""
                            }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-cyan-500/10 to-transparent" />

                          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <div className="flex items-center gap-2">
                              {canManageSchedule && (
                                <GripVertical className="w-5 h-5 text-neutral-600 cursor-grab hover:text-white" />
                              )}
                              <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">
                                {match.week?.toString().startsWith("Week") ? match.week : `Week ${match.week}`}
                              </span>
                            </div>
                            {match.status === "completed" ? (
                              <span className="text-xs font-semibold px-3 py-1 bg-neutral-800 text-neutral-300 rounded-full">
                                Final
                              </span>
                            ) : match.status === "in_progress" ? (
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 ${getGameDisplayState(match, now) === "live" ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300 border-red-500/30" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border-amber-500/30"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getGameDisplayState(match, now) === "live" ? "bg-red-400" : "bg-amber-400"}`} />
                                <span>{getGameDisplayState(match, now) === "live" ? "LIVE NOW" : "PAUSED"}</span>
                                {Boolean((match as any).half || (match as any).matchState?.half) && (
                                  <span className="font-mono">
                                    • Q{(match as any).half || (match as any).matchState?.half}
                                    {typeof ((match as any).gameClock ?? (match as any).matchState?.gameClock) === "number" && (
                                      ` ${Math.floor(((match as any).gameClock ?? (match as any).matchState?.gameClock) / 60)}:${String(((match as any).gameClock ?? (match as any).matchState?.gameClock) % 60).padStart(2, "0")}`
                                    )}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/20">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <div className="flex justify-between items-center gap-2 sm:px-4">
                            <div className="text-center w-[40%]">
                              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors break-words leading-tight">
                                {match.homeTeamName}
                              </h3>
                              {(match.status === "completed" || match.status === "in_progress") && (
                                <span className="text-3xl font-black block mt-2 text-neutral-200">
                                  {match.homeScore ?? 0}
                                </span>
                              )}
                            </div>

                            <div className="text-[var(--text-muted)] font-light text-sm italic w-[20%] text-center">
                              VS
                            </div>

                            <div className="text-center w-[40%]">
                              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors break-words leading-tight">
                                {match.awayTeamName}
                              </h3>
                              {(match.status === "completed" || match.status === "in_progress") && (
                                <span className="text-3xl font-black block mt-2 text-neutral-200">
                                  {match.awayScore ?? 0}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2 text-sm text-neutral-400 pr-24 sm:pr-36">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                              {match.date} • {match.time}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                              {match.location}
                              <VenueDirections location={match.location} inLink />
                            </div>
                          </div>
                        </Link>

                        {(canManageSchedule || (isPlatformAdmin && !isLeagueArchived)) && (
                          <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 flex items-center gap-1.5 z-20">
                            {isPlatformAdmin && !isLeagueArchived && match.status !== "completed" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSimulateMatch(match.id, match.homeTeamName, match.awayTeamName);
                                }}
                                disabled={simulatingMatchId === match.id}
                                title="Platform Admin: Randomly Generate Full Game Play-by-Play & Score"
                                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
                              >
                                <Zap className={`w-3.5 h-3.5 fill-amber-400 text-amber-400 ${simulatingMatchId === match.id ? "animate-spin" : ""}`} />
                                <span className="hidden sm:inline">{simulatingMatchId === match.id ? "Simulating..." : "Simulate"}</span>
                              </button>
                            )}
                            {canManageSchedule && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingMatch(match);
                                    setIsModalOpen(true);
                                  }}
                                  title="Edit Event"
                                  data-guide="manage-event"
                                  className="p-2 bg-neutral-900/90 border border-white/10 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteSingleMatch(match.id);
                                  }}
                                  title="Delete Event"
                                  data-guide="manage-event"
                                  className="p-2 bg-neutral-900/90 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {displayedRegularSeasonMatches.length === 0 && (
                      <div className="col-span-1 lg:col-span-2 py-24 text-center text-[var(--text-muted)] italic">
                        No matches found for the selected filter.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Manual Edit/Create Match Modal */}
      {isModalOpen && editingMatch && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="schedule-match-modal-title" className="bg-neutral-900 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 id="schedule-match-modal-title" className="text-2xl font-bold">{editingMatch.id ? "Edit Game" : "Schedule Game"}</h2>
              <div className="flex items-center gap-2">
              <PageGuideButton />
              <button
                onClick={() => { setIsModalOpen(false); setMatchSaveError(null); }}
                aria-label="Close"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-neutral-400"
              >
                <X className="w-5 h-5" />
              </button>
              </div>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4">
              <div data-tour="schedule-event-basics" className="space-y-4">
              <div>
                <label htmlFor="schedule-week-input" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                  <span>Week Title</span>
                  <FieldHelpTooltip
                    title="Week / Round"
                    content="Label for grouping games on the schedule (e.g. 'Week 1', 'Week 14', 'Wildcard Round', 'Championship')."
                  />
                </label>
                <input
                  id="schedule-week-input"
                  type="text"
                  required
                  value={editingMatch.week || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, week: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  placeholder="e.g. 'Week 1'"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-home-team-select" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                    <span>Home Team</span>
                    <FieldHelpTooltip
                      title="Home Team"
                      content="Choose the home team for this game."
                    />
                  </label>
                  <select
                    id="schedule-home-team-select"
                    name="homeTeamId"
                    aria-label="Home Team"
                    required={!editingMatch.isPlayoff}
                    value={editingMatch.homeTeamId || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, homeTeamId: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  >
                    <option value="" disabled={!editingMatch.isPlayoff}>
                      {editingMatch.isPlayoff ? "To be decided" : "Select Home"}
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="schedule-away-team-select" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                    <span>Away Team</span>
                    <FieldHelpTooltip
                      title="Away Team"
                      content="Choose the away team for this game."
                    />
                  </label>
                  <select
                    id="schedule-away-team-select"
                    name="awayTeamId"
                    aria-label="Away Team"
                    required={!editingMatch.isPlayoff}
                    value={editingMatch.awayTeamId || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, awayTeamId: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  >
                    <option value="" disabled={!editingMatch.isPlayoff}>
                      {editingMatch.isPlayoff ? "To be decided" : "Select Away"}
                    </option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="schedule-date-input" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                    <span>Date</span>
                    <FieldHelpTooltip
                      title="Game Date"
                      content="Calendar date scheduled for kickoff in YYYY-MM-DD or readable format (e.g. 2026-10-18)."
                    />
                  </label>
                  <input
                    id="schedule-date-input"
                    type="text"
                    required
                    value={editingMatch.date || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, date: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                    placeholder="e.g. '2026-10-18'"
                  />
                </div>
                <div>
                  <label htmlFor="schedule-time-input" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                    <span>Time</span>
                    <FieldHelpTooltip
                      title="Kickoff Time"
                      content="Scheduled match start time (e.g. 8:30 PM, 6:00 PM)."
                    />
                  </label>
                  <input
                    id="schedule-time-input"
                    type="text"
                    required
                    value={editingMatch.time || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, time: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                    placeholder="e.g. '8:30 PM'"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="schedule-location-input" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 mb-1">
                  <span>Location</span>
                  <FieldHelpTooltip
                    title="Pitch / Venue"
                    content="Field assignment or venue name (e.g. Field 1, Stadium Turf North)."
                  />
                </label>
                <input
                  id="schedule-location-input"
                  type="text"
                  required
                  value={editingMatch.location || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, location: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 focus:outline-none focus:border-cyan-400 text-white"
                  placeholder="e.g. 'Field 1'"
                />
              </div>



              </div>
              {editingMatch.id && (
                <div data-tour="schedule-event-score" className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-neutral-400 mb-1">
                      <span>Home Score</span>
                      <FieldHelpTooltip
                        title="Home Score"
                        content="Current points scored by the home team."
                      />
                    </label>
                    <input
                      type="number"
                      value={editingMatch.homeScore ?? 0}
                      onChange={(e) => setEditingMatch({ ...editingMatch, homeScore: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-neutral-400 mb-1">
                      <span>Away Score</span>
                      <FieldHelpTooltip
                        title="Away Score"
                        content="Current points scored by the away team."
                      />
                    </label>
                    <input
                      type="number"
                      value={editingMatch.awayScore ?? 0}
                      onChange={(e) => setEditingMatch({ ...editingMatch, awayScore: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-neutral-400 mb-1">
                      <span>Status</span>
                      <FieldHelpTooltip
                        title="Game Status"
                        content="'scheduled' (upcoming), 'in_progress' (live game), or 'completed' (final score recorded)."
                      />
                    </label>
                    <select
                      value={editingMatch.status || "scheduled"}
                      onChange={(e) => setEditingMatch({ ...editingMatch, status: e.target.value as any })}
                      className="w-full bg-black border border-white/10 rounded-xl p-2.5 focus:outline-none focus:border-cyan-400 text-white text-sm"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}

              {matchSaveError && (
                <p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                  {matchSaveError}
                </p>
              )}
              <div data-tour="schedule-event-actions" className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-4">
                {editingMatch.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSingleMatch(editingMatch.id!)}
                    className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 font-semibold rounded-xl transition-all flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Event</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setMatchSaveError(null); }}
                    className="px-5 py-3 font-semibold text-neutral-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/30 text-xs cursor-pointer"
                  >
                    {editingMatch.id ? "Save Changes" : "Schedule Game"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Automated Season Schedule Generator Modal with Live "Watch as it Builds" stream */}
      <AutomatedScheduleBuilderModal
        isOpen={isAutoScheduleOpen}
        onClose={() => setIsAutoScheduleOpen(false)}
        teams={teams}
        defaultLocation={settings?.defaultLocation}
        existingMatchesCount={matches.length}
        initialPlayoffFormat={playoffFormat}
        onApplySchedule={handleApplyGeneratedSchedule}
      />

      {/* In-Season Playoff Format Editor Modal (Changes format anytime without touching regular season schedule) */}
      <EditPlayoffFormatModal
        isOpen={isEditPlayoffFormatOpen}
        onClose={() => setIsEditPlayoffFormatOpen(false)}
        totalTeams={teams.length}
        currentTeamsCount={playoffFormat.teamsCount}
        currentStructure={playoffFormat.structure}
        onSave={handleSavePlayoffFormat}
      />

      {/* Clear Schedule Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B0F19] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Clear Full Schedule?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This will permanently delete all {matches.length} scheduled games in the calendar. You can rebuild
                the schedule from scratch or restore from backup within 24 hours.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleClearSchedule}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/30"
              >
                Clear All Games
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
