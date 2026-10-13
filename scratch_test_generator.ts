import { SEED_DEMO_MATCHES, SEED_DEMO_PLAYERS, SEED_DEMO_TEAMS, DemoPlay, DemoMatch } from './src/lib/demoSeedData';

// Map teamId to roster
const teamRosters: Record<string, {
  teamName: string;
  qb: string;
  rb: string;
  wrs: string[];
  db: string;
  rusher: string;
}> = {};

SEED_DEMO_TEAMS.forEach(team => {
  const players = SEED_DEMO_PLAYERS.filter(p => p.teamId === team.id);
  const qb = players[0]?.playerName || `${team.name} QB`;
  const rb = players[1]?.playerName || `${team.name} RB`;
  const wrs = players.slice(2, 5).map(p => p.playerName);
  if (wrs.length === 0) wrs.push(`${team.name} WR`);
  const db = players[5]?.playerName || `${team.name} DB`;
  const rusher = players[6]?.playerName || `${team.name} Rusher`;

  teamRosters[team.id] = { teamName: team.name, qb, rb, wrs, db, rusher };
});

interface ScoringDrive {
  type: "pass_td" | "rush_td" | "fg" | "safety";
  points: number;
  conversion?: 1 | 2;
  totalPoints: number;
}

function decomposeScore(score: number): ScoringDrive[] {
  if (score <= 0) return [];
  const drives: ScoringDrive[] = [];
  let remaining = score;

  while (remaining > 0) {
    if (remaining === 8) {
      drives.push({ type: "pass_td", points: 6, conversion: 2, totalPoints: 8 });
      remaining -= 8;
    } else if (remaining === 7) {
      drives.push({ type: "pass_td", points: 6, conversion: 1, totalPoints: 7 });
      remaining -= 7;
    } else if (remaining === 6) {
      drives.push({ type: "pass_td", points: 6, totalPoints: 6 });
      remaining -= 6;
    } else if (remaining >= 14) {
      drives.push({ type: "pass_td", points: 6, conversion: 1, totalPoints: 7 });
      remaining -= 7;
    } else if (remaining === 13) {
      drives.push({ type: "pass_td", points: 6, conversion: 1, totalPoints: 7 });
      remaining -= 7;
    } else if (remaining === 12) {
      drives.push({ type: "pass_td", points: 6, totalPoints: 6 });
      remaining -= 6;
    } else if (remaining === 11) {
      drives.push({ type: "pass_td", points: 6, conversion: 2, totalPoints: 8 });
      remaining -= 8;
    } else if (remaining === 10) {
      drives.push({ type: "pass_td", points: 6, conversion: 1, totalPoints: 7 });
      remaining -= 7;
    } else if (remaining === 9) {
      drives.push({ type: "pass_td", points: 6, totalPoints: 6 });
      remaining -= 6;
    } else if (remaining === 3) {
      drives.push({ type: "fg", points: 3, totalPoints: 3 });
      remaining -= 3;
    } else if (remaining === 2) {
      drives.push({ type: "safety", points: 2, totalPoints: 2 });
      remaining -= 2;
    } else if (remaining === 5) {
      drives.push({ type: "fg", points: 3, totalPoints: 3 });
      drives.push({ type: "safety", points: 2, totalPoints: 2 });
      remaining = 0;
    } else if (remaining === 4) {
      drives.push({ type: "safety", points: 2, totalPoints: 2 });
      drives.push({ type: "safety", points: 2, totalPoints: 2 });
      remaining = 0;
    } else if (remaining === 1) {
      if (drives.length > 0 && !drives[0].conversion) {
        drives[0].conversion = 1;
        drives[0].totalPoints += 1;
      }
      remaining = 0;
    } else {
      drives.push({ type: "pass_td", points: 6, conversion: 1, totalPoints: 7 });
      remaining -= 7;
    }
  }

  // Turn 1 in 3 pass TDs into a rush TD if team has 2+ TDs
  let passCount = 0;
  for (const d of drives) {
    if (d.type === "pass_td") {
      passCount++;
      if (passCount % 3 === 0) {
        d.type = "rush_td";
      }
    }
  }

  return drives;
}

export function generatePlaysForMatch(match: DemoMatch): DemoPlay[] {
  if (match.status !== "completed") return [];
  const homeRoster = teamRosters[match.homeTeamId];
  const awayRoster = teamRosters[match.awayTeamId];
  if (!homeRoster || !awayRoster) return [];

  const homeDrives = decomposeScore(match.homeScore);
  const awayDrives = decomposeScore(match.awayScore);

  const plays: DemoPlay[] = [];
  let playIndex = 1;
  let homeCurrentScore = 0;
  let awayCurrentScore = 0;

  // Interleave drives: Half 1 (drives 0 to half), Half 2 (remaining)
  const totalDrives = Math.max(homeDrives.length, awayDrives.length);
  const half1DriveCount = Math.ceil(totalDrives / 2);

  // Helper to add setup play + scoring play
  const addDrivePlays = (
    drive: ScoringDrive,
    offTeamId: string,
    defTeamId: string,
    offRoster: typeof homeRoster,
    defRoster: typeof awayRoster,
    isHome: boolean,
    half: 1 | 2,
    clockStart: number
  ) => {
    let clock = clockStart;
    const wr = offRoster.wrs[(playIndex - 1) % offRoster.wrs.length];

    // Setup chunk play (1st Down)
    if (drive.type === "pass_td" || drive.type === "rush_td" || drive.type === "fg") {
      clock -= 45;
      const setupYards = 16 + ((playIndex * 7) % 15);
      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: offTeamId,
        playType: "Pass",
        down: 1,
        half,
        gameClock: Math.max(10, clock),
        qbPlayerId: offRoster.qb,
        receiverPlayerId: wr,
        passOutcome: "Complete",
        firstDown: true,
        points: 0,
        flaggers: [defRoster.db],
        defenders: [defRoster.db],
        result: `${offRoster.qb} ${setupYards} yd pass complete to ${wr} (1st Down, flag pulled by ${defRoster.db})`
      });
    }

    // Defensive stop or deflection setup on non-touchdown drives or long drives
    if ((playIndex % 4 === 0) && (drive.type === "pass_td" || drive.type === "fg")) {
      clock -= 30;
      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: offTeamId,
        playType: "Pass",
        down: 2,
        half,
        gameClock: Math.max(10, clock),
        qbPlayerId: offRoster.qb,
        passOutcome: "PBU",
        points: 0,
        defenders: [defRoster.db],
        result: `Incomplete pass broken up by ${defRoster.db}`
      });
    }

    // The Scoring Play
    clock -= 35;
    if (drive.type === "pass_td") {
      const tdWr = offRoster.wrs[playIndex % offRoster.wrs.length];
      const tdYards = 12 + ((playIndex * 9) % 25);
      if (isHome) homeCurrentScore += 6;
      else awayCurrentScore += 6;

      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: offTeamId,
        playType: "Pass",
        down: 2,
        half,
        gameClock: Math.max(5, clock),
        qbPlayerId: offRoster.qb,
        receiverPlayerId: tdWr,
        passOutcome: "Complete",
        isTouchdown: true,
        points: 6,
        result: `${offRoster.qb} ${tdYards} yd TOUCHDOWN Pass to ${tdWr}! (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
      });

      // Conversion
      if (drive.conversion) {
        clock -= 10;
        const convReceiver = offRoster.rb;
        if (isHome) homeCurrentScore += drive.conversion;
        else awayCurrentScore += drive.conversion;

        plays.push({
          id: `play_${match.id}_${playIndex++}`,
          matchId: match.id,
          possessionTeamId: offTeamId,
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
          result: `${drive.conversion}-PT Conversion GOOD! ${offRoster.qb} to ${convReceiver} (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
        });
      }
    } else if (drive.type === "rush_td") {
      const rushYards = 8 + ((playIndex * 5) % 18);
      if (isHome) homeCurrentScore += 6;
      else awayCurrentScore += 6;

      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: offTeamId,
        playType: "Run",
        down: 1,
        half,
        gameClock: Math.max(5, clock),
        runnerPlayerId: offRoster.rb,
        isTouchdown: true,
        points: 6,
        result: `${offRoster.rb} ${rushYards} yd TOUCHDOWN Run! (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
      });

      if (drive.conversion) {
        clock -= 10;
        const convReceiver = offRoster.wrs[0];
        if (isHome) homeCurrentScore += drive.conversion;
        else awayCurrentScore += drive.conversion;

        plays.push({
          id: `play_${match.id}_${playIndex++}`,
          matchId: match.id,
          possessionTeamId: offTeamId,
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
          result: `${drive.conversion}-PT Conversion GOOD! ${offRoster.qb} to ${convReceiver} (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
        });
      }
    } else if (drive.type === "fg") {
      if (isHome) homeCurrentScore += 3;
      else awayCurrentScore += 3;

      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: offTeamId,
        playType: "Run",
        down: 4,
        half,
        gameClock: Math.max(5, clock),
        points: 3,
        result: `32-yd Field Goal GOOD (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
      });
    } else if (drive.type === "safety") {
      if (isHome) homeCurrentScore += 2;
      else awayCurrentScore += 2;

      plays.push({
        id: `play_${match.id}_${playIndex++}`,
        matchId: match.id,
        possessionTeamId: defTeamId, // defensive team caused safety
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
        result: `SAFETY! ${offRoster.rusher} sacks ${defRoster.qb} in endzone for 2 points (${homeRoster.teamName} ${homeCurrentScore}, ${awayRoster.teamName} ${awayCurrentScore})`
      });
    }

    return clock;
  };

  // Half 1
  let h1Clock = 1200;
  for (let i = 0; i < half1DriveCount; i++) {
    if (i < homeDrives.length) {
      h1Clock = addDrivePlays(homeDrives[i], match.homeTeamId, match.awayTeamId, homeRoster, awayRoster, true, 1, h1Clock);
    }
    if (i < awayDrives.length) {
      h1Clock = addDrivePlays(awayDrives[i], match.awayTeamId, match.homeTeamId, awayRoster, homeRoster, false, 1, h1Clock);
    }
  }

  // Interspersed defensive stop in Half 1 (Sack & INT)
  plays.push({
    id: `play_${match.id}_${playIndex++}`,
    matchId: match.id,
    possessionTeamId: match.awayTeamId,
    playType: "Pass",
    down: 3,
    half: 1,
    gameClock: 320,
    qbPlayerId: awayRoster.qb,
    passOutcome: "Sack",
    points: 0,
    defenders: [homeRoster.rusher],
    flaggers: [homeRoster.rusher],
    result: `SACK! ${homeRoster.rusher} blitzes and pulls ${awayRoster.qb}'s flag for loss of 7 yds`
  });

  // Half 2
  let h2Clock = 1200;
  for (let i = half1DriveCount; i < totalDrives; i++) {
    if (i < homeDrives.length) {
      h2Clock = addDrivePlays(homeDrives[i], match.homeTeamId, match.awayTeamId, homeRoster, awayRoster, true, 2, h2Clock);
    }
    if (i < awayDrives.length) {
      h2Clock = addDrivePlays(awayDrives[i], match.awayTeamId, match.homeTeamId, awayRoster, homeRoster, false, 2, h2Clock);
    }
  }

  // Interspersed defensive stop in Half 2 (Defensive Interception)
  plays.push({
    id: `play_${match.id}_${playIndex++}`,
    matchId: match.id,
    possessionTeamId: match.homeTeamId,
    playType: "Pass",
    down: 2,
    half: 2,
    gameClock: 180,
    qbPlayerId: homeRoster.qb,
    passOutcome: "Interception",
    points: 0,
    defenders: [awayRoster.db],
    flaggers: [homeRoster.rb],
    result: `INTERCEPTION! ${awayRoster.db} picks off ${homeRoster.qb} at midfield (flag pulled by ${homeRoster.rb})`
  });

  return plays;
}

// Generate for all completed matches
const allGeneratedPlays: DemoPlay[] = [];
const completed = SEED_DEMO_MATCHES.filter(m => m.status === 'completed');
completed.forEach(m => {
  const p = generatePlaysForMatch(m);
  allGeneratedPlays.push(...p);
});

console.log('Total generated plays for 250 matches:', allGeneratedPlays.length);
console.log('Average plays per match:', (allGeneratedPlays.length / completed.length).toFixed(1));

// Sample match test
const sampleMatch = completed[0];
const samplePlays = allGeneratedPlays.filter(p => p.matchId === sampleMatch.id);
console.log(`Sample match: ${sampleMatch.homeTeamName} ${sampleMatch.homeScore} vs ${sampleMatch.awayTeamName} ${sampleMatch.awayScore}`);
console.log(`Plays count for sample match: ${samplePlays.length}`);
console.log('Sample play statements:');
samplePlays.slice(0, 5).forEach(p => console.log(' -', p.result));
