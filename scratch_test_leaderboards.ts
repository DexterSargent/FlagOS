import { SEED_DEMO_MATCHES, SEED_DEMO_PLAYERS, SEED_DEMO_TEAMS, DemoPlay, DemoMatch } from './src/lib/demoSeedData';
import { generatePlaysForMatch } from './scratch_test_generator';

const allGeneratedPlays: DemoPlay[] = [];
const completed = SEED_DEMO_MATCHES.filter(m => m.status === 'completed');
completed.forEach(m => {
  const p = generatePlaysForMatch(m);
  allGeneratedPlays.push(...p);
});

// Aggregate stats exactly as src/app/stats/page.tsx does
const statsMap: Record<string, any> = {};
SEED_DEMO_PLAYERS.forEach(p => {
  statsMap[p.playerName] = {
    name: p.playerName,
    teamId: p.teamId,
    gamesPlayed: 0,
    passAtt: 0,
    passComp: 0,
    passTD: 0,
    passInt: 0,
    receptions: 0,
    recTD: 0,
    rushAtt: 0,
    rushTD: 0,
    flagPulls: 0,
    sacks: 0,
    int: 0,
    pbu: 0,
    convPass: 0,
    convRec: 0,
    totalTDs: 0,
  };
});

// Plays aggregation
allGeneratedPlays.forEach(play => {
  const isEligible = (name: string) => name && statsMap[name];

  if (play.playType === "Pass" && isEligible(play.qbPlayerId)) {
    statsMap[play.qbPlayerId].passAtt += 1;
    if (play.passOutcome === "Complete") {
      statsMap[play.qbPlayerId].passComp += 1;
    } else if (play.passOutcome === "Interception") {
      statsMap[play.qbPlayerId].passInt += 1;
    }

    if (play.isTouchdown) {
      statsMap[play.qbPlayerId].passTD += 1;
      statsMap[play.qbPlayerId].totalTDs += 1;
    }
    if (play.isConversion) {
      statsMap[play.qbPlayerId].convPass += 1;
    }
  }

  if (play.playType === "Pass" && play.passOutcome === "Complete" && isEligible(play.receiverPlayerId)) {
    statsMap[play.receiverPlayerId].receptions += 1;
    if (play.isTouchdown) {
      statsMap[play.receiverPlayerId].recTD += 1;
      statsMap[play.receiverPlayerId].totalTDs += 1;
    }
    if (play.isConversion) {
      statsMap[play.receiverPlayerId].convRec += 1;
    }
  }

  if (play.playType === "Run" && isEligible(play.runnerPlayerId)) {
    statsMap[play.runnerPlayerId].rushAtt += 1;
    if (play.isTouchdown) {
      statsMap[play.runnerPlayerId].rushTD += 1;
      statsMap[play.runnerPlayerId].totalTDs += 1;
    }
  }

  if (play.defenders && Array.isArray(play.defenders)) {
    play.defenders.forEach((defenderName: string) => {
      if (!isEligible(defenderName)) return;

      if (play.passOutcome === "Interception") {
        statsMap[defenderName].int += 1;
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

  if (play.flaggers && Array.isArray(play.flaggers)) {
    play.flaggers.forEach((flaggerName: string) => {
      if (isEligible(flaggerName)) {
        statsMap[flaggerName].flagPulls += 1;
      }
    });
  }
});

const allStats = Object.values(statsMap);

console.log('\n--- TOP 5 PASSING LEADERS (TDs) ---');
allStats.sort((a, b) => b.passTD - a.passTD).slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${p.passTD} TDs, ${p.passComp}/${p.passAtt} (${((p.passComp/p.passAtt)*100).toFixed(1)}%), ${p.passInt} INT, ${p.convPass} 1/2-PT`);
});

console.log('\n--- TOP 5 RECEIVING LEADERS (TDs) ---');
allStats.sort((a, b) => b.recTD - a.recTD).slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${p.recTD} TDs, ${p.receptions} Rec, ${p.convRec} Conv`);
});

console.log('\n--- TOP 5 RUSHING LEADERS (TDs) ---');
allStats.sort((a, b) => b.rushTD - a.rushTD).slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${p.rushTD} Rush TDs, ${p.rushAtt} Rush Att`);
});

console.log('\n--- TOP 5 DEFENSIVE SACK LEADERS ---');
allStats.sort((a, b) => b.sacks - a.sacks).slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${p.sacks} Sacks, ${p.flagPulls} Flag Pulls`);
});

console.log('\n--- TOP 5 DEFENSIVE INT LEADERS ---');
allStats.sort((a, b) => b.int - a.int).slice(0, 5).forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${p.int} INTs, ${p.pbu} PBUs, ${p.flagPulls} Flag Pulls`);
});
