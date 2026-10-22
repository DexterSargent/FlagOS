import { describe, it, expect } from "vitest";

describe("Box Score and Play-by-Play Stat Accuracy Suite", () => {
  // Helper to run the box score calculation algorithm used by ViewerView and AsyncPlayByPlayManager
  function computeBoxScore(plays: any[], homeTeamId: string, awayTeamId: string, targetTeamId: string) {
    const statsMap: Record<string, any> = {};
    const initPlayer = (name: string) => {
      if (!statsMap[name]) {
        statsMap[name] = {
          name,
          inferredTeam: null,
          passAtt: 0,
          passComp: 0,
          passTD: 0,
          passInt: 0,
          passFD: 0,
          receptions: 0,
          recTD: 0,
          recFD: 0,
          rushAtt: 0,
          rushTD: 0,
          rushFD: 0,
          convPass: 0,
          convRec: 0,
          flagPulls: 0,
          sacks: 0,
          ffl: 0,
          int: 0,
          defTD: 0,
          pbu: 0,
          safeties: 0,
        };
      }
    };

    plays.forEach((play) => {
      const offTeam = play.possessionTeamId;
      const defTeam = offTeam === homeTeamId ? awayTeamId : homeTeamId;

      const isConversionPlay = Boolean(
        play.isConversion === true ||
        play.playType === "Conversion" ||
        (!play.isTouchdown && (
          (play.conversionAttempt !== undefined && play.conversionAttempt !== null) ||
          play.conversionSuccess === true
        ))
      );

      // Passing
      if (play.playType === "Pass" && (play.qbPlayerId || play.passer) && !isConversionPlay) {
        const qb = play.qbPlayerId || play.passer;
        initPlayer(qb);
        statsMap[qb].inferredTeam = offTeam;
        statsMap[qb].passAtt += 1;
        if (play.passOutcome === "Complete") statsMap[qb].passComp += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[qb].passTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") {
          statsMap[qb].passFD += 1;
        }
        if (play.passOutcome === "Interception") statsMap[qb].passInt += 1;
      }

      // Receiving
      if (play.playType === "Pass" && play.passOutcome === "Complete" && (play.receiverPlayerId || play.receiver) && !isConversionPlay) {
        const rec = play.receiverPlayerId || play.receiver;
        initPlayer(rec);
        statsMap[rec].inferredTeam = offTeam;
        statsMap[rec].receptions += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[rec].recTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") {
          statsMap[rec].recFD += 1;
        }
      }

      // Rushing
      if (play.playType === "Run" && (play.runnerPlayerId || play.ballCarrierPlayerId) && !isConversionPlay) {
        const runner = play.runnerPlayerId || play.ballCarrierPlayerId;
        initPlayer(runner);
        statsMap[runner].inferredTeam = offTeam;
        statsMap[runner].rushAtt += 1;
        if (play.isTouchdown || play.result === "Touchdown") statsMap[runner].rushTD += 1;
        if (play.firstDown || play.result === "First Down" || play.isTouchdown || play.result === "Touchdown") {
          statsMap[runner].rushFD += 1;
        }
      }

      // Conversions
      if (isConversionPlay) {
        if (play.conversionSuccess || play.passOutcome === "Complete" || (play.points && play.points > 0)) {
          const passer = play.conversionPasser || play.qbPlayerId || play.passer;
          const receiver = play.conversionReceiver || play.receiverPlayerId || play.receiver;
          const runner = play.conversionRunner || play.runnerPlayerId || play.ballCarrierPlayerId;
          if (play.playType === "Pass") {
            if (passer) {
              initPlayer(passer);
              statsMap[passer].inferredTeam = offTeam;
              statsMap[passer].convPass += 1;
            }
            if (receiver) {
              initPlayer(receiver);
              statsMap[receiver].inferredTeam = offTeam;
              statsMap[receiver].convRec += 1;
            }
          } else if (play.playType === "Run") {
            if (runner) {
              initPlayer(runner);
              statsMap[runner].inferredTeam = offTeam;
              statsMap[runner].convRec += 1;
            }
          } else {
            if (passer) {
              initPlayer(passer);
              statsMap[passer].inferredTeam = offTeam;
              statsMap[passer].convPass += 1;
            }
            if (receiver) {
              initPlayer(receiver);
              statsMap[receiver].inferredTeam = offTeam;
              statsMap[receiver].convRec += 1;
            }
          }
        }
      } else if (play.conversionSuccess) {
        if (play.conversionPasser) {
          initPlayer(play.conversionPasser);
          statsMap[play.conversionPasser].inferredTeam = offTeam;
          statsMap[play.conversionPasser].convPass += 1;
        }
        if (play.conversionReceiver) {
          initPlayer(play.conversionReceiver);
          statsMap[play.conversionReceiver].inferredTeam = offTeam;
          statsMap[play.conversionReceiver].convRec += 1;
        }
        if (play.conversionRunner) {
          initPlayer(play.conversionRunner);
          statsMap[play.conversionRunner].inferredTeam = offTeam;
          statsMap[play.conversionRunner].convRec += 1;
        }
      }

      // Defense
      if (play.defenders && Array.isArray(play.defenders)) {
        play.defenders.forEach((defenderName: string) => {
          initPlayer(defenderName);
          statsMap[defenderName].inferredTeam = defTeam;
          if (play.passOutcome === "Interception") {
            statsMap[defenderName].int += 1;
            if (play.isPick6 || play.result === "Pick 6") statsMap[defenderName].defTD += 1;
          } else if (play.passOutcome === "PBU") {
            statsMap[defenderName].pbu += 1;
          } else if (play.passOutcome === "Sack") {
            statsMap[defenderName].sacks += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety || play.result === "Safety") statsMap[defenderName].safeties += 1;
          } else if (play.passOutcome === "FFL") {
            statsMap[defenderName].ffl += 1;
            statsMap[defenderName].flagPulls += 1;
            if (play.isSafety || play.result === "Safety") statsMap[defenderName].safeties += 1;
          } else {
            statsMap[defenderName].flagPulls += 1;
          }
        });
      }

      // Flaggers (offense on interception return or special coverage)
      if (play.flaggers && Array.isArray(play.flaggers)) {
        play.flaggers.forEach((flaggerName: string) => {
          initPlayer(flaggerName);
          const flaggerTeam = play.passOutcome === "Interception" ? offTeam : defTeam;
          statsMap[flaggerName].inferredTeam = flaggerTeam;
          statsMap[flaggerName].flagPulls += 1;
        });
      }

      if (play.defFlagPullPlayerId) {
        initPlayer(play.defFlagPullPlayerId);
        statsMap[play.defFlagPullPlayerId].inferredTeam = defTeam;
        statsMap[play.defFlagPullPlayerId].flagPulls += 1;
      }
      if (play.interceptorPlayerId) {
        initPlayer(play.interceptorPlayerId);
        statsMap[play.interceptorPlayerId].inferredTeam = defTeam;
        statsMap[play.interceptorPlayerId].int += 1;
        if (play.isPick6 || play.result === "Pick 6") statsMap[play.interceptorPlayerId].defTD += 1;
      }
    });

    return Object.values(statsMap).filter((s) => s.inferredTeam === targetTeamId);
  }

  it("accurately tracks complete pass, receiving stats, and flag pull", () => {
    const plays = [
      {
        possessionTeamId: "team_home",
        playType: "Pass",
        qbPlayerId: "Alice",
        receiverPlayerId: "Bob",
        passOutcome: "Complete",
        firstDown: true,
        defenders: ["Eve"],
      },
    ];

    const homeStats = computeBoxScore(plays, "team_home", "team_away", "team_home");
    const awayStats = computeBoxScore(plays, "team_home", "team_away", "team_away");

    const alice = homeStats.find((p) => p.name === "Alice");
    const bob = homeStats.find((p) => p.name === "Bob");
    const eve = awayStats.find((p) => p.name === "Eve");

    expect(alice).toMatchObject({ passAtt: 1, passComp: 1, passTD: 0, passFD: 1, passInt: 0 });
    expect(bob).toMatchObject({ receptions: 1, recTD: 0, recFD: 1 });
    expect(eve).toMatchObject({ flagPulls: 1, sacks: 0, pbu: 0, int: 0 });
  });

  it("accurately tracks passing touchdown and subsequent PAT conversion", () => {
    const plays = [
      {
        possessionTeamId: "team_home",
        playType: "Pass",
        qbPlayerId: "Alice",
        receiverPlayerId: "Bob",
        passOutcome: "Complete",
        isTouchdown: true,
        firstDown: true,
        conversionAttempt: 1,
        conversionSuccess: true,
        conversionPasser: "Alice",
        conversionReceiver: "Charlie",
      },
    ];

    const homeStats = computeBoxScore(plays, "team_home", "team_away", "team_home");
    const alice = homeStats.find((p) => p.name === "Alice");
    const bob = homeStats.find((p) => p.name === "Bob");
    const charlie = homeStats.find((p) => p.name === "Charlie");

    expect(alice).toMatchObject({ passAtt: 1, passComp: 1, passTD: 1, passFD: 1, convPass: 1 });
    expect(bob).toMatchObject({ receptions: 1, recTD: 1, recFD: 1 });
    expect(charlie).toMatchObject({ convRec: 1 });
  });

  it("accurately tracks rush attempts, rush TDs, and rush first downs", () => {
    const plays = [
      {
        possessionTeamId: "team_home",
        playType: "Run",
        runnerPlayerId: "Dan",
        firstDown: true,
        isTouchdown: false,
        defenders: ["Eve"],
      },
      {
        possessionTeamId: "team_home",
        playType: "Run",
        runnerPlayerId: "Dan",
        firstDown: true,
        isTouchdown: true,
      },
    ];

    const homeStats = computeBoxScore(plays, "team_home", "team_away", "team_home");
    const dan = homeStats.find((p) => p.name === "Dan");

    expect(dan).toMatchObject({
      rushAtt: 2,
      rushTD: 1,
      rushFD: 2,
    });
  });

  it("accurately tracks sacks and safeties", () => {
    const plays = [
      {
        possessionTeamId: "team_away",
        playType: "Pass",
        qbPlayerId: "Zack",
        passOutcome: "Sack",
        isSafety: true,
        result: "Safety",
        defenders: ["Alice"],
      },
    ];

    const homeStats = computeBoxScore(plays, "team_home", "team_away", "team_home");
    const alice = homeStats.find((p) => p.name === "Alice");

    expect(alice).toMatchObject({
      sacks: 1,
      flagPulls: 1,
      safeties: 1,
    });
  });

  it("accurately tracks PBUs (Pass Break Ups)", () => {
    const plays = [
      {
        possessionTeamId: "team_home",
        playType: "Pass",
        qbPlayerId: "Alice",
        passOutcome: "PBU",
        defenders: ["Eve"],
      },
    ];

    const awayStats = computeBoxScore(plays, "team_home", "team_away", "team_away");
    const eve = awayStats.find((p) => p.name === "Eve");

    expect(eve).toMatchObject({
      pbu: 1,
      flagPulls: 0,
      sacks: 0,
      int: 0,
    });
  });

  it("accurately tracks interceptions and Pick 6 defensive touchdowns", () => {
    const plays = [
      // Regular INT with offensive flag pull on the return
      {
        possessionTeamId: "team_home",
        playType: "Pass",
        qbPlayerId: "Alice",
        passOutcome: "Interception",
        defenders: ["Eve"],
        flaggers: ["Bob"],
        result: "Turnover",
      },
      // Pick 6
      {
        possessionTeamId: "team_home",
        playType: "Pass",
        qbPlayerId: "Alice",
        passOutcome: "Interception",
        defenders: ["Frank"],
        isPick6: true,
        result: "Pick 6",
      },
    ];

    const homeStats = computeBoxScore(plays, "team_home", "team_away", "team_home");
    const awayStats = computeBoxScore(plays, "team_home", "team_away", "team_away");

    const alice = homeStats.find((p) => p.name === "Alice");
    const bob = homeStats.find((p) => p.name === "Bob");
    const eve = awayStats.find((p) => p.name === "Eve");
    const frank = awayStats.find((p) => p.name === "Frank");

    expect(alice).toMatchObject({ passAtt: 2, passInt: 2 });
    expect(bob).toMatchObject({ flagPulls: 1 });
    expect(eve).toMatchObject({ int: 1, defTD: 0 });
    expect(frank).toMatchObject({ int: 1, defTD: 1 });
  });

  it("accurately tracks Flag For Loss (FFL)", () => {
    const plays = [
      {
        possessionTeamId: "team_home",
        playType: "Run",
        runnerPlayerId: "Dan",
        passOutcome: "FFL",
        defenders: ["Eve"],
      },
    ];

    const awayStats = computeBoxScore(plays, "team_home", "team_away", "team_away");
    const eve = awayStats.find((p) => p.name === "Eve");

    expect(eve).toMatchObject({
      ffl: 1,
      flagPulls: 1,
      sacks: 0,
    });
  });
});
