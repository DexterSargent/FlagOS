/**
 * Official Flag Football Play-by-Play & Penalty Formatting Engine
 * Generates coherent, professional, and clear play statements for live feeds,
 * administrative wizards, viewer streams, and box score recaps.
 */

import { displayPlayerName, replacePlaceholderInText } from "./opponentPlaceholder";

export interface PenaltyDefinition {
  id: string;
  name: string;
  side: "offense" | "defense";
  defaultYards: number;
  defaultDownResult: "repeat_down" | "automatic_first_down" | "loss_of_down";
  description: string;
}

export const PENALTY_CATALOG: PenaltyDefinition[] = [
  // Defensive Penalties
  {
    id: "dpi",
    name: "Defensive Pass Interference",
    side: "defense",
    defaultYards: 10,
    defaultDownResult: "automatic_first_down",
    description: "Contact that impedes receiver before the ball arrives",
  },
  {
    id: "illegal_contact",
    name: "Illegal Contact / Holding",
    side: "defense",
    defaultYards: 5,
    defaultDownResult: "automatic_first_down",
    description: "Holding or initiating contact past the line of scrimmage",
  },
  {
    id: "offsides",
    name: "Offsides / Encroachment",
    side: "defense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Crossing the line of scrimmage prior to snap",
  },
  {
    id: "roughing_passer",
    name: "Roughing the Passer",
    side: "defense",
    defaultYards: 10,
    defaultDownResult: "automatic_first_down",
    description: "Contact with the quarterback during or after throw",
  },
  {
    id: "illegal_rush",
    name: "Illegal Rush",
    side: "defense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Rushing from inside 7-yard rush cone or before designated count",
  },
  {
    id: "early_flag_pull",
    name: "Early Flag",
    side: "defense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Removing a receiver's flag before ball possession",
  },
  {
    id: "unsportsmanlike_def",
    name: "Unsportsmanlike Conduct (Defense)",
    side: "defense",
    defaultYards: 10,
    defaultDownResult: "automatic_first_down",
    description: "Abusive language, taunting, or contact infraction",
  },

  // Offensive Penalties
  {
    id: "false_start",
    name: "False Start",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Illegal movement prior to the snap",
  },
  {
    id: "flag_guarding",
    name: "Flag Guarding",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "loss_of_down",
    description: "Using hands, ball, or body to obstruct a flag",
  },
  {
    id: "illegal_forward_pass",
    name: "Illegal Forward Pass",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "loss_of_down",
    description: "Throwing after crossing line of scrimmage or 2nd forward pass",
  },
  {
    id: "opi",
    name: "Offensive Pass Interference",
    side: "offense",
    defaultYards: 10,
    defaultDownResult: "repeat_down",
    description: "Push off or initiating contact to create separation",
  },
  {
    id: "illegal_motion",
    name: "Illegal Motion / Shift",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "More than one player in motion or moving toward line at snap",
  },
  {
    id: "delay_of_game",
    name: "Delay of Game",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Failing to snap ball before play clock expiration",
  },
  {
    id: "offensive_holding",
    name: "Offensive Holding / Screening",
    side: "offense",
    defaultYards: 5,
    defaultDownResult: "repeat_down",
    description: "Illegal moving pick or grabbing a defensive rusher",
  },
  {
    id: "unsportsmanlike_off",
    name: "Unsportsmanlike Conduct (Offense)",
    side: "offense",
    defaultYards: 10,
    defaultDownResult: "loss_of_down",
    description: "Abusive language, taunting, or conduct violation",
  },
];

export function getOrdinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * Generates an official, logical play-by-play statement for a penalty.
 */
export function formatPenaltyStatement(params: {
  teamName?: string;
  side?: "offense" | "defense";
  penaltyName: string;
  yards?: number | string;
  enforcement?: "accepted" | "declined" | "offset" | "offsetting";
  downResult?: "automatic_first_down" | "repeat_down" | "loss_of_down" | "play_stands";
  currentDown?: number;
  downsPerSeries?: number;
  playerName?: string;
  // Aliases for compatibility
  teamSide?: "offense" | "defense";
  player?: string;
  downRule?: string;
}): string {
  const teamName = params.teamName;
  const side = params.side || params.teamSide;
  const penaltyName = params.penaltyName || "Penalty";
  const yards = params.yards ?? 5;
  const enforcement = params.enforcement || "accepted";
  const currentDown = params.currentDown || 1;
  const downsPerSeries = params.downsPerSeries || 4;

  let downResult = params.downResult;
  if (!downResult && params.downRule) {
    if (params.downRule === "auto_first" || params.downRule === "first_down") downResult = "automatic_first_down";
    else if (params.downRule === "loss_of_down") downResult = "loss_of_down";
    else if (params.downRule === "repeat_down" || params.downRule === "replay_down") downResult = "repeat_down";
    else if (params.downRule === "play_stands") downResult = "play_stands";
  }

  const rawPlayer = params.playerName || params.player;
  let playerPart = "";
  if (rawPlayer && rawPlayer !== "TEAM") {
    playerPart = `, ${rawPlayer.startsWith("#") || isNaN(Number(rawPlayer)) ? rawPlayer : `#${rawPlayer}`}`;
  }

  const sideLabel = side ? ` (${side.charAt(0).toUpperCase() + side.slice(1)})` : "";
  const teamLabel = teamName ? `${teamName}${sideLabel}` : side ? `${side.toUpperCase()}` : "PENALTY";

  if (enforcement === "declined") {
    const yardStr = typeof yards === "number" && yards > 0 ? ` (${yards} yards)` : "";
    return `PENALTY: ${teamLabel}${playerPart} - ${penaltyName}${yardStr} [DECLINED] • Result of play stands.`;
  }

  if (enforcement === "offset" || enforcement === "offsetting") {
    return `PENALTIES OFFSET: ${penaltyName} on both teams • Replay ${getOrdinal(currentDown)} Down.`;
  }

  // Accepted penalty
  let yardageStr = "";
  if (typeof yards === "number") {
    yardageStr = yards > 0 ? `${yards} yards` : "Spot Foul";
  } else {
    yardageStr = yards || "5 yards";
  }

  let resultStr = "";
  if (downResult === "automatic_first_down") {
    resultStr = "Automatic First Down";
  } else if (downResult === "loss_of_down") {
    if (currentDown >= downsPerSeries) {
      resultStr = "Loss of Down (Turnover on Downs)";
    } else {
      resultStr = `Loss of Down (Advances to ${getOrdinal(currentDown + 1)} Down)`;
    }
  } else if (downResult === "repeat_down") {
    resultStr = `Replay ${getOrdinal(currentDown)} Down`;
  } else if (downResult === "play_stands") {
    resultStr = "Result of Play Stands";
  } else {
    resultStr = `Replay ${getOrdinal(currentDown)} Down`;
  }

  return `PENALTY: ${teamLabel}${playerPart} - ${penaltyName} (${yardageStr}) • Result: ${resultStr}.`;
}

/**
 * Universal Formatter for ANY play event in the system.
 * Emits coherent, grammatically sound football sentences without awkward brackets or undefined values.
 */
export function formatPlaySentence(
  play: any,
  context?: {
    homeTeamName?: string;
    awayTeamName?: string;
    homeTeamId?: string;
    downsPerSeries?: number;
  }
): string {
  if (!play || typeof play !== "object") return "";

  const possessionTeamName =
    context?.homeTeamId && play.possessionTeamId
      ? play.possessionTeamId === context.homeTeamId
        ? context.homeTeamName
        : context.awayTeamName
      : undefined;

  // 1. If play already has a pre-formatted coherent statement, use it (unless it contains a stale PAT pending marker that was resolved)
  if (
    play.playStatement &&
    typeof play.playStatement === "string" &&
    play.playStatement.trim().length > 0 &&
    !(play.playStatement.includes("(PAT pending)") && !play.conversionPending)
  ) {
    return replacePlaceholderInText(play.playStatement, possessionTeamName);
  }

  const downsPerSeries = context?.downsPerSeries || 4;
  const down = play.down || 1;
  const ordDown = getOrdinal(down);

  // 2. PENALTY PLAY
  if (play.playType === "Penalty") {
    const teamName =
      play.penaltyTeamName ||
      (play.penaltyTeam === "defense"
        ? play.possessionTeamId === context?.homeTeamId
          ? context?.awayTeamName
          : context?.homeTeamName
        : play.possessionTeamId === context?.homeTeamId
        ? context?.homeTeamName
        : context?.awayTeamName) ||
      (play.penaltyTeam === "defense" ? "Defense" : "Offense");

    const penaltyName = play.penaltyType || play.penaltyName || "Penalty on the play";
    const yards = play.penaltyYards ?? (play.result === "First Down" ? 10 : 5);
    const enforcement = play.penaltyEnforcement || "accepted";
    
    let downResult: "automatic_first_down" | "repeat_down" | "loss_of_down" | "play_stands" =
      play.penaltyDownResult || "repeat_down";
    if (play.result === "First Down" || play.firstDown || play.penaltyDownRule === "auto_first") {
      downResult = "automatic_first_down";
    } else if (play.result === "Loss of Down" || play.penaltyDownRule === "loss_of_down") {
      downResult = "loss_of_down";
    } else if (play.result === "Repeat Down" || play.penaltyDownRule === "repeat_down") {
      downResult = "repeat_down";
    } else if (enforcement === "declined") {
      downResult = "play_stands";
    }

    return formatPenaltyStatement({
      teamName,
      side: play.penaltyTeam as any,
      penaltyName,
      yards,
      enforcement,
      downResult,
      currentDown: down,
      downsPerSeries,
      playerName: play.penaltyPlayer,
    });
  }

  // 3. PASS PLAY
  if (play.playType === "Pass") {
    const qb = displayPlayerName(play.qbPlayerId, possessionTeamName) || "Quarterback";
    const rec = displayPlayerName(play.receiverPlayerId, possessionTeamName) || "receiver";
    const defs = Array.isArray(play.defenders) && play.defenders.length > 0
      ? play.defenders.join(" & ")
      : "";

    let sentence = "";

    if (play.passOutcome === "Complete") {
      if (play.isTouchdown) {
        sentence = `${qb} pass complete to ${rec} for a TOUCHDOWN!`;
      } else if (play.firstDown) {
        sentence = `${qb} pass complete to ${rec} for a FIRST DOWN${defs ? ` (Flagged by ${defs})` : ""}`;
      } else {
        sentence = `${qb} pass complete to ${rec}${defs ? ` (Flagged by ${defs})` : ""}`;
      }
    } else if (play.passOutcome === "Interception") {
      if (play.isPick6) {
        sentence = `${qb} pass INTERCEPTED by ${defs || "Defense"} for a PICK 6 TOUCHDOWN!`;
      } else {
        sentence = `${qb} pass INTERCEPTED by ${defs || "Defense"}`;
      }
    } else if (play.passOutcome === "PBU") {
      sentence = `${qb} pass incomplete, broken up by ${defs || "Defense"}`;
    } else if (play.passOutcome === "Missed") {
      sentence = `${qb} pass incomplete (missed target)`;
    } else if (play.passOutcome === "Sack") {
      if (play.isSafety) {
        sentence = `${qb} sacked in the end zone by ${defs || "Defense"} for a SAFETY!`;
      } else {
        sentence = `${qb} sacked by ${defs || "Defense"} for a loss`;
      }
    } else {
      sentence = `${qb} pass attempt (${play.passOutcome || "Incomplete"})`;
    }

    // Turnover on downs check
    if (
      !play.isTouchdown &&
      !play.isPick6 &&
      !play.firstDown &&
      down >= downsPerSeries &&
      play.passOutcome !== "Interception"
    ) {
      sentence += " • Turnover on Downs";
    }

    // Attach Conversion if present
    if (play.conversionAttempt) {
      sentence += `\n${formatConversionStatement(play)}`;
    }

    return sentence;
  }

  // 4. RUN PLAY
  if (play.playType === "Run") {
    const runner =
      displayPlayerName(play.runnerPlayerId, possessionTeamName) ||
      displayPlayerName(play.qbPlayerId, possessionTeamName) ||
      "Runner";
    const defs = Array.isArray(play.defenders) && play.defenders.length > 0
      ? play.defenders.join(" & ")
      : "";

    let sentence = "";

    if (play.passOutcome === "Gain" || !play.passOutcome) {
      if (play.isTouchdown) {
        sentence = `${runner} rush for a TOUCHDOWN!`;
      } else if (play.firstDown) {
        sentence = `${runner} rush for a FIRST DOWN${defs ? ` (Flagged by ${defs})` : ""}`;
      } else {
        sentence = `${runner} rush for positive gain${defs ? ` (Flagged by ${defs})` : ""}`;
      }
    } else if (play.passOutcome === "FFL" || play.passOutcome === "Loss") {
      if (play.isSafety) {
        sentence = `${runner} tackled in the end zone by ${defs || "Defense"} for a SAFETY!`;
      } else {
        sentence = `${runner} flagged for a loss by ${defs || "Defense"}`;
      }
    } else {
      sentence = `${runner} rush (${play.passOutcome})`;
    }

    // Turnover on downs check
    if (!play.isTouchdown && !play.firstDown && down >= downsPerSeries) {
      sentence += " • Turnover on Downs";
    }

    // Attach Conversion if present
    if (play.conversionAttempt) {
      sentence += `\n${formatConversionStatement(play)}`;
    }

    return sentence;
  }

  // Fallback
  return `${play.playType || "Play"}: ${play.result || "Executed"}`;
}

/**
 * Formats Point-After-Touchdown / Conversion attempt sentences
 */
export function formatConversionStatement(play: any): string {
  const convType = play.conversionAttempt === 1 ? "1-PT" : "2-PT";
  if (play.conversionSuccess) {
    if (play.conversionReceiver) {
      return `${convType} CONVERSION GOOD: ${play.conversionPasser || "Passer"} pass to ${play.conversionReceiver}`;
    } else if (play.conversionPasser) {
      return `${convType} CONVERSION GOOD: ${play.conversionPasser} rush`;
    }
    return `${convType} CONVERSION GOOD (+${play.conversionAttempt} PTS)`;
  }
  return `${convType} CONVERSION FAILED (No Points)`;
}
