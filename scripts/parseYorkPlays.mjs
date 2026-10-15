import fs from "fs";
import path from "path";

const rawGames = {
  mcmaster: {
    matchId: "match_york_mcmaster",
    opponent: "McMaster Marauders",
    opponentId: "opponent_mcmaster",
    date: "2026-09-19",
    time: "10:00",
    week: "Tournament Game 1",
    homeScore: 31,
    awayScore: 13,
    isYorkHome: true,
    text: `McMaster Marauders - 1st Down
Unknown QB pass complete to undefined (Flagged by ISABELLE VERSTRATEN) (Short)

McMaster Marauders - 2nd Down
Unknown QB pass complete to undefined (Flagged by ISABELLE VERSTRATEN) for a FIRST DOWN.

York Lions - 3rd Down
SONIA CABRAL pass intercepted by Unknown (HALFTIME)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

McMaster Marauders - 3rd Down
Unknown QB pass intercepted by EMILIE ESLAMIAN (Turnover)

McMaster Marauders - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

McMaster Marauders - 1st Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

McMaster Marauders - 1st Down
Penalty on the play (Repeat Down)

York Lions - 4th Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

McMaster Marauders - 4th Down
Unknown QB pass incomplete/missed (Next Down)

McMaster Marauders - 3rd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

McMaster Marauders - 2nd Down
Unknown Runner run (Flagged by EMILIE ESLAMIAN) (Short)

McMaster Marauders - 1st Down
Unknown QB pass incomplete/missed (Next Down)

McMaster Marauders - 4th Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) for a FIRST DOWN.

McMaster Marauders - 3rd Down
Unknown QB pass incomplete/missed (Next Down)

McMaster Marauders - 2nd Down
Unknown QB sacked by SHAVANNAH WALKER (Short)

McMaster Marauders - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

York Lions - 4th Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 3rd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 4th Down
Penalty on the play for a FIRST DOWN.

York Lions - 3rd Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

McMaster Marauders - 1st Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass complete to TEHYA CASTRO (Short)

York Lions - 1st Down
SONIA CABRAL sacked by Unknown (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TEHYA CASTRO for a FIRST DOWN.

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

McMaster Marauders - 4th Down
Unknown QB pass complete to null (Flagged by EMMA GIANGROSSO) (Short)

McMaster Marauders - 4th Down
Penalty on the play (Repeat Down)

McMaster Marauders - 3rd Down
Unknown QB sacked by SHAVANNAH WALKER (Short)

McMaster Marauders - 2nd Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

McMaster Marauders - 1st Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 2nd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
Penalty on the play for a FIRST DOWN.

York Lions - 1st Down
Penalty on the play (Loss of Down)

McMaster Marauders - 2nd Down
Unknown QB pass intercepted by ISABELLA ACHONEFTOS (Turnover)

McMaster Marauders - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

York Lions - 4th Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
Penalty on the play (Loss of Down)

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

McMaster Marauders - 1st Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION GOOD:  run

McMaster Marauders - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) for a FIRST DOWN.

McMaster Marauders - 1st Down
Unknown QB pass complete to null (Flagged by EMILIE ESLAMIAN) for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to TEHYA CASTRO

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to CAMERON SEARS for a FIRST DOWN.`
  },
  waterloo: {
    matchId: "match_york_waterloo",
    opponent: "Waterloo Warriors",
    opponentId: "opponent_waterloo",
    date: "2026-09-26",
    time: "11:30",
    week: "Tournament Game 2",
    homeScore: 25,
    awayScore: 13,
    isYorkHome: true,
    text: `York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 1st Down
Penalty on the play for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

Waterloo Warriors - 3rd Down
Unknown QB pass intercepted by ISABELLA ACHONEFTOS (Turnover)

Waterloo Warriors - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

Waterloo Warriors - 4th Down
Unknown QB pass broken up by ISABELLE VERSTRATEN (Next Down)

Waterloo Warriors - 3rd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by EMMA GIANGROSSO) (Short)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TEHYA CASTRO for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to CAMERON SEARS

York Lions - 2nd Down
Penalty on the play for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to TEHYA CASTRO (Short)

Waterloo Warriors - 4th Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Waterloo Warriors - 3rd Down
Unknown QB sacked by SHAVANNAH WALKER (Short)

Waterloo Warriors - 2nd Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

Waterloo Warriors - 1st Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Waterloo Warriors - 2nd Down
Penalty on the play for a FIRST DOWN.

Waterloo Warriors - 1st Down
Unknown QB pass incomplete/missed (Next Down)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

Waterloo Warriors - 3rd Down
Unknown QB pass intercepted by EMMA GIANGROSSO (Turnover)

Waterloo Warriors - 2nd Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

Waterloo Warriors - 4th Down
Unknown QB pass complete to null (Flagged by EMMA GIANGROSSO) for a FIRST DOWN.

Waterloo Warriors - 3rd Down
Unknown Runner run (Flagged by EMMA GIANGROSSO and SHAVANNAH WALKER) (Short)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Waterloo Warriors - 1st Down
Unknown QB pass complete to TEHYA CASTRO (Flagged by ALEXXANDRIA OLIVIER and EMILIE ESLAMIAN) (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TEHYA CASTRO for a FIRST DOWN.

Waterloo Warriors - 3rd Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION GOOD:  run

Waterloo Warriors - 2nd Down
Unknown Runner run (Flagged by MALIKA BABUR) (Short)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLE VERSTRATEN) (Short)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to ALEXA TOMINES-RIVERA (Short)

Waterloo Warriors - 4th Down
Unknown QB pass incomplete/missed (Next Down)

Waterloo Warriors - 3rd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by ISABELLE VERSTRATEN) (Short)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLE VERSTRATEN) (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

Waterloo Warriors - 4th Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION FAILED

Waterloo Warriors - 3rd Down
Unknown QB pass incomplete/missed (Next Down)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Waterloo Warriors - 1st Down
Unknown Runner run (Flagged by ALEXXANDRIA OLIVIER) (Short)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by EMMA GIANGROSSO) for a FIRST DOWN.

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by EMILIE ESLAMIAN) (Short)

York Lions - 3rd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
2-PT CONVERSION FAILED

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
TIZANA SUTHARSAN run (Short)

York Lions - 3rd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 2nd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

Waterloo Warriors - 4th Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

Waterloo Warriors - 3rd Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Waterloo Warriors - 2nd Down
Unknown QB pass complete to null (Flagged by EMILIE ESLAMIAN) (Short)

Waterloo Warriors - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to TEHYA CASTRO for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 2nd Down
Penalty on the play for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)`
  },
  ottawa: {
    matchId: "match_york_ottawa",
    opponent: "Ottawa Gee-Gees",
    opponentId: "opponent_ottawa",
    date: "2026-10-03",
    time: "13:00",
    week: "Tournament Game 3",
    homeScore: 36,
    awayScore: 18,
    isYorkHome: false, // Ottawa is home, York is away
    text: `York Lions - 1st Down
SONIA CABRAL pass complete to ALEXA TOMINES-RIVERA (Short)

Ottawa Gee-Gees - 4th Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION FAILED

Ottawa Gee-Gees - 3rd Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

Ottawa Gee-Gees - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Ottawa Gee-Gees - 1st Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Ottawa Gee-Gees - 2nd Down
Unknown QB pass complete to null (Flagged by ISABELLE VERSTRATEN) for a FIRST DOWN.

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

Ottawa Gee-Gees - 4th Down
Unknown QB pass complete to null for a TOUCHDOWN!
2-PT CONVERSION GOOD:  run

Ottawa Gee-Gees - 3rd Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Ottawa Gee-Gees - 2nd Down
Unknown QB pass broken up by ISABELLE VERSTRATEN (Next Down)

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

Ottawa Gee-Gees - 2nd Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) for a FIRST DOWN.

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass complete to JORDYN PEMBERTON (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to TEHYA CASTRO (Short)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

Ottawa Gee-Gees - 4th Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Ottawa Gee-Gees - 3rd Down
Unknown QB pass incomplete/missed (Next Down)

Ottawa Gee-Gees - 2nd Down
Unknown QB pass complete to null (Flagged by ISABELLE VERSTRATEN) (Short)

Ottawa Gee-Gees - 1st Down
Unknown QB pass incomplete/missed (Next Down)

York Lions - 4th Down
SONIA CABRAL pass complete to TEHYA CASTRO for a TOUCHDOWN!
2-PT CONVERSION FAILED

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 4th Down
SONIA CABRAL pass complete to TEHYA CASTRO for a FIRST DOWN.

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

Ottawa Gee-Gees - 3rd Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION GOOD:  run

Ottawa Gee-Gees - 2nd Down
Unknown QB pass complete to null (Flagged by EMILIE ESLAMIAN) (Short)

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null (Flagged by ALEXXANDRIA OLIVIER) (Short)

York Lions - 2nd Down
SONIA CABRAL sacked by Unknown for a SAFETY!

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

Ottawa Gee-Gees - 1st Down
Unknown QB pass intercepted by ISABELLA ACHONEFTOS (Turnover)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 4th Down
Penalty on the play (Repeat Down)

York Lions - 4th Down
Penalty on the play (Repeat Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
SONIA CABRAL pass complete to TEHYA CASTRO for a TOUCHDOWN!
1-PT CONVERSION FAILED

Ottawa Gee-Gees - 2nd Down
Unknown QB pass intercepted by ISABELLA ACHONEFTOS (Turnover)

Ottawa Gee-Gees - 1st Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

Ottawa Gee-Gees - 1st Down
Unknown QB pass complete to null for a TOUCHDOWN!
1-PT CONVERSION GOOD:  run`
  },
  canadore: {
    matchId: "match_york_canadore",
    opponent: "Canadore Panthers",
    opponentId: "opponent_canadore",
    date: "2026-10-10",
    time: "14:30",
    week: "Tournament Game 4",
    homeScore: 52,
    awayScore: 0,
    isYorkHome: true,
    text: `Canadore Panthers - 4th Down
Unknown QB pass intercepted by EMMA GIANGROSSO (Turnover)

Canadore Panthers - 3rd Down
Unknown QB pass complete to null (Flagged by GIOVANNA SCOUNTRIANOS) (Short)

Canadore Panthers - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 1st Down
Unknown Runner run (Flagged by GIOVANNA SCOUNTRIANOS) (Short)

York Lions - 3rd Down
SONIA CABRAL pass complete to CAMERON SEARS for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 2nd Down
SONIA CABRAL pass complete to TEHYA CASTRO (Short)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass complete to CAMERON SEARS for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

Canadore Panthers - 4th Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Canadore Panthers - 3rd Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Canadore Panthers - 2nd Down
Unknown Runner run (Flagged by EMMA GIANGROSSO) (Short)

Canadore Panthers - 1st Down
Unknown Runner run (Flagged by ALEXXANDRIA OLIVIER) (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
SONIA CABRAL pass complete to CAMERON SEARS (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

Canadore Panthers - 4th Down
Unknown Runner flagged for loss by GIOVANNA SCOUNTRIANOS (Short)

Canadore Panthers - 3rd Down
Unknown Runner flagged for loss by MALIKA BABUR (Short)

Canadore Panthers - 2nd Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Canadore Panthers - 1st Down
Unknown Runner run (Flagged by GIOVANNA SCOUNTRIANOS) (Short)

York Lions - 4th Down
Unknown QB pass intercepted by ALEXXANDRIA OLIVIER for a Pick 6!
1-PT CONVERSION FAILED

Canadore Panthers - 3rd Down
Unknown Runner run (Flagged by SHAVANNAH WALKER) (Short)

Canadore Panthers - 2nd Down
Unknown QB pass broken up by ISABELLA ACHONEFTOS (Next Down)

Canadore Panthers - 1st Down
Unknown Runner flagged for loss by SHAVANNAH WALKER (Short)

York Lions - 4th Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

Canadore Panthers - 2nd Down
Unknown QB pass intercepted by ALEXXANDRIA OLIVIER (Turnover)

Canadore Panthers - 1st Down
Unknown Runner flagged for loss by GIOVANNA SCOUNTRIANOS (Short)

York Lions - 2nd Down
SONIA CABRAL run for a TOUCHDOWN!
1-PT CONVERSION FAILED

York Lions - 1st Down
Penalty on the play (Loss of Down)

Canadore Panthers - 1st Down
Unknown QB pass intercepted by EMILIE ESLAMIAN (Turnover)

Canadore Panthers - 4th Down
Penalty on the play for a FIRST DOWN.

Canadore Panthers - 3rd Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS) (Short)

Canadore Panthers - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 1st Down
Unknown Runner run (Flagged by MALIKA BABUR) (Short)

York Lions - 1st Down
ALEXA TOMINES-RIVERA run for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to CAMERON SEARS

Canadore Panthers - 4th Down
Unknown QB pass complete to null (Flagged by ISABELLA ACHONEFTOS and ISABELLE VERSTRATEN) (Short)

Canadore Panthers - 3rd Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Canadore Panthers - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 1st Down
Unknown QB pass incomplete/missed (Next Down)

York Lions - 3rd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to ALEXA TOMINES-RIVERA

York Lions - 2nd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

York Lions - 1st Down
SONIA CABRAL pass incomplete/missed (Next Down)

York Lions - 1st Down
SONIA CABRAL pass complete to JORDYN PEMBERTON for a FIRST DOWN.

Canadore Panthers - 4th Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 3rd Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

Canadore Panthers - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 2nd Down
Penalty on the play (Repeat Down)

Canadore Panthers - 1st Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 4th Down
Penalty on the play for a FIRST DOWN.

Canadore Panthers - 3rd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 2nd Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Canadore Panthers - 1st Down
Unknown QB pass broken up by ALEXXANDRIA OLIVIER (Next Down)

York Lions - 2nd Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to CAMERON SEARS

York Lions - 1st Down
SONIA CABRAL pass complete to CHARLETTE DEWAEPENAERE (Short)

Canadore Panthers - 4th Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Canadore Panthers - 3rd Down
Unknown QB pass broken up by EMMA GIANGROSSO (Next Down)

Canadore Panthers - 2nd Down
Unknown QB pass incomplete/missed (Next Down)

Canadore Panthers - 1st Down
Unknown QB pass complete to null (Flagged by EMMA GIANGROSSO) (Short)

York Lions - 2nd Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a TOUCHDOWN!
1-PT CONVERSION GOOD: SONIA CABRAL pass to CHARLETTE DEWAEPENAERE

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN (Short)

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.

York Lions - 1st Down
SONIA CABRAL pass complete to TIZANA SUTHARSAN for a FIRST DOWN.`
  }
};

function titleCase(name) {
  if (!name) return "";
  return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function parseBlocks(gameKey, game) {
  const lines = game.text.split("\n").map(l => l.trim());
  const rawBlocks = [];
  let curBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l) {
      if (curBlock.length > 0) {
        rawBlocks.push(curBlock);
        curBlock = [];
      }
      continue;
    }
    curBlock.push(l);
  }
  if (curBlock.length > 0) rawBlocks.push(curBlock);

  // Reverse so kickoff is first, game end is last
  const chronological = [...rawBlocks].reverse();

  const parsedPlays = [];
  let half = 1;
  let homeRunningScore = 0;
  let awayRunningScore = 0;

  for (let idx = 0; idx < chronological.length; idx++) {
    const block = chronological[idx];
    const header = block[0]; // e.g. "York Lions - 1st Down"
    const statement = block[1]; // e.g. "SONIA CABRAL pass complete to ..."
    const convLine = block[2] || ""; // e.g. "1-PT CONVERSION GOOD: ..."

    // Determine possession
    const isYorkPossession = header.toLowerCase().includes("york lions");
    const posTeamId = isYorkPossession ? "york_lions" : game.opponentId;

    // Down
    let down = 1;
    if (header.includes("1st")) down = 1;
    else if (header.includes("2nd")) down = 2;
    else if (header.includes("3rd")) down = 3;
    else if (header.includes("4th")) down = 4;

    // Play Type
    let playType = "Pass";
    if (statement.toLowerCase().startsWith("penalty")) playType = "Penalty";
    else if (statement.toLowerCase().includes("run") && !statement.toLowerCase().includes("pass")) playType = "Run";
    else if (statement.toLowerCase().includes("sacked")) playType = "Pass";

    let qb = null;
    let rec = null;
    let runner = null;
    let passOutcome = undefined;
    let isTD = false;
    let isPick6 = false;
    let isSafety = false;
    let firstDown = false;
    let turnover = false;
    let defenders = [];
    let flaggers = [];
    let points = 0;

    // Check Halftime marker
    if (statement.includes("HALFTIME")) {
      half = 2;
    }

    // Pass details
    if (playType === "Pass") {
      if (statement.toLowerCase().includes("sonia cabral")) qb = "Sonia Cabral";
      else qb = "Unknown QB";

      if (statement.includes("for a TOUCHDOWN!")) {
        isTD = true;
        points = 6;
        passOutcome = "Complete";
      } else if (statement.includes("for a FIRST DOWN")) {
        firstDown = true;
        passOutcome = "Complete";
      } else if (statement.includes("pass complete")) {
        passOutcome = "Complete";
      } else if (statement.includes("broken up by")) {
        passOutcome = "PBU";
      } else if (statement.includes("intercepted by")) {
        passOutcome = "Interception";
        turnover = true;
        if (statement.includes("Pick 6") || statement.includes("PICK 6")) {
          isPick6 = true;
          isTD = true;
          points = 6;
        }
      } else if (statement.includes("sacked by")) {
        passOutcome = "Sack";
        if (statement.includes("SAFETY!")) {
          isSafety = true;
          points = 2;
        }
      } else if (statement.includes("incomplete/missed") || statement.includes("incomplete")) {
        passOutcome = "Incomplete";
      }

      // Receiver extraction
      const recMatch = statement.match(/complete to ([A-Z\s\-]+?)(?: for|\s*\(Flagged|\s*\(Short\)|$)/i);
      if (recMatch) {
        const rawRec = recMatch[1].trim();
        if (rawRec && rawRec !== "null" && rawRec !== "undefined") {
          rec = titleCase(rawRec);
        }
      }
    }

    // Run details
    if (playType === "Run") {
      const runnerMatch = statement.match(/^([A-Z\s\-]+?) run/i);
      if (runnerMatch) {
        runner = titleCase(runnerMatch[1].trim());
      } else if (statement.includes("Unknown Runner")) {
        runner = "Unknown Runner";
      } else {
        runner = isYorkPossession ? "York Runner" : "Opponent Runner";
      }

      if (statement.includes("for a TOUCHDOWN!")) {
        isTD = true;
        points = 6;
      }
      if (statement.includes("for a FIRST DOWN")) {
        firstDown = true;
      }
      if (statement.includes("flagged for loss")) {
        passOutcome = "FFL";
      }
    }

    // Penalty details
    if (playType === "Penalty") {
      if (statement.includes("for a FIRST DOWN")) {
        firstDown = true;
      }
    }

    // Defender extraction
    const flagMatch = statement.match(/\(Flagged by ([^)]+)\)/i);
    if (flagMatch) {
      const parts = flagMatch[1].split(/\band\b|,/i).map(s => titleCase(s.trim())).filter(Boolean);
      flaggers.push(...parts);
      defenders.push(...parts);
    }
    const lossMatch = statement.match(/flagged for loss by ([A-Z\s\-]+?)(?:\s*\(Short\)|$)/i);
    if (lossMatch) {
      const p = titleCase(lossMatch[1].trim());
      flaggers.push(p);
      defenders.push(p);
    }
    const pbuMatch = statement.match(/broken up by ([A-Z\s\-]+?)(?:\s*\(Next Down\)|$)/i);
    if (pbuMatch) {
      defenders.push(titleCase(pbuMatch[1].trim()));
    }
    const intMatch = statement.match(/intercepted by ([A-Z\s\-]+?)(?: for|\s*\(Turnover\)|\s*\(HALFTIME\)|$)/i);
    if (intMatch) {
      defenders.push(titleCase(intMatch[1].trim()));
    }
    const sackMatch = statement.match(/sacked by ([A-Z\s\-]+?)(?: for|\s*\(Short\)|$)/i);
    if (sackMatch) {
      defenders.push(titleCase(sackMatch[1].trim()));
    }

    // Conversion details
    let isConversion = false;
    let conversionSuccess = false;
    let conversionPts = null;
    let conversionPasser = null;
    let conversionReceiver = null;
    let conversionRunner = null;

    if (convLine) {
      isConversion = true;
      if (convLine.includes("1-PT")) conversionPts = 1;
      else if (convLine.includes("2-PT")) conversionPts = 2;

      if (convLine.includes("GOOD")) {
        conversionSuccess = true;
        points += (conversionPts || 1);

        const passConvMatch = convLine.match(/pass to ([A-Z\s\-]+)$/i);
        if (passConvMatch) {
          conversionPasser = "Sonia Cabral";
          conversionReceiver = titleCase(passConvMatch[1].trim());
        } else if (convLine.includes("run")) {
          conversionRunner = isYorkPossession ? "York Runner" : "Opponent Runner";
        }
      } else {
        conversionSuccess = false;
      }
    }

    // Deduplicate defenders & flaggers
    defenders = Array.from(new Set(defenders.filter(d => d && d !== "Unknown" && d !== "Null")));
    flaggers = Array.from(new Set(flaggers.filter(d => d && d !== "Unknown" && d !== "Null")));

    // Clean statement
    let cleanStatement = statement;
    if (convLine) {
      cleanStatement += `\n${convLine}`;
    }

    const playObj = {
      id: `play_${game.matchId}_${idx + 1}`,
      matchId: game.matchId,
      possessionTeamId: posTeamId,
      down,
      playType,
      qbPlayerId: qb,
      receiverPlayerId: rec,
      runnerPlayerId: runner,
      passOutcome,
      isTouchdown: isTD,
      isPick6,
      isSafety,
      firstDown,
      turnover,
      points,
      pointsScored: points,
      isConversion,
      conversionSuccess,
      conversionPts,
      conversionPasser,
      conversionReceiver,
      conversionRunner,
      defenders,
      flaggers,
      result: isTD ? (isPick6 ? "Pick 6 Touchdown" : "Touchdown") : isSafety ? "Safety" : firstDown ? "First Down" : turnover ? "Turnover" : "Play",
      playStatement: cleanStatement,
      half,
      timestamp: new Date(new Date(game.date).getTime() + idx * 45000).toISOString(),
    };

    parsedPlays.push(playObj);
  }

  return parsedPlays;
}

const allPlays = [];
const matches = [];

Object.entries(rawGames).forEach(([key, g], gIdx) => {
  const pList = parseBlocks(key, g);
  allPlays.push(...pList);

  matches.push({
    id: g.matchId,
    week: g.week,
    homeTeamName: g.isYorkHome ? "York Lions Women's Flag Football" : g.opponent,
    awayTeamName: g.isYorkHome ? g.opponent : "York Lions Women's Flag Football",
    homeTeamId: g.isYorkHome ? "york_lions" : g.opponentId,
    awayTeamId: g.isYorkHome ? g.opponentId : "york_lions",
    date: g.date,
    time: g.time,
    location: "Field 1",
    status: "completed",
    homeScore: g.isYorkHome ? g.homeScore : g.awayScore,
    awayScore: g.isYorkHome ? g.awayScore : g.homeScore,
    matchdayIndex: gIdx + 1,
    order: gIdx + 1,
    isIndependent: true,
    isAsyncStatKeeping: true,
    managingTeamId: "york_lions",
    roster: {
      home: g.isYorkHome ? ["Sonia Cabral", "Tizana Sutharsan", "Charlette Dewaepenaere", "Cameron Sears", "Tehya Castro", "Alexa Tomines-Rivera", "Jordyn Pemberton", "Isabelle Verstraten", "Isabella Achoneftos", "Emilie Eslamian", "Alexxandria Olivier", "Shavannah Walker", "Emma Giangrosso", "Malika Babur", "Giovanna Scountrianos"] : [`${g.opponent} QB`, `${g.opponent} WR`, `${g.opponent} DB`],
      away: g.isYorkHome ? [`${g.opponent} QB`, `${g.opponent} WR`, `${g.opponent} DB`] : ["Sonia Cabral", "Tizana Sutharsan", "Charlette Dewaepenaere", "Cameron Sears", "Tehya Castro", "Alexa Tomines-Rivera", "Jordyn Pemberton", "Isabelle Verstraten", "Isabella Achoneftos", "Emilie Eslamian", "Alexxandria Olivier", "Shavannah Walker", "Emma Giangrosso", "Malika Babur", "Giovanna Scountrianos"]
    }
  });
});

console.log(`Successfully generated ${matches.length} matches and ${allPlays.length} plays!`);
fs.writeFileSync("scripts/parsedOutput.json", JSON.stringify({ matches, allPlays }, null, 2));
