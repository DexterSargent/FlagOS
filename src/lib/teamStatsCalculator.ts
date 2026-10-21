export interface TeamComprehensiveStats {
  // Core Record & Scoring
  gp: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  winPctFormatted: string;
  recordFormatted: string;
  pf: number;
  pa: number;
  diff: number;
  diffFormatted: string;
  ppg: number;
  ppgFormatted: string;
  dppg: number;
  dppgFormatted: string;

  // Situational & Downs
  thirdDownAttempts: number;
  thirdDownConversions: number;
  thirdDownPct: number;
  thirdDownFormatted: string;

  fourthDownAttempts: number;
  fourthDownConversions: number;
  fourthDownPct: number;
  fourthDownFormatted: string;

  firstDowns: number;

  defThirdDownAttempts: number;
  defThirdDownStops: number;
  defThirdDownStopPct: number;
  defThirdDownStopFormatted: string;

  defFourthDownAttempts: number;
  defFourthDownStops: number;
  defFourthDownStopPct: number;
  defFourthDownStopFormatted: string;

  // PATs (Points After Touchdown)
  pat1Attempts: number;
  pat1Conversions: number;
  pat1Pct: number;
  pat1Formatted: string;

  pat2Attempts: number;
  pat2Conversions: number;
  pat2Pct: number;
  pat2Formatted: string;

  patTotalAttempts: number;
  patTotalConversions: number;
  patTotalPct: number;
  patTotalFormatted: string;

  // Offensive Production
  totalTDs: number;
  passTDs: number;
  rushTDs: number;
  passAttempts: number;
  passCompletions: number;
  compPct: number;
  compPctFormatted: string;
  rushAttempts: number;

  // Defensive Playmaking
  flags: number;
  sacks: number;
  interceptions: number;
  pbus: number;
  defTDs: number;
  safeties: number;

  // Turnovers & Discipline
  takeaways: number;
  giveaways: number;
  turnoverDiff: number;
  turnoverDiffFormatted: string;
  penalties: number;
  penaltyYards: number;
}

export type StatCategory = 
  | "record"
  | "downs"
  | "pats"
  | "offense"
  | "defense"
  | "discipline";

export interface TeamStatDefinition {
  id: string;
  label: string;
  shortLabel: string;
  category: StatCategory;
  categoryLabel: string;
  description: string;
  getValue: (stats: TeamComprehensiveStats) => string | number;
}

export const TEAM_STAT_DEFINITIONS: TeamStatDefinition[] = [
  // Core Record & Scoring
  {
    id: "record",
    label: "Record (W-L-T)",
    shortLabel: "REC",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Total games won, lost, and tied in completed matches.",
    getValue: (s) => s.recordFormatted,
  },
  {
    id: "winPct",
    label: "Win Percentage",
    shortLabel: "WIN%",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Percentage of games won ((W + 0.5*T) / GP).",
    getValue: (s) => s.winPctFormatted,
  },
  {
    id: "pf",
    label: "Points For (PF)",
    shortLabel: "PF",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Total points scored across all completed games.",
    getValue: (s) => s.pf,
  },
  {
    id: "pa",
    label: "Points Allowed (PA)",
    shortLabel: "PA",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Total points conceded to opponents in completed games.",
    getValue: (s) => s.pa,
  },
  {
    id: "diff",
    label: "Point Differential",
    shortLabel: "DIFF",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Net points scored minus points conceded (+/-).",
    getValue: (s) => s.diffFormatted,
  },
  {
    id: "ppg",
    label: "Points Per Game (PPG)",
    shortLabel: "PPG",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Average points scored per game.",
    getValue: (s) => s.ppgFormatted,
  },
  {
    id: "dppg",
    label: "Defensive PPG Allowed (DPPG)",
    shortLabel: "DPPG",
    category: "record",
    categoryLabel: "Record & Scoring",
    description: "Average points surrendered to opponents per game.",
    getValue: (s) => s.dppgFormatted,
  },

  // Downs & Conversions
  {
    id: "thirdDownPct",
    label: "3rd Down Conversion Rate",
    shortLabel: "3RD %",
    category: "downs",
    categoryLabel: "Situational & Downs",
    description: "Percentage and count of successful 3rd down conversions.",
    getValue: (s) => s.thirdDownFormatted,
  },
  {
    id: "fourthDownPct",
    label: "4th Down Conversion Rate",
    shortLabel: "4TH %",
    category: "downs",
    categoryLabel: "Situational & Downs",
    description: "Percentage and count of successful 4th down conversions.",
    getValue: (s) => s.fourthDownFormatted,
  },
  {
    id: "firstDowns",
    label: "Total 1st Downs",
    shortLabel: "1ST DOWNS",
    category: "downs",
    categoryLabel: "Situational & Downs",
    description: "Total first downs achieved by offense or penalties.",
    getValue: (s) => s.firstDowns,
  },
  {
    id: "defThirdDownStopPct",
    label: "Defensive 3rd Down Stop %",
    shortLabel: "DEF 3RD STOP",
    category: "downs",
    categoryLabel: "Situational & Downs",
    description: "Percentage of opponent 3rd downs successfully stopped.",
    getValue: (s) => s.defThirdDownStopFormatted,
  },
  {
    id: "defFourthDownStopPct",
    label: "Defensive 4th Down Stop %",
    shortLabel: "DEF 4TH STOP",
    category: "downs",
    categoryLabel: "Situational & Downs",
    description: "Percentage of opponent 4th downs successfully stopped.",
    getValue: (s) => s.defFourthDownStopFormatted,
  },

  // PATs (Points After Touchdown)
  {
    id: "patTotalPct",
    label: "Overall PAT Conversion %",
    shortLabel: "PAT %",
    category: "pats",
    categoryLabel: "PAT Efficiency",
    description: "Total conversions made on 1-point and 2-point PAT tries.",
    getValue: (s) => s.patTotalFormatted,
  },
  {
    id: "pat1Pct",
    label: "1-Point PAT Conversion %",
    shortLabel: "1-PT PAT",
    category: "pats",
    categoryLabel: "PAT Efficiency",
    description: "Success rate and attempts on 1-point extra point conversions.",
    getValue: (s) => s.pat1Formatted,
  },
  {
    id: "pat2Pct",
    label: "2-Point PAT Conversion %",
    shortLabel: "2-PT PAT",
    category: "pats",
    categoryLabel: "PAT Efficiency",
    description: "Success rate and attempts on 2-point extra point conversions.",
    getValue: (s) => s.pat2Formatted,
  },

  // Offensive Production
  {
    id: "totalTDs",
    label: "Total Touchdowns Scored",
    shortLabel: "TDS",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Total touchdowns scored (passing, rushing, and defensive).",
    getValue: (s) => s.totalTDs,
  },
  {
    id: "passTDs",
    label: "Passing Touchdowns",
    shortLabel: "PASS TD",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Touchdowns thrown through the air.",
    getValue: (s) => s.passTDs,
  },
  {
    id: "rushTDs",
    label: "Rushing Touchdowns",
    shortLabel: "RUSH TD",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Touchdowns scored via ground run plays.",
    getValue: (s) => s.rushTDs,
  },
  {
    id: "compPct",
    label: "Pass Completion Rate",
    shortLabel: "COMP %",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Pass completions divided by total pass attempts.",
    getValue: (s) => s.compPctFormatted,
  },
  {
    id: "passAttempts",
    label: "Pass Attempts",
    shortLabel: "PASS ATT",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Total offensive passing plays executed.",
    getValue: (s) => s.passAttempts,
  },
  {
    id: "rushAttempts",
    label: "Rush Attempts",
    shortLabel: "RUSH ATT",
    category: "offense",
    categoryLabel: "Offensive Production",
    description: "Total offensive running plays executed.",
    getValue: (s) => s.rushAttempts,
  },

  // Defensive Playmaking
  {
    id: "flags",
    label: "Defensive Flags",
    shortLabel: "FLAGS",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Total flags pulled on ball carriers by team defenders.",
    getValue: (s) => s.flags,
  },
  {
    id: "sacks",
    label: "Quarterback Sacks",
    shortLabel: "SACKS",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Flags pulled on the passer behind the line of scrimmage.",
    getValue: (s) => s.sacks,
  },
  {
    id: "interceptions",
    label: "Interceptions Made",
    shortLabel: "INT",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Opponent passes intercepted by the defense.",
    getValue: (s) => s.interceptions,
  },
  {
    id: "pbus",
    label: "Pass Breakups (PBUs)",
    shortLabel: "PBUS",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Defended passes batted or disrupted without interception.",
    getValue: (s) => s.pbus,
  },
  {
    id: "defTDs",
    label: "Defensive Touchdowns",
    shortLabel: "DEF TD",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Pick-6s and defensive fumble returns scored for touchdowns.",
    getValue: (s) => s.defTDs,
  },
  {
    id: "safeties",
    label: "Safeties Forced",
    shortLabel: "SAFETIES",
    category: "defense",
    categoryLabel: "Defensive Playmaking",
    description: "Two-point safeties registered against the opposing offense.",
    getValue: (s) => s.safeties,
  },

  // Discipline & Turnover Margin
  {
    id: "turnoverDiff",
    label: "Turnover Differential",
    shortLabel: "TO DIFF",
    category: "discipline",
    categoryLabel: "Discipline & Margins",
    description: "Takeaways minus Giveaways margin.",
    getValue: (s) => s.turnoverDiffFormatted,
  },
  {
    id: "takeaways",
    label: "Total Takeaways",
    shortLabel: "TAKEAWAYS",
    category: "discipline",
    categoryLabel: "Discipline & Margins",
    description: "Opponent turnovers forced (interceptions, 4th down stops, safeties).",
    getValue: (s) => s.takeaways,
  },
  {
    id: "giveaways",
    label: "Total Giveaways",
    shortLabel: "GIVEAWAYS",
    category: "discipline",
    categoryLabel: "Discipline & Margins",
    description: "Turnovers committed (interceptions thrown, 4th down fails, safeties).",
    getValue: (s) => s.giveaways,
  },
  {
    id: "penalties",
    label: "Penalties Committed",
    shortLabel: "PENALTIES",
    category: "discipline",
    categoryLabel: "Discipline & Margins",
    description: "Total accepted penalties assessed against the team.",
    getValue: (s) => s.penalties,
  },
  {
    id: "penaltyYards",
    label: "Penalty Yards",
    shortLabel: "PEN YDS",
    category: "discipline",
    categoryLabel: "Discipline & Margins",
    description: "Total penalty yardage incurred.",
    getValue: (s) => `${s.penaltyYards} yds`,
  },
];

/**
 * STRICT REQUIREMENT:
 * All stats hidden by default except record, points for (pf), and points allowed (pa).
 */
export const DEFAULT_VISIBLE_TEAM_STATS: string[] = ["record", "pf", "pa"];

const formatPct = (made: number, att: number): string => {
  if (att === 0) return "0.0% (0/0)";
  const pct = ((made / att) * 100).toFixed(1);
  return `${pct}% (${made}/${att})`;
};

/**
 * Calculates all possible team stats from completed matches and play-by-play logs.
 */
export function calculateTeamComprehensiveStats(
  teamId: string,
  matches: any[] = [],
  plays: any[] = [],
  options?: { teamName?: string; teamAliases?: string[] }
): TeamComprehensiveStats {
  const isTargetTeam = (idOrName?: string) => {
    if (!idOrName) return false;
    if (idOrName === teamId) return true;
    if (options?.teamName && idOrName.toLowerCase() === options.teamName.toLowerCase()) return true;
    if (options?.teamAliases && options.teamAliases.some((alias) => alias.toLowerCase() === idOrName.toLowerCase())) {
      return true;
    }
    return false;
  };

  // Filter completed matches
  const completedMatches = matches.filter(
    (m) =>
      (m.status === "completed" || m.status === "Final") &&
      !m.isHidden &&
      (isTargetTeam(m.homeTeamId) || isTargetTeam(m.awayTeamId))
  );

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pf = 0;
  let pa = 0;

  const completedMatchIdSet = new Set<string>();

  completedMatches.forEach((m) => {
    if (m.id) completedMatchIdSet.add(m.id);
    const isHome = isTargetTeam(m.homeTeamId);
    const scoreFor = Number(isHome ? m.homeScore || 0 : m.awayScore || 0);
    const scoreAgainst = Number(isHome ? m.awayScore || 0 : m.homeScore || 0);

    pf += scoreFor;
    pa += scoreAgainst;

    if (scoreFor > scoreAgainst) wins += 1;
    else if (scoreFor < scoreAgainst) losses += 1;
    else ties += 1;
  });

  const gp = completedMatches.length;

  // Track plays
  let thirdDownAttempts = 0;
  let thirdDownConversions = 0;
  let fourthDownAttempts = 0;
  let fourthDownConversions = 0;
  let firstDowns = 0;

  let defThirdDownAttempts = 0;
  let defThirdDownStops = 0;
  let defFourthDownAttempts = 0;
  let defFourthDownStops = 0;

  let pat1Attempts = 0;
  let pat1Conversions = 0;
  let pat2Attempts = 0;
  let pat2Conversions = 0;

  let totalTDs = 0;
  let passTDs = 0;
  let rushTDs = 0;
  let defTDs = 0;
  let passAttempts = 0;
  let passCompletions = 0;
  let rushAttempts = 0;

  let flags = 0;
  let sacks = 0;
  let interceptions = 0;
  let pbus = 0;
  let safeties = 0;

  let takeaways = 0;
  let giveaways = 0;
  let penalties = 0;
  let penaltyYards = 0;

  plays.forEach((play) => {
    // Only analyze plays from completed matches if matches exist; if no completed match list was given or play has matchId in set, process
    if (completedMatchIdSet.size > 0 && play.matchId && !completedMatchIdSet.has(play.matchId)) {
      return;
    }

    const isOffense =
      isTargetTeam(play.possessionTeamId) ||
      isTargetTeam(play.possession) ||
      isTargetTeam(play.teamId) ||
      isTargetTeam(play.teamName);
    // Determine if team is in the game (either on offense or defense)
    // If play has matchId, find the match; fallback to matches[0] if single match provided
    const playMatch = matches.find((m) => m.id === play.matchId) || (matches.length === 1 ? matches[0] : undefined);
    const isInvolved = isOffense || (playMatch && (isTargetTeam(playMatch.homeTeamId) || isTargetTeam(playMatch.awayTeamId)));

    if (!isInvolved && !isOffense) return;

    const isConversionPlay = Boolean(
      play.isConversion === true ||
      play.playType === "Conversion" ||
      (!play.isTouchdown && (
        (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
        play.conversionSuccess === true
      ))
    );

    // PATs (Points After Touchdown)
    const convPts = play.conversionAttempt ?? play.conversionPts;
    if (isOffense && convPts !== undefined && convPts !== null) {
      const numPts = Number(convPts);
      const isGood = Boolean(play.conversionSuccess);

      if (numPts === 1) {
        pat1Attempts += 1;
        if (isGood) pat1Conversions += 1;
      } else if (numPts === 2) {
        pat2Attempts += 1;
        if (isGood) pat2Conversions += 1;
      }
    }

    // Touchdowns scored on offense
    if (isOffense && (play.isTouchdown || play.result === "Touchdown")) {
      totalTDs += 1;
      if (play.playType === "Pass") passTDs += 1;
      else if (play.playType === "Run") rushTDs += 1;
    }

    // Downs and situational tracking (non-conversion plays)
    if (!isConversionPlay) {
      if (isOffense) {
        // First downs gained
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") {
          firstDowns += 1;
        }

        // 3rd Down Efficiency
        if (play.down === 3 && play.playType !== "Penalty") {
          thirdDownAttempts += 1;
          const converted = Boolean(
            play.firstDown ||
            play.isTouchdown ||
            play.result === "First Down" ||
            play.result === "Touchdown" ||
            play.isThirdDownConversion
          );
          if (converted) thirdDownConversions += 1;
        }

        // 4th Down Efficiency
        if (play.down === 4 && play.playType !== "Penalty") {
          fourthDownAttempts += 1;
          const converted = Boolean(
            play.firstDown ||
            play.isTouchdown ||
            play.result === "First Down" ||
            play.result === "Touchdown" ||
            play.isFourthDownConversion
          );
          if (converted) {
            fourthDownConversions += 1;
          } else {
            // Turnover on downs is a giveaway
            giveaways += 1;
          }
        }

        // Offensive Play Types
        if (play.playType === "Pass") {
          passAttempts += 1;
          if (play.passOutcome === "Complete") passCompletions += 1;
          if (play.passOutcome === "Interception") {
            giveaways += 1;
          }
        } else if (play.playType === "Run") {
          rushAttempts += 1;
        }

        // Giveaways on offense
        if (play.isSafety || play.result === "Safety") {
          giveaways += 1;
        }
      } else {
        // DEFENSIVE PERSPECTIVE
        // Opponent 3rd Down Stops
        if (play.down === 3 && play.playType !== "Penalty") {
          defThirdDownAttempts += 1;
          const converted = Boolean(
            play.firstDown ||
            play.isTouchdown ||
            play.result === "First Down" ||
            play.result === "Touchdown" ||
            play.isThirdDownConversion
          );
          if (!converted) defThirdDownStops += 1;
        }

        // Opponent 4th Down Stops
        if (play.down === 4 && play.playType !== "Penalty") {
          defFourthDownAttempts += 1;
          const converted = Boolean(
            play.firstDown ||
            play.isTouchdown ||
            play.result === "First Down" ||
            play.result === "Touchdown" ||
            play.isFourthDownConversion
          );
          if (!converted) {
            defFourthDownStops += 1;
            // Stop on 4th down is a takeaway
            takeaways += 1;
          }
        }

        // Defensive stats
        if (Array.isArray(play.flaggers) && play.flaggers.length > 0) {
          flags += play.flaggers.length;
        } else if (play.flagPulls) {
          flags += Number(play.flagPulls);
        }

        if (play.passOutcome === "Sack" || play.result === "Sack") {
          sacks += 1;
        }

        if (play.passOutcome === "Interception" || play.result === "Pick 6" || play.isPick6) {
          interceptions += 1;
          takeaways += 1;
        }

        if (play.passOutcome === "PBU") {
          pbus += 1;
        }

        if (play.isPick6 || play.result === "Pick 6" || play.result === "Pick 6 Touchdown") {
          defTDs += 1;
          totalTDs += 1;
        }

        if (play.isSafety || play.result === "Safety") {
          safeties += 1;
          takeaways += 1;
        }
      }

      // Penalties
      if (play.playType === "Penalty") {
        const isTeamPenalized =
          (isOffense && play.penaltyTeam === "offense") ||
          (!isOffense && play.penaltyTeam === "defense") ||
          (play.penaltyTeamName && isTargetTeam(play.penaltyTeamName));

        if (isTeamPenalized) {
          penalties += 1;
          if (play.penaltyYards) penaltyYards += Number(play.penaltyYards);
        }
      }
    }
  });

  return finalizeTeamComprehensiveStats({
    gp, wins, losses, ties, pf, pa,
    thirdDownAttempts, thirdDownConversions, fourthDownAttempts, fourthDownConversions, firstDowns,
    defThirdDownAttempts, defThirdDownStops, defFourthDownAttempts, defFourthDownStops,
    pat1Attempts, pat1Conversions, pat2Attempts, pat2Conversions,
    totalTDs, passTDs, rushTDs, passAttempts, passCompletions, rushAttempts,
    flags, sacks, interceptions, pbus, defTDs, safeties,
    takeaways, giveaways, penalties, penaltyYards,
  });
}

/** Additive counts that can be summed across games; every other stat is derived from these. */
export const TEAM_COUNTING_STAT_KEYS = [
  "gp", "wins", "losses", "ties", "pf", "pa",
  "thirdDownAttempts", "thirdDownConversions", "fourthDownAttempts", "fourthDownConversions", "firstDowns",
  "defThirdDownAttempts", "defThirdDownStops", "defFourthDownAttempts", "defFourthDownStops",
  "pat1Attempts", "pat1Conversions", "pat2Attempts", "pat2Conversions",
  "totalTDs", "passTDs", "rushTDs", "passAttempts", "passCompletions", "rushAttempts",
  "flags", "sacks", "interceptions", "pbus", "defTDs", "safeties",
  "takeaways", "giveaways", "penalties", "penaltyYards",
] as const;

export type TeamCountingStatKey = (typeof TEAM_COUNTING_STAT_KEYS)[number];
export type TeamCountingStats = Record<TeamCountingStatKey, number>;

export function emptyTeamCountingStats(): TeamCountingStats {
  return Object.fromEntries(TEAM_COUNTING_STAT_KEYS.map((key) => [key, 0])) as TeamCountingStats;
}

export function toTeamCountingStats(stats: TeamComprehensiveStats): TeamCountingStats {
  return Object.fromEntries(TEAM_COUNTING_STAT_KEYS.map((key) => [key, stats[key]])) as TeamCountingStats;
}

/** Derives rates and display strings from counts, so per-game counts can be combined without averaging percentages. */
export function finalizeTeamComprehensiveStats(counts: TeamCountingStats): TeamComprehensiveStats {
  const {
    gp, wins, losses, ties, pf, pa,
    thirdDownAttempts, thirdDownConversions, fourthDownAttempts, fourthDownConversions, firstDowns,
    defThirdDownAttempts, defThirdDownStops, defFourthDownAttempts, defFourthDownStops,
    pat1Attempts, pat1Conversions, pat2Attempts, pat2Conversions,
    totalTDs, passTDs, rushTDs, passAttempts, passCompletions, rushAttempts,
    flags, sacks, interceptions, pbus, defTDs, safeties,
    takeaways, giveaways, penalties, penaltyYards,
  } = counts;
  const winPct = gp > 0 ? (wins + 0.5 * ties) / gp : 0;
  const diff = pf - pa;
  const ppg = gp > 0 ? pf / gp : 0;
  const dppg = gp > 0 ? pa / gp : 0;

  const patTotalAttempts = pat1Attempts + pat2Attempts;
  const patTotalConversions = pat1Conversions + pat2Conversions;
  const patTotalPct = patTotalAttempts > 0 ? (patTotalConversions / patTotalAttempts) * 100 : 0;
  const pat1Pct = pat1Attempts > 0 ? (pat1Conversions / pat1Attempts) * 100 : 0;
  const pat2Pct = pat2Attempts > 0 ? (pat2Conversions / pat2Attempts) * 100 : 0;

  const thirdDownPct = thirdDownAttempts > 0 ? (thirdDownConversions / thirdDownAttempts) * 100 : 0;
  const fourthDownPct = fourthDownAttempts > 0 ? (fourthDownConversions / fourthDownAttempts) * 100 : 0;

  const defThirdDownStopPct = defThirdDownAttempts > 0 ? (defThirdDownStops / defThirdDownAttempts) * 100 : 0;
  const defFourthDownStopPct = defFourthDownAttempts > 0 ? (defFourthDownStops / defFourthDownAttempts) * 100 : 0;

  const compPct = passAttempts > 0 ? (passCompletions / passAttempts) * 100 : 0;
  const turnoverDiff = takeaways - giveaways;

  return {
    gp,
    wins,
    losses,
    ties,
    winPct,
    winPctFormatted: winPct.toFixed(3).replace(/^0\./, "."),
    recordFormatted: `${wins}-${losses}-${ties}`,
    pf,
    pa,
    diff,
    diffFormatted: diff > 0 ? `+${diff}` : `${diff}`,
    ppg,
    ppgFormatted: ppg.toFixed(1),
    dppg,
    dppgFormatted: dppg.toFixed(1),

    thirdDownAttempts,
    thirdDownConversions,
    thirdDownPct,
    thirdDownFormatted: formatPct(thirdDownConversions, thirdDownAttempts),

    fourthDownAttempts,
    fourthDownConversions,
    fourthDownPct,
    fourthDownFormatted: formatPct(fourthDownConversions, fourthDownAttempts),

    firstDowns,

    defThirdDownAttempts,
    defThirdDownStops,
    defThirdDownStopPct,
    defThirdDownStopFormatted: formatPct(defThirdDownStops, defThirdDownAttempts),

    defFourthDownAttempts,
    defFourthDownStops,
    defFourthDownStopPct,
    defFourthDownStopFormatted: formatPct(defFourthDownStops, defFourthDownAttempts),

    pat1Attempts,
    pat1Conversions,
    pat1Pct,
    pat1Formatted: formatPct(pat1Conversions, pat1Attempts),

    pat2Attempts,
    pat2Conversions,
    pat2Pct,
    pat2Formatted: formatPct(pat2Conversions, pat2Attempts),

    patTotalAttempts,
    patTotalConversions,
    patTotalPct,
    patTotalFormatted: formatPct(patTotalConversions, patTotalAttempts),

    totalTDs,
    passTDs,
    rushTDs,
    passAttempts,
    passCompletions,
    compPct,
    compPctFormatted: passAttempts > 0 ? `${compPct.toFixed(1)}%` : "0.0%",
    rushAttempts,

    flags,
    sacks,
    interceptions,
    pbus,
    defTDs,
    safeties,

    takeaways,
    giveaways,
    turnoverDiff,
    turnoverDiffFormatted: turnoverDiff > 0 ? `+${turnoverDiff}` : `${turnoverDiff}`,
    penalties,
    penaltyYards,
  };
}
