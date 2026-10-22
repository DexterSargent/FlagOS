import { describe, it, expect } from "vitest";
import { calculateTeamComprehensiveStats } from "@/lib/teamStatsCalculator";

describe("Full Game Play-by-Play Wizard & Box Score End-to-End Audit", () => {
  const homeTeamId = "team_alpha";
  const awayTeamId = "team_beta";
  const homeTeamName = "Alpha Predators";
  const awayTeamName = "Beta Knights";

  const homeRoster = ["Alex (QB)", "Ben (WR)", "Chris (WR)", "David (RB)", "Ethan (ATH)"];
  const awayRoster = ["Frank (QB)", "George (WR)", "Hank (DB)", "Ian (DB)", "Jack (Rusher)"];

  function runBoxScoreAggregation(plays: any[], teamId: string) {
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
        (!play.isTouchdown && !play.isPick6 && play.result !== "Pick 6" && (
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

      // Flaggers on Interception
      if (play.flaggers && Array.isArray(play.flaggers)) {
        play.flaggers.forEach((flaggerName: string) => {
          initPlayer(flaggerName);
          const flaggerTeam = play.passOutcome === "Interception" ? offTeam : defTeam;
          statsMap[flaggerName].inferredTeam = flaggerTeam;
          statsMap[flaggerName].flagPulls += 1;
        });
      }
    });

    return Object.values(statsMap).filter((s) => s.inferredTeam === teamId);
  }

  it("accurately tracks all wizard selections through a simulated full game", () => {
    // Construct an authentic sequence of plays touching EVERY combination in the wizard
    const plays = [
      // PLAY 1: Complete pass for 1st down with tackle
      {
        id: "p1",
        possessionTeamId: homeTeamId,
        playType: "Pass",
        down: 1,
        qbPlayerId: "Alex (QB)",
        receiverPlayerId: "Ben (WR)",
        passOutcome: "Complete",
        result: "First Down",
        firstDown: true,
        defenders: ["Hank (DB)"],
      },
      // PLAY 2: Passing Touchdown + 1-Point PAT Conversion Good
      {
        id: "p2",
        possessionTeamId: homeTeamId,
        playType: "Pass",
        down: 1,
        qbPlayerId: "Alex (QB)",
        receiverPlayerId: "Chris (WR)",
        passOutcome: "Complete",
        result: "Touchdown",
        isTouchdown: true,
        firstDown: true,
        conversionAttempt: 1,
        conversionSuccess: true,
        conversionPasser: "Alex (QB)",
        conversionReceiver: "Ben (WR)",
        pointsScored: 7,
      },
      // PLAY 3: Run for 1st down with tackle
      {
        id: "p3",
        possessionTeamId: awayTeamId,
        playType: "Run",
        down: 1,
        runnerPlayerId: "George (WR)",
        passOutcome: "Gain",
        result: "First Down",
        firstDown: true,
        defenders: ["Ethan (ATH)"],
      },
      // PLAY 4: Rushing Touchdown + 2-Point PAT Conversion Good
      {
        id: "p4",
        possessionTeamId: awayTeamId,
        playType: "Run",
        down: 1,
        runnerPlayerId: "George (WR)",
        passOutcome: "Gain",
        result: "Touchdown",
        isTouchdown: true,
        firstDown: true,
        conversionAttempt: 2,
        conversionSuccess: true,
        conversionPasser: "Frank (QB)",
        conversionReceiver: "George (WR)",
        pointsScored: 8,
      },
      // PLAY 5: Incomplete Pass - Pass Break Up (PBU)
      {
        id: "p5",
        possessionTeamId: homeTeamId,
        playType: "Pass",
        down: 1,
        qbPlayerId: "Alex (QB)",
        passOutcome: "PBU",
        result: "Next Down",
        defenders: ["Hank (DB)"],
      },
      // PLAY 6: Interception with Return Tackle (flaggers)
      {
        id: "p6",
        possessionTeamId: homeTeamId,
        playType: "Pass",
        down: 2,
        qbPlayerId: "Alex (QB)",
        passOutcome: "Interception",
        result: "Turnover",
        defenders: ["Ian (DB)"],
        flaggers: ["Ben (WR)"],
      },
      // PLAY 7: Pick 6 (Interception Return for Touchdown)
      {
        id: "p7",
        possessionTeamId: awayTeamId,
        playType: "Pass",
        down: 1,
        qbPlayerId: "Frank (QB)",
        passOutcome: "Interception",
        result: "Pick 6",
        isPick6: true,
        defenders: ["Ethan (ATH)"],
        conversionAttempt: 1,
        conversionSuccess: false,
        pointsScored: 6,
      },
      // PLAY 8: Rusher Sack with Safety (2 points)
      {
        id: "p8",
        possessionTeamId: awayTeamId,
        playType: "Pass",
        down: 1,
        qbPlayerId: "Frank (QB)",
        passOutcome: "Sack",
        result: "Safety",
        isSafety: true,
        defenders: ["David (RB)"], // David acting as rusher
        pointsScored: 2,
      },
      // PLAY 9: Flag For Loss (FFL) behind line of scrimmage
      {
        id: "p9",
        possessionTeamId: homeTeamId,
        playType: "Run",
        down: 1,
        runnerPlayerId: "David (RB)",
        passOutcome: "FFL",
        result: "Short",
        defenders: ["Jack (Rusher)"],
      },
      // PLAY 10: Accepted Penalty on Offense
      {
        id: "p10",
        possessionTeamId: homeTeamId,
        playType: "Penalty",
        down: 2,
        penaltyTeam: "offense",
        penaltyType: "False Start",
        penaltyYards: 5,
        penaltyEnforcement: "accepted",
        penaltyDownResult: "repeat_down",
        penaltyPlayer: "Ben (WR)",
      },
      // PLAY 11: Accepted Penalty on Defense
      {
        id: "p11",
        possessionTeamId: homeTeamId,
        playType: "Penalty",
        down: 2,
        penaltyTeam: "defense",
        penaltyType: "Offside",
        penaltyYards: 5,
        penaltyEnforcement: "accepted",
        penaltyDownResult: "automatic_first_down",
        firstDown: true,
      },
    ];

    // Compute box score for Home Team (Alpha Predators)
    const homeBox = runBoxScoreAggregation(plays, homeTeamId);

    // 1. Alex (QB):
    // Plays 1 (comp, 1st down), 2 (comp, TD, 1st down, convPass 1), 5 (PBU, att), 6 (INT, att)
    // Totals: 4 att, 2 comp, 1 passTD, 2 passFD, 1 passInt, 1 convPass
    const alex = homeBox.find((p) => p.name === "Alex (QB)");
    expect(alex).toBeDefined();
    expect(alex.passAtt).toBe(4);
    expect(alex.passComp).toBe(2);
    expect(alex.passTD).toBe(1);
    expect(alex.passFD).toBe(2);
    expect(alex.passInt).toBe(1);
    expect(alex.convPass).toBe(1);

    // 2. Ben (WR):
    // Play 1 (rec, 1st down), Play 2 (convRec 1), Play 6 (flagger on INT return)
    const ben = homeBox.find((p) => p.name === "Ben (WR)");
    expect(ben).toBeDefined();
    expect(ben.receptions).toBe(1);
    expect(ben.recTD).toBe(0);
    expect(ben.recFD).toBe(1);
    expect(ben.convRec).toBe(1);
    expect(ben.flagPulls).toBe(1); // Tackled interceptor on return

    // 3. Chris (WR):
    // Play 2: Caught Touchdown!
    const chris = homeBox.find((p) => p.name === "Chris (WR)");
    expect(chris).toBeDefined();
    expect(chris.receptions).toBe(1);
    expect(chris.recTD).toBe(1);
    expect(chris.recFD).toBe(1);

    // 4. David (RB):
    // Play 8: Sacked Frank (QB) for a Safety! (sacks: 1, flagPulls: 1, safeties: 1)
    // Play 9: Had 1 rush attempt (rushAtt: 1)
    const david = homeBox.find((p) => p.name === "David (RB)");
    expect(david).toBeDefined();
    expect(david.sacks).toBe(1);
    expect(david.flagPulls).toBe(1);
    expect(david.safeties).toBe(1);
    expect(david.rushAtt).toBe(1);

    // 5. Ethan (ATH):
    // Play 3: Flag pull on George (flagPulls: 1)
    // Play 7: Pick 6! (int: 1, defTD: 1)
    const ethan = homeBox.find((p) => p.name === "Ethan (ATH)");
    expect(ethan).toBeDefined();
    expect(ethan.flagPulls).toBe(1);
    expect(ethan.int).toBe(1);
    expect(ethan.defTD).toBe(1);

    // Compute box score for Away Team (Beta Knights)
    const awayBox = runBoxScoreAggregation(plays, awayTeamId);

    // 6. Frank (QB):
    // Play 7: Threw INT (Pick 6) (passAtt: 1, passInt: 1)
    // Play 8: Sacked (passAtt: 1)
    // Play 4: Conversion Passer for 2-pt PAT (convPass: 1)
    const frank = awayBox.find((p) => p.name === "Frank (QB)");
    expect(frank).toBeDefined();
    expect(frank.passAtt).toBe(2);
    expect(frank.passInt).toBe(1);
    expect(frank.convPass).toBe(1);

    // 7. George (WR/Runner):
    // Play 3: Rush for 1st down (rushAtt: 1, rushFD: 1)
    // Play 4: Rush for TD & 1st down (rushAtt: 1, rushTD: 1, rushFD: 1) + caught 2-pt conv (convRec: 1)
    const george = awayBox.find((p) => p.name === "George (WR)");
    expect(george).toBeDefined();
    expect(george.rushAtt).toBe(2);
    expect(george.rushTD).toBe(1);
    expect(george.rushFD).toBe(2);
    expect(george.convRec).toBe(1);

    // 8. Hank (DB):
    // Play 1: Flag pull on Ben (flagPulls: 1)
    // Play 5: PBU on Alex's pass (pbu: 1)
    const hank = awayBox.find((p) => p.name === "Hank (DB)");
    expect(hank).toBeDefined();
    expect(hank.flagPulls).toBe(1);
    expect(hank.pbu).toBe(1);

    // 9. Ian (DB):
    // Play 6: Intercepted Alex! (int: 1)
    const ian = awayBox.find((p) => p.name === "Ian (DB)");
    expect(ian).toBeDefined();
    expect(ian.int).toBe(1);
    expect(ian.defTD).toBe(0);

    // 10. Jack (Rusher):
    // Play 9: Flag For Loss (FFL) on David (ffl: 1, flagPulls: 1)
    const jack = awayBox.find((p) => p.name === "Jack (Rusher)");
    expect(jack).toBeDefined();
    expect(jack.ffl).toBe(1);
    expect(jack.flagPulls).toBe(1);

    // Verify comprehensive team stats calculation
    const mockMatch = {
      id: "match_audit_1",
      status: "completed",
      homeTeamId,
      awayTeamId,
      homeTeamName,
      awayTeamName,
      homeScore: 15, // 7 (TD+1pt) + 6 (Pick 6) + 2 (Safety)
      awayScore: 8,  // 8 (TD+2pt)
    };

    const homeTeamStats = calculateTeamComprehensiveStats(homeTeamId, [mockMatch], plays, {
      teamName: homeTeamName,
    });

    expect(homeTeamStats.passTDs).toBe(1);
    expect(homeTeamStats.defTDs).toBe(1);
    expect(homeTeamStats.safeties).toBe(1);
    expect(homeTeamStats.pat1Attempts).toBe(1);
    expect(homeTeamStats.pat1Conversions).toBe(1);
    expect(homeTeamStats.interceptions).toBe(1); // Ethan's pick 6

    const awayTeamStats = calculateTeamComprehensiveStats(awayTeamId, [mockMatch], plays, {
      teamName: awayTeamName,
    });

    expect(awayTeamStats.rushTDs).toBe(1);
    expect(awayTeamStats.pat2Attempts).toBe(1);
    expect(awayTeamStats.pat2Conversions).toBe(1);
    expect(awayTeamStats.interceptions).toBe(1); // Ian's interception
    expect(awayTeamStats.pbus).toBe(1);         // Hank's PBU
  });
});
