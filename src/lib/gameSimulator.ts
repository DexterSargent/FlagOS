import { db } from "./firebase";
import { collection, doc, getDoc, getDocs, updateDoc, query, where, limit } from "firebase/firestore";
import { createSecureRecord } from "./secureWrites";
import {
  getSandboxMatch,
  getSandboxPlayers,
  getSandboxPlays,
  addSandboxPlay,
  updateSandboxMatch,
  isDemoMatch,
} from "./demoSandbox";
import { SEED_DEMO_PLAYERS, SEED_DEMO_TEAMS } from "./demoSeedData";
import { decomposeScore } from "./demoPlayGenerator";

export interface SimulatedGameResult {
  success: boolean;
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  playsCount: number;
  error?: string;
}

interface TeamRosterProfile {
  teamName: string;
  qb: string;
  rb: string;
  wrs: string[];
  db: string;
  rusher: string;
}

/**
 * Resolves or builds a realistic team roster profile for simulation.
 */
async function resolveTeamRoster(
  teamId: string,
  teamName: string,
  isDemo: boolean
): Promise<TeamRosterProfile> {
  let playerNames: string[] = [];

  if (isDemo) {
    const sandboxRoster = getSandboxPlayers().filter((p) => p.teamId === teamId);
    if (sandboxRoster.length > 0) {
      playerNames = sandboxRoster.map((p) => p.playerName);
    } else {
      const seedRoster = SEED_DEMO_PLAYERS.filter((p) => p.teamId === teamId);
      if (seedRoster.length > 0) {
        playerNames = seedRoster.map((p) => p.playerName);
      }
    }
  } else {
    try {
      const q = query(collection(db, "players"), where("teamId", "==", teamId), limit(30));
      const snap = await getDocs(q);
      if (!snap.empty) {
        playerNames = snap.docs.map((d) => d.data().playerName || d.data().name).filter(Boolean);
      }
    } catch (e) {
      console.warn(`Could not fetch roster for team ${teamId} from Firestore:`, e);
    }
  }

  // Fallback defaults if roster is sparse
  const qb = playerNames[0] || `${teamName} QB`;
  const rb = playerNames[1] || `${teamName} RB`;
  const wrs = playerNames.slice(2, 5).filter(Boolean);
  if (wrs.length === 0) wrs.push(`${teamName} WR1`, `${teamName} WR2`);
  const dbPlayer = playerNames[5] || playerNames[2] || `${teamName} DB`;
  const rusher = playerNames[6] || playerNames[3] || `${teamName} Rusher`;

  return { teamName, qb, rb, wrs, db: dbPlayer, rusher };
}

/**
 * Randomly generates a realistic flag football score (multiples of TDs + conversions).
 */
function generateRandomScorePair(): { homeScore: number; awayScore: number } {
  // Realistic TD counts between 2 and 5 per team
  const homeTDs = 2 + Math.floor(Math.random() * 4); // 2 to 5
  const awayTDs = 2 + Math.floor(Math.random() * 4); // 2 to 5

  let homeScore = 0;
  for (let i = 0; i < homeTDs; i++) {
    homeScore += 6;
    const convRoll = Math.random();
    if (convRoll > 0.6) homeScore += 2; // 2-pt conversion
    else if (convRoll > 0.25) homeScore += 1; // 1-pt conversion
  }

  let awayScore = 0;
  for (let i = 0; i < awayTDs; i++) {
    awayScore += 6;
    const convRoll = Math.random();
    if (convRoll > 0.6) awayScore += 2;
    else if (convRoll > 0.25) awayScore += 1;
  }

  // Avoid exact ties for drama unless intentionally close
  if (homeScore === awayScore) {
    if (Math.random() > 0.5) homeScore += 1;
    else awayScore += 2;
  }

  return { homeScore, awayScore };
}

/**
 * Randomly simulates a full flag football match play-by-play log
 * and writes the completed score and plays to Firestore or demo sandbox.
 */
export async function simulateFullGame(
  matchId: string,
  options?: {
    leagueId?: string;
    isDemo?: boolean;
    forcedHomeScore?: number;
    forcedAwayScore?: number;
  }
): Promise<SimulatedGameResult> {
  const isDemo =
    options?.isDemo ?? isDemoMatch(matchId, options?.leagueId);

  let matchData: any = null;

  if (isDemo) {
    matchData = getSandboxMatch(matchId);
  } else {
    try {
      const snap = await getDoc(doc(db, "matches", matchId));
      if (snap.exists()) {
        matchData = { ...snap.data(), id: snap.id };
      }
    } catch (e) {
      console.warn("Could not load match from Firestore, checking sandbox:", e);
      matchData = getSandboxMatch(matchId);
    }
  }

  if (!matchData) {
    return {
      success: false,
      matchId,
      homeTeamName: "Home",
      awayTeamName: "Away",
      homeScore: 0,
      awayScore: 0,
      playsCount: 0,
      error: `Match with ID "${matchId}" not found.`,
    };
  }

  const homeTeamId = matchData.homeTeamId || "home";
  const awayTeamId = matchData.awayTeamId || "away";
  const homeTeamName = matchData.homeTeamName || "Home Team";
  const awayTeamName = matchData.awayTeamName || "Away Team";
  const leagueId = matchData.leagueId || options?.leagueId;

  // Resolve team rosters for authentic player attribution
  const [homeRoster, awayRoster] = await Promise.all([
    resolveTeamRoster(homeTeamId, homeTeamName, isDemo),
    resolveTeamRoster(awayTeamId, awayTeamName, isDemo),
  ]);

  // Determine scores
  const scorePair = generateRandomScorePair();
  const finalHomeScore =
    typeof options?.forcedHomeScore === "number" ? options.forcedHomeScore : scorePair.homeScore;
  const finalAwayScore =
    typeof options?.forcedAwayScore === "number" ? options.forcedAwayScore : scorePair.awayScore;

  const homeDrives = decomposeScore(finalHomeScore);
  const awayDrives = decomposeScore(finalAwayScore);

  const plays: any[] = [];
  let playIndex = 1;
  let homeCurrentScore = 0;
  let awayCurrentScore = 0;

  const totalDrives = Math.max(homeDrives.length, awayDrives.length);
  const half1DriveCount = Math.max(1, Math.ceil(totalDrives / 2));

  const addDrive = (
    drive: any,
    offTeamId: string,
    defTeamId: string,
    offRoster: TeamRosterProfile,
    defRoster: TeamRosterProfile,
    isHome: boolean,
    half: 1 | 2,
    startClock: number
  ) => {
    let clock = startClock;
    const offensiveTargets = [...offRoster.wrs, offRoster.rb];
    const wr = offensiveTargets[(playIndex - 1) % offensiveTargets.length];

    // 1. Chunk play (1st Down Gain)
    clock -= 35 + Math.floor(Math.random() * 20);
    const setupYards = 14 + Math.floor(Math.random() * 16);
    plays.push({
      id: `play_${matchId}_${playIndex++}`,
      matchId,
      ...(leagueId ? { leagueId } : {}),
      possessionTeamId: offTeamId,
      possessionTeamName: offRoster.teamName,
      playType: "Pass",
      down: 1,
      half,
      gameClock: Math.max(15, clock),
      qbPlayerId: offRoster.qb,
      receiverPlayerId: wr,
      passOutcome: "Complete",
      firstDown: true,
      points: 0,
      defenders: [defRoster.db],
      flaggers: [defRoster.db],
      timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
      result: `${offRoster.qb} ${setupYards} yd pass complete to ${wr} (1st Down, flagged by ${defRoster.db})`,
    });

    // 2. Occasional Defensive Play (PBU or Sack or Incomplete)
    if (playIndex % 3 === 0) {
      clock -= 25;
      const isSack = Math.random() > 0.5;
      if (isSack) {
        plays.push({
          id: `play_${matchId}_${playIndex++}`,
          matchId,
          ...(leagueId ? { leagueId } : {}),
          possessionTeamId: offTeamId,
          possessionTeamName: offRoster.teamName,
          playType: "Pass",
          down: 2,
          half,
          gameClock: Math.max(10, clock),
          qbPlayerId: offRoster.qb,
          passOutcome: "Sack",
          points: 0,
          defenders: [defRoster.rusher],
          flaggers: [defRoster.rusher],
          timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
          result: `SACK! ${defRoster.rusher} sacks ${offRoster.qb} for a 5-yd loss`,
        });
      } else {
        plays.push({
          id: `play_${matchId}_${playIndex++}`,
          matchId,
          ...(leagueId ? { leagueId } : {}),
          possessionTeamId: offTeamId,
          possessionTeamName: offRoster.teamName,
          playType: "Pass",
          down: 2,
          half,
          gameClock: Math.max(10, clock),
          qbPlayerId: offRoster.qb,
          passOutcome: "PBU",
          points: 0,
          defenders: [defRoster.db],
          timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
          result: `Incomplete pass broken up by ${defRoster.db}`,
        });
      }
    }

    // 3. Scoring Play
    clock -= 30 + Math.floor(Math.random() * 15);
    if (drive.type === "pass_td") {
      const tdWr = offensiveTargets[playIndex % offensiveTargets.length];
      const tdYards = 12 + Math.floor(Math.random() * 22);
      if (isHome) homeCurrentScore += 6;
      else awayCurrentScore += 6;

      plays.push({
        id: `play_${matchId}_${playIndex++}`,
        matchId,
        ...(leagueId ? { leagueId } : {}),
        possessionTeamId: offTeamId,
        possessionTeamName: offRoster.teamName,
        playType: "Pass",
        down: 3,
        half,
        gameClock: Math.max(5, clock),
        qbPlayerId: offRoster.qb,
        receiverPlayerId: tdWr,
        passOutcome: "Complete",
        isTouchdown: true,
        points: 6,
        timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
        result: `${offRoster.qb} ${tdYards} yd TOUCHDOWN Pass to ${tdWr}! (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`,
      });

      // Point After Touchdown (Conversion)
      if (drive.conversion) {
        clock -= 10;
        const convReceiver = offensiveTargets[(playIndex + 1) % offensiveTargets.length];
        if (isHome) homeCurrentScore += drive.conversion;
        else awayCurrentScore += drive.conversion;

        plays.push({
          id: `play_${matchId}_${playIndex++}`,
          matchId,
          ...(leagueId ? { leagueId } : {}),
          possessionTeamId: offTeamId,
          possessionTeamName: offRoster.teamName,
          playType: "Pass",
          down: 1,
          half,
          gameClock: Math.max(2, clock),
          qbPlayerId: offRoster.qb,
          receiverPlayerId: convReceiver,
          passOutcome: "Complete",
          isConversion: true,
          conversionSuccess: true,
          conversionPasser: offRoster.qb,
          conversionReceiver: convReceiver,
          points: drive.conversion,
          timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
          result: `${drive.conversion}-PT Conversion GOOD! ${offRoster.qb} to ${convReceiver} (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`,
        });
      }
    } else if (drive.type === "rush_td") {
      const rushYards = 8 + Math.floor(Math.random() * 15);
      if (isHome) homeCurrentScore += 6;
      else awayCurrentScore += 6;

      plays.push({
        id: `play_${matchId}_${playIndex++}`,
        matchId,
        ...(leagueId ? { leagueId } : {}),
        possessionTeamId: offTeamId,
        possessionTeamName: offRoster.teamName,
        playType: "Run",
        down: 2,
        half,
        gameClock: Math.max(5, clock),
        runnerPlayerId: offRoster.rb,
        isTouchdown: true,
        points: 6,
        timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
        result: `${offRoster.rb} ${rushYards} yd TOUCHDOWN Run! (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`,
      });

      if (drive.conversion) {
        clock -= 10;
        const convReceiver = offensiveTargets[(playIndex + 2) % offensiveTargets.length];
        if (isHome) homeCurrentScore += drive.conversion;
        else awayCurrentScore += drive.conversion;

        plays.push({
          id: `play_${matchId}_${playIndex++}`,
          matchId,
          ...(leagueId ? { leagueId } : {}),
          possessionTeamId: offTeamId,
          possessionTeamName: offRoster.teamName,
          playType: "Pass",
          down: 1,
          half,
          gameClock: Math.max(2, clock),
          qbPlayerId: offRoster.qb,
          receiverPlayerId: convReceiver,
          passOutcome: "Complete",
          isConversion: true,
          conversionSuccess: true,
          conversionPasser: offRoster.qb,
          conversionReceiver: convReceiver,
          points: drive.conversion,
          timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
          result: `${drive.conversion}-PT Conversion GOOD! ${offRoster.qb} to ${convReceiver} (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`,
        });
      }
    } else if (drive.type === "safety") {
      if (isHome) homeCurrentScore += 2;
      else awayCurrentScore += 2;

      plays.push({
        id: `play_${matchId}_${playIndex++}`,
        matchId,
        ...(leagueId ? { leagueId } : {}),
        possessionTeamId: defTeamId,
        possessionTeamName: defRoster.teamName,
        playType: "Pass",
        down: 3,
        half,
        gameClock: Math.max(5, clock),
        qbPlayerId: defRoster.qb,
        passOutcome: "Sack",
        isSafety: true,
        points: 2,
        defenders: [offRoster.rusher],
        flaggers: [offRoster.rusher],
        timestamp: new Date(Date.now() - (100 - playIndex) * 1000).toISOString(),
        result: `SAFETY! ${offRoster.rusher} sacks ${defRoster.qb} in endzone for 2 points (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`,
      });
    }

    return clock;
  };

  // Build Half 1 Drives
  let h1Clock = 1200;
  for (let i = 0; i < half1DriveCount; i++) {
    if (i < homeDrives.length) {
      h1Clock = addDrive(homeDrives[i], homeTeamId, awayTeamId, homeRoster, awayRoster, true, 1, h1Clock);
    }
    if (i < awayDrives.length) {
      h1Clock = addDrive(awayDrives[i], awayTeamId, homeTeamId, awayRoster, homeRoster, false, 1, h1Clock);
    }
  }

  // Interspersed Defensive Interception in Half 1
  plays.push({
    id: `play_${matchId}_${playIndex++}`,
    matchId,
    ...(leagueId ? { leagueId } : {}),
    possessionTeamId: awayTeamId,
    possessionTeamName: awayTeamName,
    playType: "Pass",
    down: 3,
    half: 1,
    gameClock: 210,
    qbPlayerId: awayRoster.qb,
    passOutcome: "Interception",
    points: 0,
    defenders: [homeRoster.db],
    interceptorPlayerId: homeRoster.db,
    timestamp: new Date(Date.now() - 30000).toISOString(),
    result: `INTERCEPTION! ${homeRoster.db} intercepts pass from ${awayRoster.qb}!`,
  });

  // Build Half 2 Drives
  let h2Clock = 1200;
  for (let i = half1DriveCount; i < totalDrives; i++) {
    if (i < awayDrives.length) {
      h2Clock = addDrive(awayDrives[i], awayTeamId, homeTeamId, awayRoster, homeRoster, false, 2, h2Clock);
    }
    if (i < homeDrives.length) {
      h2Clock = addDrive(homeDrives[i], homeTeamId, awayTeamId, homeRoster, awayRoster, true, 2, h2Clock);
    }
  }

  // Final Knee / Play to seal game
  plays.push({
    id: `play_${matchId}_${playIndex++}`,
    matchId,
    ...(leagueId ? { leagueId } : {}),
    possessionTeamId: finalHomeScore >= finalAwayScore ? homeTeamId : awayTeamId,
    possessionTeamName: finalHomeScore >= finalAwayScore ? homeTeamName : awayTeamName,
    playType: "Run",
    down: 4,
    half: 2,
    gameClock: 0,
    runnerPlayerId: finalHomeScore >= finalAwayScore ? homeRoster.qb : awayRoster.qb,
    points: 0,
    timestamp: new Date().toISOString(),
    result: `Game Final! ${homeTeamName} ${finalHomeScore}, ${awayTeamName} ${finalAwayScore}`,
  });

  // Updated match record
  const updatedMatchState = {
    status: "completed" as const,
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    half: 2,
    gameClock: 0,
    currentDown: 1,
    possession: "home",
    updatedAt: new Date().toISOString(),
    matchState: {
      status: "completed",
      homeScore: finalHomeScore,
      awayScore: finalAwayScore,
      half: 2,
      gameClock: 0,
      currentDown: 1,
      possession: "HOME",
    },
  };

  // Save plays and match state
  if (isDemo) {
    // Save to demo sandbox
    for (const p of plays) {
      addSandboxPlay(p);
    }
    updateSandboxMatch(matchId, updatedMatchState);
  } else {
    // Save to real Firestore
    try {
      await createSecureRecord("play_batch", { matchId, plays });
      await updateDoc(doc(db, "matches", matchId), updatedMatchState);
    } catch (err) {
      console.error("Error saving simulated game to Firestore:", err);
      throw err;
    }
  }

  return {
    success: true,
    matchId,
    homeTeamName,
    awayTeamName,
    homeScore: finalHomeScore,
    awayScore: finalAwayScore,
    playsCount: plays.length,
  };
}
