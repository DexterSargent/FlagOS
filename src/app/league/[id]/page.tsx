"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Activity,
  Trophy,
  Shield,
  ArrowRight,
  UserPlus,
  Clock,
  Crown,
  PlayCircle,
  Plus,
  Flame,
  ChevronRight,
  Palette,
  Target,
  Zap,
  Check,
  X,
  Award,
  Shirt,
  MapPin,
  TrendingUp,
  Radio,
  Sliders,
  ExternalLink,
  BookOpen,
  Settings,
  User,
  Crosshair,
  Sparkles,
  Lock,
  Globe,
  Copy,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, onSnapshot, addDoc } from "firebase/firestore";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { TeamLogo, getTeamShortcode, isRealTeam } from "@/components/TeamAssets";

import { renderFlagOS } from "@/components/FlagOSText";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getSandboxTeams,
  getSandboxPlayers,
  getSandboxMatches,
  getSandboxPlays,
  addSandboxPlayer,
  subscribeDemoSandbox,
} from "@/lib/demoSandbox";

const POSITIONS = ["QB", "WR", "RB", "C", "DB", "RUSH", "LB", "ATH"];

export default function FlagOSDashboard({ params }: { params?: Promise<{ id: string }> }) {
  const unwrappedParams = params ? use(params) : null;
  const leagueIdParam = unwrappedParams?.id;
  const { settings, openCustomizer, activeLeagueId, switchLeague, isDemoLeague } = useLeague();

  const [isEmbedded, setIsEmbedded] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("embed") === "true" || sp.get("demo") === "true";
    }
    return false;
  });

  const isEffectiveDemo = isDemoLeague || isEmbedded || leagueIdParam === "default" || leagueIdParam === "demo";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("embed") === "true" || sp.get("demo") === "true") {
        setIsEmbedded(true);
      }
    }
  }, []);

  useEffect(() => {
    if (leagueIdParam && leagueIdParam !== activeLeagueId) {
      switchLeague(leagueIdParam);
    }
  }, [leagueIdParam, activeLeagueId, switchLeague]);

  const {
    role,
    isLeagueAdmin,
    isTeamAdmin,
    isPlayer,
    playerId,
    playerTeamId,
    playerData,
    canManageTeam,
    managedTeamId,
    canRegisterAsPlayer,
    setDevRole,
  } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [plays, setPlays] = useState<any[]>([]);

  // Quick Add Player Modal State for Team Admin
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [newPlayerPositions, setNewPlayerPositions] = useState<string[]>([]);
  const [newPlayerExperience, setNewPlayerExperience] = useState("Rookie");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [copiedLeagueLink, setCopiedLeagueLink] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isEffectiveDemo) {
        const loadDemoData = () => {
          const tList = getSandboxTeams().filter(isRealTeam);
          const pList = getSandboxPlayers();
          const plList = getSandboxPlays();
          const mList = getSandboxMatches()
            .filter((m: any) => !m.isHidden && m.homeTeamId !== "team_free_agents" && m.awayTeamId !== "team_free_agents");
          mList.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setTeams(tList);
          setPlayers(pList);
          setPlays(plList);
          setMatches(mList);
        };
        loadDemoData();
        const unsub = subscribeDemoSandbox(() => loadDemoData());
        return () => unsub();
      }

      try {
        const [teamsSnap, playersSnap, playsSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(collection(db, "players")),
          getDocs(collection(db, "plays")),
        ]);

        const tList = teamsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter(isRealTeam);
        const pList = playersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const plList = playsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setTeams(tList);
        setPlayers(pList);
        setPlays(plList);

        const unsub = onSnapshot(collection(db, "matches"), (snap) => {
          const mList = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((m) => !m.isHidden);
          mList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setMatches(mList);
        }, (err) => {
          console.warn("Matches snapshot permission warning:", err);
        });

        return () => unsub();
      } catch (e) {
        console.warn("Non-critical: permission or network error loading dashboard data:", e);
      }
    };

    fetchData();
  }, [isEffectiveDemo]);

  // Compute Standings (strictly competitive teams only; free agents are not a team)
  const standingsMap: Record<
    string,
    { id: string; name: string; shortcode: string; w: number; l: number; t: number; pf: number; pa: number; pts: number }
  > = {};
  teams.filter(isRealTeam).forEach((t) => {
    standingsMap[t.id] = {
      id: t.id,
      name: t.name,
      shortcode: t.shortcode || getTeamShortcode(t),
      w: 0,
      l: 0,
      t: 0,
      pf: 0,
      pa: 0,
      pts: 0,
    };
  });

  const completedMatches = matches.filter((m) => m.status === "completed" || m.status === "Final");
  completedMatches.forEach((m) => {
    const h = standingsMap[m.homeTeamId];
    const a = standingsMap[m.awayTeamId];
    if (h && a && !m.isPreseason) {
      h.pf += m.homeScore || 0;
      h.pa += m.awayScore || 0;
      a.pf += m.awayScore || 0;
      a.pa += m.homeScore || 0;
      if ((m.homeScore || 0) > (m.awayScore || 0)) {
        h.w += 1;
        h.pts += 2;
        a.l += 1;
      } else if ((m.homeScore || 0) < (m.awayScore || 0)) {
        a.w += 1;
        a.pts += 2;
        h.l += 1;
      } else {
        h.t += 1;
        a.t += 1;
        h.pts += 1;
        a.pts += 1;
      }
    }
  });

  const sortedStandings = Object.values(standingsMap)
    .filter(isRealTeam)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const diffB = b.pf - b.pa;
      const diffA = a.pf - a.pa;
      if (diffB !== diffA) return diffB - diffA;
      return b.pf - a.pf;
    });

  // Compute Individual Stat Leaders for snapshot
  const playerStats: Record<
    string,
    { name: string; team: string; passTD: number; recTD: number; flagPulls: number; totalTD: number }
  > = {};
  players.forEach((p) => {
    const t = teams.find((tm) => tm.id === p.teamId);
    playerStats[p.playerName] = {
      name: p.playerName,
      team: t?.name || "",
      passTD: 0,
      recTD: 0,
      flagPulls: 0,
      totalTD: 0,
    };
  });

  // Completed match IDs set (strictly track stats from completed games)
  const completedMatchIds = new Set(
    matches
      .filter((m) => (m.status === "completed" || m.status === "Final") && !m.isHidden)
      .map((m) => m.id)
  );

  // Process plays from Firestore collection for completed games
  plays.forEach((play: any) => {
    if (!play.matchId || !completedMatchIds.has(play.matchId)) return;

    if (play.isTouchdown || play.result === "Touchdown") {
      if (play.playType === "Pass") {
        const qb = play.qbPlayerId || play.passer;
        if (qb && playerStats[qb]) {
          playerStats[qb].passTD += 1;
        }
        const rec = play.receiverPlayerId || play.receiver;
        if (rec && playerStats[rec]) {
          playerStats[rec].recTD += 1;
          playerStats[rec].totalTD += 1;
        }
      } else if (play.playType === "Run") {
        const runner = play.runnerPlayerId || play.runner;
        if (runner && playerStats[runner]) {
          playerStats[runner].totalTD += 1;
        }
      }
    }

    if (play.isPick6 || play.result === "Pick 6") {
      if (play.defenders && Array.isArray(play.defenders) && play.defenders[0]) {
        const def = play.defenders[0];
        if (playerStats[def]) playerStats[def].totalTD += 1;
      }
    }

    if (play.defenders && Array.isArray(play.defenders)) {
      play.defenders.forEach((d: string) => {
        if (playerStats[d]) playerStats[d].flagPulls += 1;
      });
    }
    if (play.flaggers && Array.isArray(play.flaggers)) {
      play.flaggers.forEach((flagger: string) => {
        if (playerStats[flagger]) playerStats[flagger].flagPulls += 1;
      });
    }
  });

  // Also support completed matches with embedded plays array
  completedMatches.forEach((m) => {
    if (m.plays && Array.isArray(m.plays) && !plays.some((p) => p.matchId === m.id)) {
      m.plays.forEach((play: any) => {
        if (play.result === "Touchdown") {
          if (play.playType === "Pass") {
            if (play.passer && playerStats[play.passer]) {
              playerStats[play.passer].passTD += 1;
            }
            if (play.receiver && playerStats[play.receiver]) {
              playerStats[play.receiver].recTD += 1;
              playerStats[play.receiver].totalTD += 1;
            }
          } else if (play.playType === "Run") {
            if (play.runner && playerStats[play.runner]) {
              playerStats[play.runner].totalTD += 1;
            }
          }
        }
        if (play.flaggers && Array.isArray(play.flaggers)) {
          play.flaggers.forEach((flagger: string) => {
            if (playerStats[flagger]) playerStats[flagger].flagPulls += 1;
          });
        }
      });
    }
  });

  const allStatEntries = Object.values(playerStats);
  const topPasser = [...allStatEntries].sort((a, b) => b.passTD - a.passTD)[0] || { name: "-", passTD: 0, team: "" };
  const topReceiver = [...allStatEntries].sort((a, b) => b.recTD - a.recTD)[0] || { name: "-", recTD: 0, team: "" };
  const topFlagger = [...allStatEntries].sort((a, b) => b.flagPulls - a.flagPulls)[0] || { name: "-", flagPulls: 0, team: "" };
  const topScorer = [...allStatEntries].sort((a, b) => b.totalTD - a.totalTD)[0] || { name: "-", totalTD: 0, team: "" };

  // Live & Upcoming Games Prioritization Logic
  const isMatchLive = (m: any) => {
    return (
      (m.status === "in_progress" || m.status === "live") &&
      m.status !== "completed" &&
      m.status !== "Final"
    );
  };

  const getLiveTimeRemaining = (m: any) => {
    const periodDuration = (settings.rules?.periodDurationMinutes || 20) * 60;
    const periodsCount = settings.rules?.periodsCount || 2;
    const currentPeriod = m.matchState?.half || m.matchState?.period || 1;
    const gameClock =
      typeof m.matchState?.gameClock === "number" ? m.matchState.gameClock : periodDuration;
    const remainingPeriods = Math.max(0, periodsCount - currentPeriod);
    return gameClock + remainingPeriods * periodDuration;
  };

  // Strictly deduplicate active matches so duplicate live games never appear
  const seenNonCompIds = new Set<string>();
  const seenNonCompMatchups = new Set<string>();
  const activeNonCompletedMatches = matches.filter((m) => {
    if (m.status === "completed" || m.status === "Final" || m.isHidden) return false;
    if (m.id === "match_demo_1" || m.id === "match_demo_3") return false;
    const matchupKey = `${m.week || ""}_${m.homeTeamId || ""}_${m.awayTeamId || ""}`;
    if (seenNonCompIds.has(m.id) || seenNonCompMatchups.has(matchupKey)) return false;
    seenNonCompIds.add(m.id);
    seenNonCompMatchups.add(matchupKey);
    return true;
  });

  // Live games prioritized by LEAST time remaining first
  const liveMatches = activeNonCompletedMatches
    .filter(isMatchLive)
    .sort((a, b) => getLiveTimeRemaining(a) - getLiveTimeRemaining(b));

  // Upcoming games sorted chronologically
  const upcomingOnlyMatches = activeNonCompletedMatches
    .filter((m) => !isMatchLive(m))
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) return timeA - timeB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  // Combined 4 next games (live games with least time remaining first, then upcoming games)
  const liveAndUpcomingGames = [...liveMatches, ...upcomingOnlyMatches].slice(0, 4);

  const upcomingMatches = activeNonCompletedMatches;

  // Team Admin Data Computation
  const managedTeam =
    teams.find((t) => t.id === managedTeamId) || (role === "team_admin" && teams.length > 0 ? teams[0] : null);
  const managedTeamStanding = managedTeam ? standingsMap[managedTeam.id] : null;
  const managedTeamStandingRank = managedTeam
    ? sortedStandings.findIndex((s) => s.id === managedTeam.id) + 1
    : 0;
  const managedTeamPlayers = managedTeam ? players.filter((p) => p.teamId === managedTeam.id) : [];
  const managedTeamMatches = managedTeam
    ? matches.filter((m) => m.homeTeamId === managedTeam.id || m.awayTeamId === managedTeam.id)
    : [];
  const managedTeamUpcoming = managedTeamMatches.filter(
    (m) => m.status !== "completed" && m.status !== "Final"
  )[0];

  // Opponent for Next Game
  const nextOpponentTeam = managedTeamUpcoming
    ? teams.find(
      (t) =>
        t.id ===
        (managedTeamUpcoming.homeTeamId === managedTeam?.id
          ? managedTeamUpcoming.awayTeamId
          : managedTeamUpcoming.homeTeamId)
    )
    : null;
  const nextOpponentName = managedTeamUpcoming
    ? managedTeamUpcoming.homeTeamId === managedTeam?.id
      ? managedTeamUpcoming.awayTeamName
      : managedTeamUpcoming.homeTeamName
    : "No game scheduled";

  // Team-Specific Stat Leaders
  const managedTeamPlayerNames = new Set(managedTeamPlayers.map((p) => p.playerName));
  const teamStatEntries = Object.values(playerStats).filter((ps) => managedTeamPlayerNames.has(ps.name));
  const teamTopPasser = [...teamStatEntries].sort((a, b) => b.passTD - a.passTD)[0] || { name: "-", passTD: 0 };
  const teamTopReceiver = [...teamStatEntries].sort((a, b) => b.recTD - a.recTD)[0] || { name: "-", recTD: 0 };
  const teamTopScorer = [...teamStatEntries].sort((a, b) => b.totalTD - a.totalTD)[0] || { name: "-", totalTD: 0 };
  const teamTopFlagger = [...teamStatEntries].sort((a, b) => b.flagPulls - a.flagPulls)[0] || { name: "-", flagPulls: 0 };
  const teamTopDefender = teamTopFlagger;

  // =========================================================================
  // Athlete & Player View Data Computation
  // =========================================================================
  const activePlayer =
    (playerId ? players.find((p) => p.id === playerId) : null) ||
    (playerData?.playerName ? players.find((p) => p.playerName === playerData.playerName) : null) ||
    ((isPlayer || role === "player") && players.length > 0 ? players[0] : null) ||
    playerData;

  const playerAssignedTeamId = activePlayer?.teamId || playerData?.teamId || playerTeamId;
  const myPlayerTeam = playerAssignedTeamId ? teams.find((t) => t.id === playerAssignedTeamId) : null;
  const myPlayerStanding = myPlayerTeam ? standingsMap[myPlayerTeam.id] : null;
  const myPlayerStandingRank = myPlayerTeam
    ? sortedStandings.findIndex((s) => s.id === myPlayerTeam.id) + 1
    : 0;

  const myPlayerTeammates = myPlayerTeam ? players.filter((p) => p.teamId === myPlayerTeam.id) : [];
  const myPlayerMatches = myPlayerTeam
    ? matches.filter((m) => m.homeTeamId === myPlayerTeam.id || m.awayTeamId === myPlayerTeam.id)
    : [];
  const myPlayerUpcomingMatch = myPlayerMatches.filter(
    (m) => m.status !== "completed" && m.status !== "Final"
  )[0];

  const myPlayerOpponentTeam = myPlayerUpcomingMatch
    ? teams.find(
      (t) =>
        t.id ===
        (myPlayerUpcomingMatch.homeTeamId === myPlayerTeam?.id
          ? myPlayerUpcomingMatch.awayTeamId
          : myPlayerUpcomingMatch.homeTeamId)
    )
    : null;
  const myPlayerOpponentName = myPlayerUpcomingMatch
    ? myPlayerUpcomingMatch.homeTeamId === myPlayerTeam?.id
      ? myPlayerUpcomingMatch.awayTeamName
      : myPlayerUpcomingMatch.homeTeamName
    : "No game scheduled";

  const pName = activePlayer?.playerName || playerData?.playerName || "";
  const pNumber =
    activePlayer?.playerNumber ||
    activePlayer?.number ||
    playerData?.number ||
    playerData?.playerNumber ||
    "00";
  const pPositions: string[] =
    Array.isArray(activePlayer?.positions) && activePlayer.positions.length > 0
      ? activePlayer.positions
      : activePlayer?.position
        ? [activePlayer.position]
        : Array.isArray(playerData?.positions) && playerData.positions.length > 0
          ? playerData.positions
          : ["ATH"];
  const pExperience = activePlayer?.experience || playerData?.experience || "Active Athlete";

  // Individual stats computed for this specific player
  const myStats = {
    gamesPlayed: 0,
    totalTDs: 0,
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
  };

  if (pName) {
    // Games played
    myPlayerMatches.forEach((m) => {
      if (m.status === "completed" || m.status === "Final") {
        const dnp = m.didNotPlay || [];
        if (!dnp.includes(pName)) {
          myStats.gamesPlayed += 1;
        }
      }
    });

    // Plays aggregated from collection
    plays.forEach((play: any) => {
      if (!play.matchId || !completedMatchIds.has(play.matchId)) return;

      // Passing
      if (play.playType === "Pass" && (play.qbPlayerId === pName || play.passer === pName)) {
        myStats.passAtt += 1;
        if (play.passOutcome === "Complete" || play.result === "Complete" || play.result === "Touchdown") {
          myStats.passComp += 1;
        }
        if (play.isTouchdown || play.result === "Touchdown") {
          myStats.passTD += 1;
          myStats.totalTDs += 1;
        }
      }

      // Receiving
      if (play.playType === "Pass" && (play.receiverPlayerId === pName || play.receiver === pName)) {
        if (play.passOutcome === "Complete" || play.result === "Complete" || play.result === "Touchdown") {
          myStats.receptions += 1;
        }
        if (play.isTouchdown || play.result === "Touchdown") {
          myStats.recTD += 1;
          myStats.totalTDs += 1;
        }
      }

      // Rushing
      if (play.playType === "Run" && (play.runnerPlayerId === pName || play.runner === pName)) {
        myStats.rushAtt += 1;
        if (play.isTouchdown || play.result === "Touchdown") {
          myStats.rushTD += 1;
          myStats.totalTDs += 1;
        }
      }

      // Pick 6
      if (play.isPick6 || play.result === "Pick 6") {
        if (play.defenders && Array.isArray(play.defenders) && play.defenders.includes(pName)) {
          myStats.totalTDs += 1;
        }
      }

      // Defense
      if (play.defenders && Array.isArray(play.defenders) && play.defenders.includes(pName)) {
        if (play.passOutcome === "Interception") {
          myStats.int += 1;
        } else if (play.passOutcome === "PBU") {
          myStats.pbu += 1;
        } else if (play.passOutcome === "Sack") {
          myStats.sacks += 1;
          myStats.flagPulls += 1;
        } else {
          myStats.flagPulls += 1;
        }
      }
      if (play.flaggers && Array.isArray(play.flaggers) && play.flaggers.includes(pName)) {
        myStats.flagPulls += 1;
      }
    });

    // Embedded plays inside match objects
    completedMatches.forEach((m) => {
      if (m.plays && Array.isArray(m.plays) && !plays.some((p) => p.matchId === m.id)) {
        m.plays.forEach((play: any) => {
          if (play.passer === pName && play.playType === "Pass") {
            myStats.passAtt += 1;
            if (play.result === "Complete" || play.result === "Touchdown") myStats.passComp += 1;
            if (play.result === "Touchdown") {
              myStats.passTD += 1;
              myStats.totalTDs += 1;
            }
          }
          if (play.receiver === pName && play.playType === "Pass") {
            if (play.result === "Complete" || play.result === "Touchdown") myStats.receptions += 1;
            if (play.result === "Touchdown") {
              myStats.recTD += 1;
              myStats.totalTDs += 1;
            }
          }
          if (play.runner === pName && play.playType === "Run") {
            myStats.rushAtt += 1;
            if (play.result === "Touchdown") {
              myStats.rushTD += 1;
              myStats.totalTDs += 1;
            }
          }
          if (play.flaggers && Array.isArray(play.flaggers) && play.flaggers.includes(pName)) {
            myStats.flagPulls += 1;
          }
        });
      }
    });
  }

  // League Leader Accolades checks
  const isLeagueTopPasser = topPasser.name === pName && topPasser.passTD > 0;
  const isLeagueTopReceiver = topReceiver.name === pName && topReceiver.recTD > 0;
  const isLeagueTopScorer = topScorer.name === pName && topScorer.totalTD > 0;
  const isLeagueTopFlagger = topFlagger.name === pName && topFlagger.flagPulls > 0;

  // Quick Add Player Handler for Team Admin
  const handleQuickAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managedTeam || !newPlayerName.trim()) return;

    const num = parseInt(newPlayerNumber);
    if (isNaN(num) || num < 0 || num > 99) {
      alert("Jersey number must be a valid number between 0 and 99.");
      return;
    }

    setAddingPlayer(true);
    try {
      if (isEffectiveDemo) {
        const newP = addSandboxPlayer({
          playerName: newPlayerName.trim(),
          number: num.toString(),
          teamId: managedTeam.id,
          positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
          position: newPlayerPositions[0] || "ATH",
          experience: newPlayerExperience || "Rookie",
        });

        setPlayers((prev) => [...prev, newP]);
        setNewPlayerName("");
        setNewPlayerNumber("");
        setNewPlayerPositions([]);
        setNewPlayerExperience("Rookie");
        setIsAddPlayerModalOpen(false);
        setAddingPlayer(false);
        return;
      }

      const docRef = await addDoc(collection(db, "players"), {
        playerName: newPlayerName.trim(),
        playerNumber: num.toString(),
        teamId: managedTeam.id,
        positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
        isQB: newPlayerPositions.includes("QB"),
        experience: newPlayerExperience || "Rookie",
        createdAt: new Date().toISOString(),
      });

      setPlayers((prev) => [
        ...prev,
        {
          id: docRef.id,
          playerName: newPlayerName.trim(),
          playerNumber: num.toString(),
          teamId: managedTeam.id,
          positions: newPlayerPositions.length > 0 ? newPlayerPositions : ["ATH"],
          isQB: newPlayerPositions.includes("QB"),
          experience: newPlayerExperience || "Rookie",
        },
      ]);

      setNewPlayerName("");
      setNewPlayerNumber("");
      setNewPlayerPositions([]);
      setNewPlayerExperience("Rookie");
      setIsAddPlayerModalOpen(false);
    } catch (err) {
      console.error("Error creating player:", err);
      alert("Failed to add player. Please try again.");
    }
    setAddingPlayer(false);
  };

  const togglePosition = (pos: string) => {
    if (newPlayerPositions.includes(pos)) {
      setNewPlayerPositions(newPlayerPositions.filter((p) => p !== pos));
    } else {
      setNewPlayerPositions([...newPlayerPositions, pos]);
    }
  };

  // Strict view precedence: Player > Team Admin > League Admin > Spectator
  const isPlayerView = role === "player" || isPlayer;
  const isTeamAdminView = !isPlayerView && role === "team_admin";
  const isLeagueAdminView = !isPlayerView && !isTeamAdminView && (isLeagueAdmin || role === "league_admin");
  const isSpectatorView = !isPlayerView && !isTeamAdminView && !isLeagueAdminView;

  return (
    <div className="min-h-screen bg-surface-base text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col justify-between">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[40rem] h-[40rem] bg-cyan-900/15 rounded-full blur-[160px]"></div>
        <div className="absolute bottom-20 right-10 w-[35rem] h-[35rem] bg-blue-900/15 rounded-full blur-[170px]"></div>
      </div>


      {/* ========================================================================= */}
      {/* VIEW 1: LEAGUE ADMIN VIEW (LEAGUE COMMAND CENTER)                        */}
      {/* ========================================================================= */}
      {isLeagueAdminView && (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          {/* League Command Center Hero Banner */}
          <div className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    League Commissioner Hub
                  </span>
                  <span className="text-neutral-500 text-xs">•</span>
                  <span className="text-[11px] font-mono text-neutral-400 uppercase">
                    Full Administrative Access
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
                  League Command Center
                </h1>
                <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-2xl">
                  Centralized command console for match games, live scorekeeping, team registry, rule enforcement, and league branding.
                </p>
                {settings.visibility === "private" && (
                  <div className="mt-3 inline-flex flex-wrap items-center gap-2.5 p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-amber-200 text-[11px]">
                      <strong>Private League:</strong> Hidden from directory. Accessible only via direct URL.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          const url = `${window.location.origin}/league/${activeLeagueId}`;
                          navigator.clipboard?.writeText(url);
                          setCopiedLeagueLink(true);
                          setTimeout(() => setCopiedLeagueLink(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedLeagueLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLeagueLink ? "Copied Direct Link!" : "Copy Direct URL"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Fast Operations Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={openCustomizer}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-amber-500/40 shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>League Settings</span>
                </button>

                <Link
                  href="/schedule"
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Match</span>
                </Link>

                <Link
                  href="/teams"
                  className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Manage Teams</span>
                </Link>
              </div>
            </div>

            {/* League Executive KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Teams Registered</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">{teams.length}</div>
                <span className="text-[11px] text-cyan-400 mt-1 block">Active Teams in League</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Season Schedule Progress</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {completedMatches.length} / {matches.length}
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${matches.length > 0 ? (completedMatches.length / matches.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Total Roster Athletes</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">{players.length}</div>
                <span className="text-[11px] text-emerald-400 mt-1 block">Active Competitors</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">League Scoring Leader</span>
                <div className="text-xl font-black text-white mt-1 truncate">
                  {topScorer.name !== "-" ? topScorer.name : "No stats yet"}
                </div>
                <span className="text-[11px] text-amber-400 mt-1 block">{topScorer.totalTD} Total Touchdowns</span>
              </div>
            </div>
          </div>

          {/* Section: Live & Upcoming Games */}
          <LiveAndUpcomingGamesSection
            games={liveAndUpcomingGames}
            liveCount={liveMatches.length}
            teams={teams}
            standingsMap={standingsMap}
            isLeagueAdmin={true}
          />

          {/* Section: 2-Column Standings & League Superstars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Standings Table */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">Official Standings</h3>
                  </div>
                  <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                    <span>Full Table</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                        <th className="pb-2 w-8">#</th>
                        <th className="pb-2">Team</th>
                        <th className="pb-2 text-center">W</th>
                        <th className="pb-2 text-center">L</th>
                        <th className="pb-2 text-center">T</th>
                        <th className="pb-2 text-center">Diff</th>
                        <th className="pb-2 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedStandings.slice(0, 6).map((row, idx) => {
                        const teamObj = teams.find((t) => t.id === row.id);
                        return (
                          <tr key={row.id} className="hover:bg-surface-muted transition-colors">
                            <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                            <td className="py-3">
                              <Link
                                href={`/teams/${row.id}`}
                                className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                              >
                                <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                                  <TeamLogo
                                    teamName={row.name}
                                    logoUrl={teamObj?.logoUrl}
                                    icon={teamObj?.icon}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <span>{row.name}</span>
                                <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                              </Link>
                            </td>
                            <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                            <td className="py-3 text-center text-red-400">{row.l}</td>
                            <td className="py-3 text-center text-neutral-400">{row.t}</td>
                            <td className="py-3 text-center text-neutral-400 font-mono">
                              {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                            </td>
                            <td className="py-3 text-right font-black text-cyan-300 text-sm">{row.pts}</td>
                          </tr>
                        );
                      })}
                      {sortedStandings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-neutral-500 italic">
                            No standings recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-line-subtle">
                <Link
                  href="/stats"
                  className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                >
                  <span>View Full Standings & Calculations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* League Stat Leaders */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">League Stat Leaders</h3>
                  </div>
                  <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                    <span>10 Categories</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Passing TDs</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topPasser.name !== "-" ? topPasser.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-cyan-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topPasser.team || "Team"}</span>
                      <span className="text-base">{topPasser.passTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Receiving TDs</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topReceiver.name !== "-" ? topReceiver.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-blue-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topReceiver.team || "Team"}</span>
                      <span className="text-base">{topReceiver.recTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Total Touchdowns</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topScorer.name !== "-" ? topScorer.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-yellow-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topScorer.team || "Team"}</span>
                      <span className="text-base">{topScorer.totalTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Flag Pulls (Def)</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topFlagger.name !== "-" ? topFlagger.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-emerald-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topFlagger.team || "Team"}</span>
                      <span className="text-base">{topFlagger.flagPulls} Pulls</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-line-subtle">
                <Link
                  href="/stats"
                  className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                >
                  <span>View Full Stat Leaderboards</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Team Operations Registry */}
          <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-line-subtle">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span>Team Registry & Admin Controls</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Direct administrative authority over every team's roster, branding, and team settings.
                </p>
              </div>
              <Link href="/teams" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>Team Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.filter(isRealTeam).map((team) => {
                const teamRosterCount = players.filter((p) => p.teamId === team.id).length;
                const standing = standingsMap[team.id] || { w: 0, l: 0, t: 0 };

                return (
                  <div
                    key={team.id}
                    className="p-5 bg-black/60 border border-line-subtle hover:border-amber-500/40 rounded-2xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shadow-md shrink-0">
                          <TeamLogo
                            teamName={team.name}
                            logoUrl={team.logoUrl}
                            icon={team.icon}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-neutral-400 bg-surface-muted px-2 py-0.5 rounded border border-line-subtle">
                          {team.shortcode || getTeamShortcode(team)}
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-white truncate">{team.name}</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{teamRosterCount} Athletes Signed</p>
                      <div className="mt-2 text-xs font-mono text-neutral-300">
                        Record: <span className="font-bold text-white">{standing.w}-{standing.l}-{standing.t}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-line-subtle grid grid-cols-2 gap-2 text-xs">
                      <Link
                        href={`/teams/${team.id}/roster`}
                        className="py-1.5 px-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white rounded-lg text-center font-semibold border border-line transition-colors"
                      >
                        Roster
                      </Link>
                      <Link
                        href={`/teams/${team.id}`}
                        className="py-1.5 px-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white rounded-lg text-center font-semibold border border-cyan-500/20 transition-colors"
                      >
                        Edit Team
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TEAM ADMIN VIEW (Team CLUBHOUSE & HEADQUARTERS)              */}
      {/* ========================================================================= */}
      {isTeamAdminView && (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          {/* Team Clubhouse Hero Banner */}
          <div className="bg-gradient-to-br from-[#0B132B]/95 via-[#0B0F19] to-[#07090E] border-2 border-cyan-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
              <div className="flex items-start sm:items-center gap-5">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black/80 border-2 border-cyan-500/50 p-3 flex items-center justify-center shrink-0 shadow-[0_0_35px_rgba(var(--league-primary-rgb),0.3)]">
                  <TeamLogo
                    teamName={managedTeam?.name || "Team"}
                    logoUrl={managedTeam?.logoUrl}
                    icon={managedTeam?.icon}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      Team Dashboard
                    </span>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold">
                      {managedTeam?.shortcode || (managedTeam ? getTeamShortcode(managedTeam) : "TEAM")}
                    </span>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      Rank #{managedTeamStandingRank > 0 ? managedTeamStandingRank : "-"}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
                    {managedTeam?.name || "My Team"}
                  </h1>
                  <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
                    Manage your team roster, review upcoming games, scout upcoming opponents, and view your team's statistical leaders.
                  </p>
                </div>
              </div>

              {/* Team Admin Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Player</span>
                </button>

                {managedTeam && (
                  <>
                    <Link
                      href={`/teams/${managedTeam.id}/roster`}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>Full Roster</span>
                    </Link>

                    <Link
                      href={`/teams/${managedTeam.id}/playbook`}
                      className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Playbook</span>
                    </Link>

                    <Link
                      href={`/teams/${managedTeam.id}`}
                      className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Edit Team Info</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Team Performance Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Season Record</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {managedTeamStanding ? `${managedTeamStanding.w}-${managedTeamStanding.l}-${managedTeamStanding.t}` : "0-0-0"}
                </div>
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  {managedTeamStanding ? `${managedTeamStanding.pts} Standings Pts` : "0 Points"}
                </span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Active Roster</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">{managedTeamPlayers.length}</div>
                <span className="text-[11px] text-cyan-400 mt-1 block">Athletes Signed</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Point Differential</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {managedTeamStanding
                    ? managedTeamStanding.pf - managedTeamStanding.pa > 0
                      ? `+${managedTeamStanding.pf - managedTeamStanding.pa}`
                      : `${managedTeamStanding.pf - managedTeamStanding.pa}`
                    : "0"}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {managedTeamStanding ? `${managedTeamStanding.pf} PF / ${managedTeamStanding.pa} PA` : "0 Scored"}
                </span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Next Opponent</span>
                <div className="text-base font-black text-white mt-1 truncate">
                  {nextOpponentName}
                </div>
                <span className="text-[11px] text-amber-400 mt-1 block truncate">
                  {managedTeamUpcoming ? `${managedTeamUpcoming.date} • ${managedTeamUpcoming.time || "Scheduled"}` : "Standby"}
                </span>
              </div>
            </div>
          </div>

          {/* NEXT MATCHUP SPOTLIGHT (Head-to-Head Banner) */}
          {managedTeamUpcoming ? (
            <div className="bg-gradient-to-r from-cyan-950/40 via-[#0B0F19] to-blue-950/40 border border-cyan-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-black uppercase tracking-wider text-white">Next Matchup Spotlight</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                  {managedTeamUpcoming.week || "Matchday"}
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Your Team */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-black/60 border border-cyan-500/40 p-2.5 flex items-center justify-center shrink-0">
                    <TeamLogo
                      teamName={managedTeam?.name || "Your Team"}
                      logoUrl={managedTeam?.logoUrl}
                      icon={managedTeam?.icon}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">YOUR TEAM</span>
                    <h3 className="text-xl font-black text-white">{managedTeam?.name}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {managedTeamStanding ? `${managedTeamStanding.w}-${managedTeamStanding.l}-${managedTeamStanding.t}` : "0-0-0"}
                    </p>
                  </div>
                </div>

                {/* VS Badge & Match Time */}
                <div className="flex flex-col items-center justify-center px-6 py-2 bg-black/70 rounded-2xl border border-line shrink-0 text-center">
                  <span className="text-2xl font-black text-amber-400 tracking-wider">VS</span>
                  <div className="text-xs font-bold text-white mt-1">{managedTeamUpcoming.date}</div>
                  <div className="text-[11px] font-mono text-cyan-400">{managedTeamUpcoming.time || "TBD"}</div>
                  <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{managedTeamUpcoming.location || "Field 1"}</span>
                  </div>
                </div>

                {/* Opponent Team */}
                <div className="flex items-center gap-4 flex-1 justify-end text-right">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">NEXT OPPONENT</span>
                    <h3 className="text-xl font-black text-white">{nextOpponentName}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {nextOpponentTeam && standingsMap[nextOpponentTeam.id]
                        ? `${standingsMap[nextOpponentTeam.id].w}-${standingsMap[nextOpponentTeam.id].l}-${standingsMap[nextOpponentTeam.id].t}`
                        : "Opposing Team"}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shrink-0">
                    <TeamLogo
                      teamName={nextOpponentName}
                      logoUrl={nextOpponentTeam?.logoUrl}
                      icon={nextOpponentTeam?.icon}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line flex items-center justify-end">
                <Link
                  href={`/matches/${managedTeamUpcoming.id}`}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center gap-2"
                >
                  <span>View Matchup Center & Game Preview →</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-surface-raised border border-line rounded-3xl p-6 text-center text-neutral-400 text-xs italic">
              No upcoming matches scheduled for your team.
            </div>
          )}

          {/* Section: Live & Upcoming Games */}
          <LiveAndUpcomingGamesSection
            games={liveAndUpcomingGames}
            liveCount={liveMatches.length}
            teams={teams}
            standingsMap={standingsMap}
            isLeagueAdmin={false}
          />

          {/* 2-COLUMN SECTION: MY TEAM ROSTER & MY TEAM STAT LEADERS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1 & 2: Active Roster Quick Management */}
            <div className="lg:col-span-2 bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                      Active Roster ({managedTeamPlayers.length} Athletes)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddPlayerModalOpen(true)}
                      className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Player</span>
                    </button>
                    {managedTeam && (
                      <Link
                        href={`/teams/${managedTeam.id}/roster`}
                        className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                      >
                        <span>Full Roster</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

                {managedTeamPlayers.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle">
                    No players signed to your roster yet. Click "Add Player" to register your athletes.
                  </div>
                ) : (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                          <th className="pb-2 w-12">#</th>
                          <th className="pb-2">Athlete Name</th>
                          <th className="pb-2">Positions</th>
                          <th className="pb-2 text-center">Touchdowns</th>
                          <th className="pb-2 text-center">Flag Pulls</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {managedTeamPlayers.slice(0, 8).map((p) => {
                          const pStat = playerStats[p.playerName] || { totalTD: 0, flagPulls: 0 };
                          return (
                            <tr key={p.id} className="hover:bg-surface-muted transition-colors">
                              <td className="py-2.5 font-mono font-bold text-cyan-400">
                                #{p.playerNumber || "0"}
                              </td>
                              <td className="py-2.5 font-bold text-white">
                                {p.playerName}
                                {p.isQB && (
                                  <span className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    QB
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-neutral-300 font-mono text-[11px]">
                                {Array.isArray(p.positions) && p.positions.length > 0
                                  ? p.positions.join(", ")
                                  : p.isQB
                                    ? "QB"
                                    : "ATH"}
                              </td>
                              <td className="py-2.5 text-center font-bold text-amber-300">{pStat.totalTD}</td>
                              <td className="py-2.5 text-center font-bold text-emerald-400">{pStat.flagPulls}</td>
                              <td className="py-2.5 text-right text-[10px] text-emerald-400 font-mono">Active</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {managedTeam && (
                <div className="pt-4 mt-4 border-t border-line-subtle">
                  <Link
                    href={`/teams/${managedTeam.id}/roster`}
                    className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Manage Full Team Roster & Edit Numbers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Column 3: Team Stat Leaders */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">Team Leaders</h3>
                  </div>
                  {managedTeam && (
                    <Link
                      href={`/teams/${managedTeam.id}/stats`}
                      className="text-xs font-bold text-cyan-400 hover:underline"
                    >
                      Team Stats →
                    </Link>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Team Passing Leader
                    </span>
                    <div className="text-base font-black text-white mt-1 truncate">
                      {teamTopPasser.name !== "-" ? teamTopPasser.name : "No stats yet"}
                    </div>
                    <div className="text-xs text-cyan-400 font-bold mt-1">{teamTopPasser.passTD} Passing TDs</div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Team Receiving Leader
                    </span>
                    <div className="text-base font-black text-white mt-1 truncate">
                      {teamTopReceiver.name !== "-" ? teamTopReceiver.name : "No stats yet"}
                    </div>
                    <div className="text-xs text-blue-400 font-bold mt-1">{teamTopReceiver.recTD} Receiving TDs</div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Team Touchdown Leader
                    </span>
                    <div className="text-base font-black text-white mt-1 truncate">
                      {teamTopScorer.name !== "-" ? teamTopScorer.name : "No stats yet"}
                    </div>
                    <div className="text-xs text-yellow-400 font-bold mt-1">{teamTopScorer.totalTD} Total TDs</div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Top Flag Puller (Defense)
                    </span>
                    <div className="text-base font-black text-white mt-1 truncate">
                      {teamTopDefender.name !== "-" ? teamTopDefender.name : "No stats yet"}
                    </div>
                    <div className="text-xs text-emerald-400 font-bold mt-1">{teamTopDefender.flagPulls} Pulls</div>
                  </div>
                </div>
              </div>

              {managedTeam && (
                <div className="pt-4 mt-4 border-t border-line-subtle">
                  <Link
                    href={`/teams/${managedTeam.id}/stats`}
                    className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                  >
                    <span>View All Team Individual Stats</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Section: Standings with Highlighted Team Row */}
          <section className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  League Standings (Your Position)
                </h3>
              </div>
              <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>View Full Table</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                    <th className="pb-2 w-8">#</th>
                    <th className="pb-2">Team</th>
                    <th className="pb-2 text-center">W</th>
                    <th className="pb-2 text-center">L</th>
                    <th className="pb-2 text-center">T</th>
                    <th className="pb-2 text-center">Diff</th>
                    <th className="pb-2 text-right">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedStandings.map((row, idx) => {
                    const isMyTeam = row.id === managedTeam?.id;
                    const teamObj = teams.find((t) => t.id === row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isMyTeam
                          ? "bg-cyan-500/15 font-bold border-l-4 border-cyan-400"
                          : "hover:bg-surface-muted"
                          }`}
                      >
                        <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                        <td className="py-3">
                          <Link
                            href={`/teams/${row.id}`}
                            className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                              <TeamLogo
                                teamName={row.name}
                                logoUrl={teamObj?.logoUrl}
                                icon={teamObj?.icon}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className={isMyTeam ? "text-cyan-300 font-black text-sm" : ""}>{row.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                            {isMyTeam && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
                                Your Team
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                        <td className="py-3 text-center text-red-400">{row.l}</td>
                        <td className="py-3 text-center text-neutral-400">{row.t}</td>
                        <td className="py-3 text-center text-neutral-400 font-mono">
                          {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                        </td>
                        <td className="py-3 text-right font-black text-cyan-300 text-sm">{row.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2.5: PLAYER VIEW (ATHLETE GAMEDAY COCKPIT & PERSONAL LOCKER ROOM)    */}
      {/* ========================================================================= */}
      {isPlayerView && (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          {/* Athlete Cockpit Hero Banner */}
          <div className="bg-gradient-to-br from-[#061822]/95 via-[#0B0F19] to-[#08121E] border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line relative z-10">
              <div className="flex items-start sm:items-center gap-5">
                {/* Athlete Jersey Number / Logo Shield */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-black/80 border-2 border-emerald-500/50 p-2 flex flex-col items-center justify-center shrink-0 shadow-[0_0_35px_rgba(16,185,129,0.3)] relative group">
                  <span className="text-[10px] font-mono uppercase font-black text-emerald-400 tracking-wider">
                    JERSEY
                  </span>
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mt-0.5">
                    #{pNumber}
                  </span>
                  <div className="absolute -bottom-1 px-1.5 py-0.2 bg-emerald-500 text-black text-[9px] font-black rounded uppercase tracking-wider">
                    {pPositions[0] || "ATH"}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Athlete Gameday Cockpit
                    </span>
                    <span className="text-neutral-500 text-xs">•</span>
                    <span className="text-[11px] font-mono text-cyan-300 uppercase font-bold">
                      {pExperience}
                    </span>
                    {myPlayerTeam && (
                      <>
                        <span className="text-neutral-500 text-xs">•</span>
                        <span className="text-[11px] font-mono text-amber-400 font-bold">
                          {myPlayerTeam.name} (#{myPlayerStandingRank > 0 ? myPlayerStandingRank : "-"})
                        </span>
                      </>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                    <span>{pName || "Athlete Profile"}</span>
                  </h1>

                  <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-xl">
                    {myPlayerTeam ? (
                      <>
                        Rostered Athlete on{" "}
                        <span className="text-emerald-400 font-bold">{myPlayerTeam.name}</span>. Review upcoming
                        games, study team route diagrams, track personal statistics, and prepare for kickoff.
                      </>
                    ) : (
                      <>
                        Active Free Agent athlete in the league pool. You are eligible for team signing and waiver
                        draft. Explore rosters and game day schedules.
                      </>
                    )}
                  </p>

                  {/* Position tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {pPositions.map((pos) => (
                      <span
                        key={pos}
                        className="px-2.5 py-0.5 rounded-lg bg-surface-muted border border-line text-[10px] font-mono font-bold text-neutral-300 uppercase"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Player Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 relative z-10">
                {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) && (
                  <Link
                    href={`/teams/${myPlayerTeam.id}/playbook`}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Team Playbook</span>
                  </Link>
                )}
                {myPlayerTeam ? (
                  <>
                    <Link
                      href={`/teams/${myPlayerTeam.id}`}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <span>Team Hub</span>
                    </Link>

                    <Link
                      href={`/teams/${myPlayerTeam.id}/roster`}
                      className="px-4 py-2.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2"
                    >
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Squad Roster</span>
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/teams"
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span>View Teams</span>
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-xl border border-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>My Profile & Themes</span>
                </Link>
              </div>
            </div>

            {/* Athlete Performance Quick Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 relative z-10">
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-emerald-500/30 transition-all">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Season Touchdowns
                </span>
                <div className="text-3xl font-black text-emerald-400 mt-1 tabular-nums">
                  {myStats.totalTDs}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {myStats.passTD} Pass • {myStats.recTD} Rec • {myStats.rushTD} Rush
                </span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-cyan-500/30 transition-all">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Defensive Impact
                </span>
                <div className="text-3xl font-black text-cyan-300 mt-1 tabular-nums">
                  {myStats.flagPulls}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  {myStats.int} INT • {myStats.sacks} Sacks • {myStats.pbu} PBU
                </span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-amber-500/30 transition-all">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Team Standing
                </span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {myPlayerStanding ? `${myPlayerStanding.w}-${myPlayerStanding.l}-${myPlayerStanding.t}` : "0-0-0"}
                </div>
                <span className="text-[11px] text-amber-400 mt-1 block font-mono">
                  {myPlayerTeam
                    ? `Rank #${myPlayerStandingRank > 0 ? myPlayerStandingRank : "-"} • ${myPlayerStanding?.pts || 0} Pts`
                    : "Free Agent Pool"}
                </span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl hover:border-white/20 transition-all">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Games Played
                </span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">
                  {myStats.gamesPlayed}
                </div>
                <span className="text-[11px] text-emerald-400 mt-1 block">
                  Active Season Games
                </span>
              </div>
            </div>
          </div>

          {/* ALL-STAR RECOGNITION RIBBON (If Player is a League Leader) */}
          {(isLeagueTopPasser || isLeagueTopReceiver || isLeagueTopScorer || isLeagueTopFlagger) && (
            <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-yellow-950/40 border border-amber-500/40 rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                      League Leader Recognition
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="text-sm md:text-base font-black text-white mt-0.5">
                    Congratulations! You are officially ranked among the top performers in the league.
                  </h4>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isLeagueTopPasser && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                    <span>#1 Passing TDs ({topPasser.passTD})</span>
                  </span>
                )}
                {isLeagueTopReceiver && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                    <span>#1 Receiving TDs ({topReceiver.recTD})</span>
                  </span>
                )}
                {isLeagueTopScorer && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                    <span>#1 Total Touchdowns ({topScorer.totalTD})</span>
                  </span>
                )}
                {isLeagueTopFlagger && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/30 flex items-center gap-1.5">
                    <span>#1 Defensive Flag Pulls ({topFlagger.flagPulls})</span>
                  </span>
                )}
                <Link
                  href="/stats"
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <span>Leaderboards</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* NEXT MATCHDAY SPOTLIGHT (Head-to-Head Banner) */}
          {myPlayerUpcomingMatch ? (
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#0B0F19] to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-black uppercase tracking-wider text-white">
                    Next Gameday Spotlight
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                    {myPlayerUpcomingMatch.week || "Upcoming Matchday"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/20 hidden sm:inline-block">
                    Kickoff Ready
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Your Team */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-black/60 border border-emerald-500/40 p-2.5 flex items-center justify-center shrink-0">
                    <TeamLogo
                      teamName={myPlayerTeam?.name || "Your Team"}
                      logoUrl={myPlayerTeam?.logoUrl}
                      icon={myPlayerTeam?.icon}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      YOUR SQUAD
                    </span>
                    <h3 className="text-xl font-black text-white">{myPlayerTeam?.name}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {myPlayerStanding ? `${myPlayerStanding.w}-${myPlayerStanding.l}-${myPlayerStanding.t}` : "0-0-0"}
                    </p>
                  </div>
                </div>

                {/* VS Badge & Match Time */}
                <div className="flex flex-col items-center justify-center px-6 py-2 bg-black/70 rounded-2xl border border-line shrink-0 text-center">
                  <span className="text-2xl font-black text-amber-400 tracking-wider">VS</span>
                  <div className="text-xs font-bold text-white mt-1">{myPlayerUpcomingMatch.date}</div>
                  <div className="text-[11px] font-mono text-emerald-400">{myPlayerUpcomingMatch.time || "TBD"}</div>
                  <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{myPlayerUpcomingMatch.location || "Field 1"}</span>
                  </div>
                </div>

                {/* Opponent Team */}
                <div className="flex items-center gap-4 flex-1 justify-end text-right">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      OPPOSING SQUAD
                    </span>
                    <h3 className="text-xl font-black text-white">{myPlayerOpponentName}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {myPlayerOpponentTeam && standingsMap[myPlayerOpponentTeam.id]
                        ? `${standingsMap[myPlayerOpponentTeam.id].w}-${standingsMap[myPlayerOpponentTeam.id].l}-${standingsMap[myPlayerOpponentTeam.id].t}`
                        : "Opposing Team"}
                    </p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shrink-0">
                    <TeamLogo
                      teamName={myPlayerOpponentName}
                      logoUrl={myPlayerOpponentTeam?.logoUrl}
                      icon={myPlayerOpponentTeam?.icon}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Game scheduled for{" "}
                    <strong className="text-white">{myPlayerUpcomingMatch.date}</strong> at{" "}
                    <strong className="text-cyan-300">{myPlayerUpcomingMatch.time || "TBD"}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) && (
                    <Link
                      href={`/teams/${myPlayerTeam.id}/playbook`}
                      className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Study Game Plan</span>
                    </Link>
                  )}
                  <Link
                    href={`/matches/${myPlayerUpcomingMatch.id}`}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/15 transition-all flex items-center gap-2"
                  >
                    <span>Match Center & Game Preview →</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-raised border border-line rounded-3xl p-6 text-center text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-neutral-300">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>
                  No upcoming games currently on your team schedule. You are on a Bye Week or awaiting schedule publication.
                </span>
              </div>
              <Link
                href="/schedule"
                className="px-4 py-2 bg-surface-muted hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-1.5"
              >
                <span>View Full League Schedule</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Section: Live & Upcoming Games */}
          <LiveAndUpcomingGamesSection
            games={liveAndUpcomingGames}
            liveCount={liveMatches.length}
            teams={teams}
            standingsMap={standingsMap}
            isLeagueAdmin={false}
          />

          {/* ATHLETE STATS MATRIX (Individual Season Breakdown) */}
          <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line-subtle">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Personal Season Performance Matrix
                  </h3>
                </div>
                <p className="text-xs text-neutral-400">
                  Official statistical production recorded across all sanctioned league matches this season.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/stats"
                  className="px-3.5 py-1.5 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>League Leaderboards</span>
                </Link>
                <Link
                  href="/profile"
                  className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Career Logs</span>
                </Link>
              </div>
            </div>

            {/* 4 Stat Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Touchdowns & Scoring */}
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Touchdown Production
                  </span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-300 tabular-nums">
                  {myStats.totalTDs} <span className="text-xs font-normal text-neutral-500">Total TDs</span>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Passing TDs:</span>
                    <strong className="text-white font-mono">{myStats.passTD}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Receiving TDs:</span>
                    <strong className="text-white font-mono">{myStats.recTD}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Rushing TDs:</span>
                    <strong className="text-white font-mono">{myStats.rushTD}</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Passing */}
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Air Attack (Passing)
                  </span>
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-cyan-300 tabular-nums">
                  {myStats.passComp} <span className="text-xs font-normal text-neutral-500">/ {myStats.passAtt} Comp</span>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Comp Rate:</span>
                    <strong className="text-white font-mono">
                      {myStats.passAtt > 0
                        ? `${Math.round((myStats.passComp / myStats.passAtt) * 100)}%`
                        : "0%"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Pass TDs:</span>
                    <strong className="text-white font-mono">{myStats.passTD}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Pass Attempts:</span>
                    <strong className="text-white font-mono">{myStats.passAtt}</strong>
                  </div>
                </div>
              </div>

              {/* Card 3: Receiving & Rushing */}
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Target Share & Carries
                  </span>
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-blue-300 tabular-nums">
                  {myStats.receptions} <span className="text-xs font-normal text-neutral-500">Receptions</span>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Rec TDs:</span>
                    <strong className="text-white font-mono">{myStats.recTD}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Rush Attempts:</span>
                    <strong className="text-white font-mono">{myStats.rushAtt}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Rush TDs:</span>
                    <strong className="text-white font-mono">{myStats.rushTD}</strong>
                  </div>
                </div>
              </div>

              {/* Card 4: Defense */}
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Defensive Stops
                  </span>
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400 tabular-nums">
                  {myStats.flagPulls} <span className="text-xs font-normal text-neutral-500">Flag Pulls</span>
                </div>
                <div className="space-y-1.5 mt-3 pt-3 border-t border-line-subtle text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Interceptions (INT):</span>
                    <strong className="text-white font-mono">{myStats.int}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>QB Sacks:</span>
                    <strong className="text-white font-mono">{myStats.sacks}</strong>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Pass Breakups (PBU):</span>
                    <strong className="text-white font-mono">{myStats.pbu}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2-COLUMN SECTION: Team CLUBHOUSE & PLAYBOOK ARMBAND */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Column 1 & 2: Team Locker Room & Squad Mates */}
            <div className="lg:col-span-2 bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                      {myPlayerTeam ? `${myPlayerTeam.name} Roster` : "Squad Teammates"} (
                      {myPlayerTeammates.length} Athletes)
                    </h3>
                  </div>
                  {myPlayerTeam && (
                    <Link
                      href={`/teams/${myPlayerTeam.id}/roster`}
                      className="text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Full Roster</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {myPlayerTeammates.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle">
                    {myPlayerTeam
                      ? "No other players rostered on this team yet."
                      : "You are currently unassigned to a team. Join a team or await commissioner draft assignment."}
                  </div>
                ) : (
                  <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                          <th className="pb-2 w-12">#</th>
                          <th className="pb-2">Athlete Name</th>
                          <th className="pb-2">Positions</th>
                          <th className="pb-2 text-center">Touchdowns</th>
                          <th className="pb-2 text-center">Flag Pulls</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {myPlayerTeammates.slice(0, 8).map((p) => {
                          const pStat = playerStats[p.playerName] || { totalTD: 0, flagPulls: 0 };
                          const isCurrentActivePlayer = p.playerName === pName;
                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors ${isCurrentActivePlayer
                                ? "bg-emerald-500/15 font-bold border-l-4 border-emerald-400"
                                : "hover:bg-surface-muted"
                                }`}
                            >
                              <td className="py-2.5 font-mono font-bold text-emerald-400">
                                #{p.playerNumber || p.number || "0"}
                              </td>
                              <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                                <span>{p.playerName}</span>
                                {isCurrentActivePlayer && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                                    YOU
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-neutral-300 font-mono text-[11px]">
                                {Array.isArray(p.positions) && p.positions.length > 0
                                  ? p.positions.join(", ")
                                  : p.position || "ATH"}
                              </td>
                              <td className="py-2.5 text-center font-bold text-amber-300">{pStat.totalTD}</td>
                              <td className="py-2.5 text-center font-bold text-emerald-400">{pStat.flagPulls}</td>
                              <td className="py-2.5 text-right text-[10px] text-emerald-400 font-mono">Active</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {myPlayerTeam && (
                <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-400">
                    Squad Record:{" "}
                    <strong className="text-white">
                      {myPlayerStanding ? `${myPlayerStanding.w}W - ${myPlayerStanding.l}L` : "0-0"}
                    </strong>
                  </div>
                  <Link
                    href={`/teams/${myPlayerTeam.id}`}
                    className="py-2 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center gap-2"
                  >
                    <span>View Team Clubhouse</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Column 3: Playbook & Tactical Armband */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                      Playbook & Armband
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                    Interactive
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 mb-4">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Study Your Routes</span>
                  </h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Review your team's route assignments, passing progressions, and defensive alignment calls
                    designed by your coaches.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Field Configuration
                    </span>
                    <div className="text-sm font-black text-white mt-1">
                      {settings.rules?.playersOnField || 5}v{settings.rules?.playersOnField || 5} Squad Format
                    </div>
                    <div className="text-xs text-cyan-400 font-mono mt-0.5">
                      {settings.rules?.rushLineDistance || 7} Yard Rush Line • {settings.rules?.downsPerSeries || 4} Downs per Series
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-3.5 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                      Gameday Wristband
                    </span>
                    <div className="text-sm font-black text-white mt-1">
                      Printable Wrist Coach Armband
                    </div>
                    <div className="text-xs text-emerald-400 font-mono mt-0.5">
                      Instant Printable 8-Play Grid
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-line-subtle">
                {myPlayerTeam && (!isLeagueAdmin || isTeamAdmin(myPlayerTeam.id)) ? (
                  <Link
                    href={`/teams/${myPlayerTeam.id}/playbook`}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Launch Team Playbook</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/teams"
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>Browse Teams</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Section: Standings with Highlighted Player Team Row */}
          <section className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  League Standings (Championship Race)
                </h3>
              </div>
              <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                <span>View Full Table</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                    <th className="pb-2 w-8">#</th>
                    <th className="pb-2">Team</th>
                    <th className="pb-2 text-center">W</th>
                    <th className="pb-2 text-center">L</th>
                    <th className="pb-2 text-center">T</th>
                    <th className="pb-2 text-center">Diff</th>
                    <th className="pb-2 text-right">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedStandings.map((row, idx) => {
                    const isMyTeam = row.id === myPlayerTeam?.id;
                    const teamObj = teams.find((t) => t.id === row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isMyTeam
                          ? "bg-emerald-500/15 font-bold border-l-4 border-emerald-400"
                          : "hover:bg-surface-muted"
                          }`}
                      >
                        <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                        <td className="py-3">
                          <Link
                            href={`/teams/${row.id}`}
                            className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                              <TeamLogo
                                teamName={row.name}
                                logoUrl={teamObj?.logoUrl}
                                icon={teamObj?.icon}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className={isMyTeam ? "text-emerald-300 font-black text-sm" : ""}>{row.name}</span>
                            <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                            {isMyTeam && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                                Your Team
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                        <td className="py-3 text-center text-red-400">{row.l}</td>
                        <td className="py-3 text-center text-neutral-400">{row.t}</td>
                        <td className="py-3 text-center text-neutral-400 font-mono">
                          {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                        </td>
                        <td className="py-3 text-right font-black text-emerald-300 text-sm">{row.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Athlete Switcher (Localhost / Testing Mode) */}
          {players.length > 0 && (
            <div className="p-4 rounded-2xl bg-black/40 border border-line-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-400">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>
                  Testing Mode: Logged in as{" "}
                  <strong className="text-white">#{pNumber} {pName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-500">Switch Player:</span>
                <select
                  value={activePlayer?.id || ""}
                  onChange={(e) => {
                    const chosen = players.find((p) => p.id === e.target.value);
                    if (chosen) {
                      setDevRole("player", chosen.teamId, chosen.id);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-line text-white text-xs outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {players.map((p) => {
                    const tm = teams.find((t) => t.id === p.teamId);
                    return (
                      <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                        {p.playerName} (#{p.playerNumber || p.number || "00"}) — {tm?.name || "Free Agent"}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: SPECTATOR / USER VIEW (GAMEDAY CENTRAL & FAN PORTAL)              */}
      {/* ========================================================================= */}
      {isSpectatorView && (
        <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          {/* Fan & Spectator Hero Banner */}
          <div className="bg-gradient-to-r from-[#0C1222] via-[#0B0F19] to-[#0A101D] border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-line">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {settings.seasonTitle || "Active Season"}
                  </span>
                  <span className="text-neutral-500 text-xs">•</span>
                  <span className="text-[11px] font-mono text-neutral-400 uppercase">
                    Official Gameday Central
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
                  {renderFlagOS(settings.leagueName)} Gameday Central
                </h1>
                <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-2xl">
                  {settings.tagline ||
                    "Follow real-time play-by-play, live game box scores, official standings, and individual stat leaderboards across the league."}
                </p>
              </div>

              {/* Fan Quick Links */}
              {!isEmbedded && (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/schedule"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] flex items-center gap-2"
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Game Schedule</span>
                  </Link>

                  <Link
                    href="/stats"
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/15 transition-all flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Standings & Stats</span>
                  </Link>

                  {canRegisterAsPlayer && settings.rules?.enableFreeAgents !== false && (
                    <Link
                      href="/join"
                      className="px-5 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-emerald-500/40 transition-colors flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Player Registration</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Spectator Snapshot Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Active Teams</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">{teams.length}</div>
                <span className="text-[11px] text-cyan-400 mt-1 block">Competing Teams</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Upcoming Games</span>
                <div className="text-3xl font-black text-white mt-1 tabular-nums">{upcomingMatches.length}</div>
                <span className="text-[11px] text-neutral-400 mt-1 block">Scheduled on Calendar</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">League Top Scorer</span>
                <div className="text-lg font-black text-white mt-1 truncate">
                  {topScorer.name !== "-" ? topScorer.name : "None yet"}
                </div>
                <span className="text-[11px] text-yellow-400 mt-1 block">{topScorer.totalTD} Touchdowns</span>
              </div>

              <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                <span className="text-[11px] uppercase font-bold text-neutral-500 tracking-wider block">Passing Leader</span>
                <div className="text-lg font-black text-white mt-1 truncate">
                  {topPasser.name !== "-" ? topPasser.name : "None yet"}
                </div>
                <span className="text-[11px] text-cyan-400 mt-1 block">{topPasser.passTD} Pass TDs</span>
              </div>
            </div>
          </div>

          {/* Section: Live & Upcoming Games */}
          <LiveAndUpcomingGamesSection
            games={liveAndUpcomingGames}
            liveCount={liveMatches.length}
            teams={teams}
            standingsMap={standingsMap}
            isLeagueAdmin={false}
            isEmbedded={isEmbedded}
          />

          {/* 2-Column: Fan Standings & Stat Leaders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Fan Standings */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">League Standings</h3>
                  </div>
                  <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                    <span>Full Table</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-neutral-500 border-b border-line-subtle font-mono uppercase">
                        <th className="pb-2 w-8">#</th>
                        <th className="pb-2">Team</th>
                        <th className="pb-2 text-center">W</th>
                        <th className="pb-2 text-center">L</th>
                        <th className="pb-2 text-center">T</th>
                        <th className="pb-2 text-center">Diff</th>
                        <th className="pb-2 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedStandings.slice(0, 5).map((row, idx) => {
                        const teamObj = teams.find((t) => t.id === row.id);
                        return (
                          <tr key={row.id} className="hover:bg-surface-muted transition-colors">
                            <td className="py-3 font-mono font-bold text-neutral-400">{idx + 1}</td>
                            <td className="py-3">
                              {isEmbedded ? (
                                <div className="font-bold text-white flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                                    <TeamLogo
                                      teamName={row.name}
                                      logoUrl={teamObj?.logoUrl}
                                      icon={teamObj?.icon}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <span>{row.name}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                                </div>
                              ) : (
                                <Link
                                  href={`/teams/${row.id}`}
                                  className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2.5"
                                >
                                  <div className="w-6 h-6 rounded-lg bg-black/60 border border-line p-0.5 flex items-center justify-center shrink-0">
                                    <TeamLogo
                                      teamName={row.name}
                                      logoUrl={teamObj?.logoUrl}
                                      icon={teamObj?.icon}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <span>{row.name}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono">({row.shortcode})</span>
                                </Link>
                              )}
                            </td>
                            <td className="py-3 text-center font-bold text-emerald-400">{row.w}</td>
                            <td className="py-3 text-center text-red-400">{row.l}</td>
                            <td className="py-3 text-center text-neutral-400">{row.t}</td>
                            <td className="py-3 text-center text-neutral-400 font-mono">
                              {row.pf - row.pa > 0 ? `+${row.pf - row.pa}` : row.pf - row.pa}
                            </td>
                            <td className="py-3 text-right font-black text-cyan-300 text-sm">{row.pts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {!isEmbedded && (
                <div className="pt-4 mt-4 border-t border-line-subtle">
                  <Link
                    href="/stats"
                    className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                  >
                    <span>View Full Standings & Calculations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Fan Stat Leaders */}
            <div className="bg-surface-raised border border-line rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-line-subtle">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-black uppercase tracking-wider text-white">League Leaders</h3>
                  </div>
                  {!isEmbedded ? (
                    <Link href="/stats" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                      <span>10 Categories</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-[10px] font-mono text-neutral-400">10 Categories</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Passing TDs</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topPasser.name !== "-" ? topPasser.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-cyan-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topPasser.team || "Team"}</span>
                      <span className="text-base">{topPasser.passTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Receiving TDs</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topReceiver.name !== "-" ? topReceiver.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-blue-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topReceiver.team || "Team"}</span>
                      <span className="text-base">{topReceiver.recTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Total Touchdowns</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topScorer.name !== "-" ? topScorer.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-yellow-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topScorer.team || "Team"}</span>
                      <span className="text-base">{topScorer.totalTD} TDs</span>
                    </div>
                  </div>

                  <div className="bg-black/50 border border-line-subtle p-4 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Flag Pulls (Def)</span>
                    <div className="text-lg font-black text-white mt-1 truncate">
                      {topFlagger.name !== "-" ? topFlagger.name : "No stats"}
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2 text-emerald-400 font-bold">
                      <span className="text-neutral-400 font-normal truncate">{topFlagger.team || "Team"}</span>
                      <span className="text-base">{topFlagger.flagPulls} Pulls</span>
                    </div>
                  </div>
                </div>
              </div>

              {!isEmbedded && (
                <div className="pt-4 mt-4 border-t border-line-subtle">
                  <Link
                    href="/stats"
                    className="w-full py-2.5 px-4 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line transition-colors flex items-center justify-center gap-2"
                  >
                    <span>View Full Stat Leaderboards</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Team Showcase */}
          <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-line-subtle">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>Team Directory</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Official registered franchises and athletic rosters.
                </p>
              </div>
              {!isEmbedded && (
                <Link href="/teams" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                  <span>View All Teams</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {teams.map((team) => {
                const teamRosterCount = players.filter((p) => p.teamId === team.id).length;
                const standing = standingsMap[team.id] || { w: 0, l: 0, t: 0 };

                return isEmbedded ? (
                  <div
                    key={team.id}
                    className="p-5 bg-black/60 border border-line-subtle rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center shadow-md shrink-0">
                          <TeamLogo
                            teamName={team.name}
                            logoUrl={team.logoUrl}
                            icon={team.icon}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-neutral-400 bg-surface-muted px-2 py-0.5 rounded border border-line-subtle">
                          {team.shortcode || getTeamShortcode(team)}
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-white truncate">
                        {team.name}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{teamRosterCount} Athletes</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Record</span>
                        <span className="font-bold text-white tabular-nums">
                          {standing.w}-{standing.l}-{standing.t}
                        </span>
                      </div>
                      <span className="text-neutral-500 font-bold">
                        Active Franchise
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}`}
                    className="p-5 bg-black/60 border border-line-subtle hover:border-cyan-500/40 rounded-2xl transition-all group flex flex-col justify-between hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-line p-2.5 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-500/40 transition-all shadow-md shrink-0">
                          <TeamLogo
                            teamName={team.name}
                            logoUrl={team.logoUrl}
                            icon={team.icon}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-neutral-400 bg-surface-muted px-2 py-0.5 rounded border border-line-subtle">
                          {team.shortcode || getTeamShortcode(team)}
                        </span>
                      </div>

                      <h4 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors truncate">
                        {team.name}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{teamRosterCount} Athletes</p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-line-subtle flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Record</span>
                        <span className="font-bold text-white tabular-nums">
                          {standing.w}-{standing.l}-{standing.t}
                        </span>
                      </div>
                      <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                        Explore Team →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Player Registration CTA Banner */}
          {!isEmbedded && canRegisterAsPlayer && settings.rules?.enableFreeAgents !== false && (
            <div className="bg-gradient-to-r from-emerald-950/40 via-[#0B0F19] to-cyan-950/40 border border-emerald-500/30 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Join the Competition</span>
                <h3 className="text-2xl font-black uppercase text-white mt-0.5">Want to play in the {renderFlagOS(settings.leagueName)}?</h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                  Register online as a free agent or join an active team roster to compete in official league matches.
                </p>
              </div>
              <Link
                href="/join"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register as Player</span>
              </Link>
            </div>
          )}
        </main>
      )}

      {/* QUICK ADD PLAYER MODAL (for Team Admin) */}
      {isAddPlayerModalOpen && managedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D121F] border border-cyan-500/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black uppercase text-white">Add Player to Roster</h3>
              </div>
              <button
                onClick={() => setIsAddPlayerModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-surface-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddPlayer} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Team
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line text-white text-xs font-bold">
                  {managedTeam.name}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Athlete Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Marcus Williams"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Jersey Number (0-99) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  required
                  value={newPlayerNumber}
                  onChange={(e) => setNewPlayerNumber(e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Positions (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POSITIONS.map((pos) => {
                    const isSelected = newPlayerPositions.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => togglePosition(pos)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSelected
                          ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                          : "bg-black/50 text-neutral-400 border border-line hover:border-white/20"
                          }`}
                      >
                        {pos}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                  Experience Level
                </label>
                <select
                  value={newPlayerExperience}
                  onChange={(e) => setNewPlayerExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-line focus:border-cyan-500 text-white text-xs outline-none transition-colors cursor-pointer"
                >
                  <option value="Rookie" className="bg-neutral-900 text-white">Rookie (First Season)</option>
                  <option value="1-2 Years" className="bg-neutral-900 text-white">1-2 Years Experience</option>
                  <option value="Veteran" className="bg-neutral-900 text-white">Veteran (3+ Seasons)</option>
                  <option value="All-Star" className="bg-neutral-900 text-white">All-Star Tier</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-muted hover:bg-white/10 text-neutral-400 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPlayer}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(var(--league-primary-rgb),0.3)] disabled:opacity-50"
                >
                  {addingPlayer ? "Signing..." : "Sign Athlete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function LiveAndUpcomingGamesSection({
  games,
  liveCount,
  teams,
  standingsMap,
  isLeagueAdmin,
  isEmbedded,
}: {
  games: any[];
  liveCount: number;
  teams: any[];
  standingsMap: Record<string, any>;
  isLeagueAdmin?: boolean;
  isEmbedded?: boolean;
}) {
  const formatClock = (seconds: number) => {
    const m = Math.floor(Math.max(0, seconds) / 60);
    const s = Math.max(0, seconds) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const isLive = (m: any) =>
    (m.status === "in_progress" || m.status === "live") &&
    m.status !== "completed" &&
    m.status !== "Final";

  return (
    <section className="bg-surface-raised border border-line rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-line-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
              Live & Upcoming Games
            </h2>
            {liveCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>{liveCount} Live Now</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time live scores, active match clocks, and next scheduled games across the league.
          </p>
        </div>

        <Link
          href="/schedule"
          className="px-4 py-2 bg-surface-muted hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-line transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
          <span>View Full Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-xs italic bg-black/40 rounded-2xl border border-line-subtle flex flex-col items-center justify-center gap-3">
          <CalendarDays className="w-8 h-8 text-neutral-600" />
          <p>No live or upcoming games scheduled at the moment.</p>
          <Link
            href="/schedule"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
          >
            Check Schedule Calendar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {games.map((m) => {
            const hTeam = teams.find((t) => t.id === m.homeTeamId);
            const aTeam = teams.find((t) => t.id === m.awayTeamId);
            const live = isLive(m);

            const hScore = m.homeScore ?? m.matchState?.homeScore ?? 0;
            const aScore = m.awayScore ?? m.matchState?.awayScore ?? 0;

            const hRecord = standingsMap[m.homeTeamId]
              ? `${standingsMap[m.homeTeamId].w}-${standingsMap[m.homeTeamId].l}`
              : "0-0";
            const aRecord = standingsMap[m.awayTeamId]
              ? `${standingsMap[m.awayTeamId].w}-${standingsMap[m.awayTeamId].l}`
              : "0-0";

            return (
              <div
                key={m.id}
                className={`p-5 rounded-2xl transition-all flex flex-col justify-between relative overflow-hidden group ${live
                  ? "bg-gradient-to-br from-[#1C0B0E]/95 via-[#0D101A] to-[#07090E] border-2 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)] hover:border-red-400"
                  : "bg-black/60 border border-line hover:border-cyan-500/40"
                  }`}
              >
                {/* Live Accent Glow */}
                {live && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                )}

                <div>
                  {/* Card Status & Timing Header */}
                  <div className="flex items-center justify-between text-[11px] mb-3 pb-2.5 border-b border-line-subtle">
                    {live ? (
                      <div className="flex items-center gap-2">
                        {/* Flashing Red Dot Live Symbol */}
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="font-black uppercase tracking-wider text-red-500 animate-pulse text-[11px]">
                          LIVE
                        </span>
                        <span className="text-neutral-400 font-mono text-[10px]">
                          {m.matchState?.half ? `Half ${m.matchState.half}` : m.week || "In Progress"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono text-neutral-400">
                        <span className="font-bold text-white uppercase">{m.week || "Matchday"}</span>
                      </div>
                    )}

                    {/* Clock or Time */}
                    {live ? (
                      <span className="px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-mono text-xs font-black tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3 text-red-400 shrink-0" />
                        <span>{formatClock(m.matchState?.gameClock ?? 1200)}</span>
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-semibold font-mono text-xs">
                        {m.time || "Scheduled"}
                      </span>
                    )}
                  </div>

                  {/* Teams & Scores */}
                  <div className="space-y-2 mb-3">
                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${live
                        ? "bg-black/50 border-line-subtle"
                        : "bg-surface-muted border-line-subtle hover:bg-white/10"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/60 border border-line p-1 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={m.homeTeamName}
                            logoUrl={hTeam?.logoUrl}
                            icon={hTeam?.icon}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-white truncate block">
                            {m.homeTeamName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            HOME {!live && `• ${hRecord}`}
                          </span>
                        </div>
                      </div>
                      {live ? (
                        <span className="text-2xl font-black text-white font-mono pl-2 shrink-0">
                          {hScore}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">HOME</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${live
                        ? "bg-black/50 border-line-subtle"
                        : "bg-surface-muted border-line-subtle hover:bg-white/10"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-black/60 border border-line p-1 flex items-center justify-center shrink-0">
                          <TeamLogo
                            teamName={m.awayTeamName}
                            logoUrl={aTeam?.logoUrl}
                            icon={aTeam?.icon}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-neutral-200 truncate block">
                            {m.awayTeamName}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            AWAY {!live && `• ${aRecord}`}
                          </span>
                        </div>
                      </div>
                      {live ? (
                        <span className="text-2xl font-black text-white font-mono pl-2 shrink-0">
                          {aScore}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">AWAY</span>
                      )}
                    </div>
                  </div>

                  {/* Situational indicator for Live Games */}
                  {live && m.matchState && (
                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between mb-3 px-1 py-1 rounded bg-black/30 border border-line-subtle">
                      <span>
                        Ball:{" "}
                        <strong className="text-cyan-400">
                          {m.matchState.possession || m.homeTeamName}
                        </strong>
                      </span>
                      {m.matchState.currentDown && (
                        <span>
                          Down: <strong className="text-amber-400">{m.matchState.currentDown}</strong>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Venue and Date */}
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mb-3 px-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="truncate">{m.location || "Field 1"}</span>
                    <span>•</span>
                    <span className="truncate">{m.date}</span>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2.5 border-t border-line-subtle">
                  {live ? (
                    <Link
                      href={isEmbedded ? `/matches/${m.id}/play-by-play?embed=true&demo=true` : `/matches/${m.id}/play-by-play`}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-950/50"
                    >
                      <PlayCircle className="w-4 h-4 animate-pulse" />
                      <span>{isLeagueAdmin ? "Manage Scorekeeper" : "Watch Live Play-by-Play"}</span>
                    </Link>
                  ) : isEmbedded ? (
                    <div className="w-full py-2.5 px-3 bg-surface-muted text-neutral-400 text-xs font-bold rounded-xl border border-line text-center flex items-center justify-center gap-1.5 cursor-default">
                      <span>Match Scheduled</span>
                    </div>
                  ) : (
                    <Link
                      href={isLeagueAdmin ? `/matches/${m.id}/play-by-play` : `/matches/${m.id}`}
                      className="w-full py-2.5 px-3 bg-surface-muted hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold rounded-xl border border-line text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{isLeagueAdmin ? "Launch Scorekeeper" : "Match Preview & Details"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
