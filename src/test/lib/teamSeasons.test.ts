import { describe, expect, it } from "vitest";
import {
  buildTeamCareerSummaries,
  buildTeamSeasonSnapshot,
  getCurrentTeamSeasonId,
  getTeamSeasons,
  teamSeasonSnapshotDocId,
} from "@/lib/teamSeasons";
import { INITIAL_SEASON_ID } from "@/lib/leagueSeasons";

const samplePlayers = [
  { id: "p1", playerName: "Marcus Jones", number: "10" },
  { id: "p2", playerName: "Devin White", number: "24" },
  { id: "p3", playerName: "Chris Evans", number: "88" },
];

describe("getTeamSeasons", () => {
  it("defaults to initial season 1 when no seasons exist", () => {
    const seasons = getTeamSeasons({});
    expect(seasons).toEqual([
      { id: INITIAL_SEASON_ID, title: "Season 1", status: "active", number: 1 },
    ]);
    expect(getCurrentTeamSeasonId({})).toBe(INITIAL_SEASON_ID);
  });

  it("extracts and sorts existing team seasons, renaming active season with seasonTitle", () => {
    const seasons = getTeamSeasons({
      currentSeasonId: "season-2-xyz",
      seasonTitle: "Fall 2026 Championship Run",
      seasons: [
        { id: "season-2-xyz", title: "Fall 2026", status: "active", number: 2 },
        { id: "season-1", title: "Spring 2026", status: "archived", number: 1, won: 8, lost: 2, tied: 0, standing: "Champion" },
      ],
    });

    expect(seasons).toHaveLength(2);
    expect(seasons[0]).toMatchObject({ id: "season-1", status: "archived", number: 1, standing: "Champion" });
    expect(seasons[1]).toMatchObject({ id: "season-2-xyz", title: "Fall 2026 Championship Run", status: "active", number: 2 });
    expect(getCurrentTeamSeasonId({ seasons, currentSeasonId: "season-2-xyz" })).toBe("season-2-xyz");
  });
});

describe("buildTeamSeasonSnapshot", () => {
  it("computes team records, games played, point differential, and player stat lines accurately", () => {
    const matches = [
      { id: "m1", seasonId: "season-1", homeTeamId: "team_apex", awayTeamId: "team_rivals", homeScore: 28, awayScore: 14, status: "completed" },
      { id: "m2", seasonId: "season-1", homeTeamId: "team_rivals", awayTeamId: "team_apex", homeScore: 21, awayScore: 24, status: "completed" },
      { id: "m3", seasonId: "season-1", homeTeamId: "team_apex", awayTeamId: "team_rivals", homeScore: 14, awayScore: 20, status: "completed" },
      { id: "m4", seasonId: "season-2", homeTeamId: "team_apex", awayTeamId: "team_rivals", homeScore: 35, awayScore: 7, status: "completed" }, // diff season
    ];

    const plays = [
      // Marcus passes to Devin for TD
      { matchId: "m1", passer: "Marcus Jones", receiver: "Devin White", result: "Touchdown", isTouchdown: true },
      // Marcus rushes for TD
      { matchId: "m1", rusher: "Marcus Jones", result: "Touchdown", isTouchdown: true },
      // Chris flag pull
      { matchId: "m2", defender: "Chris Evans", result: "Flag Pull", isFlagPull: true },
      // Chris interception
      { matchId: "m3", defender: "Chris Evans", result: "Interception" },
    ];

    const snapshot = buildTeamSeasonSnapshot({
      teamId: "team_apex",
      teamName: "Apex Predators",
      shortcode: "APEX",
      season: { id: "season-1", title: "Spring 2026", status: "active", number: 1 },
      players: samplePlayers,
      matches,
      plays,
      isChampion: true,
    });

    expect(snapshot.teamId).toBe("team_apex");
    expect(snapshot.seasonId).toBe("season-1");
    expect(snapshot.won).toBe(2);
    expect(snapshot.lost).toBe(1);
    expect(snapshot.tied).toBe(0);
    expect(snapshot.pf).toBe(66); // 28 + 24 + 14
    expect(snapshot.pa).toBe(55); // 14 + 21 + 20
    expect(snapshot.diff).toBe(11);
    expect(snapshot.isChampion).toBe(true);
    expect(snapshot.results).toHaveLength(3);

    const marcus = snapshot.playerStats.find((p) => p.name === "Marcus Jones")!;
    expect(marcus.passAtt).toBe(1);
    expect(marcus.passComp).toBe(1);
    expect(marcus.passTD).toBe(1);
    expect(marcus.rushAtt).toBe(1);
    expect(marcus.rushTD).toBe(1);
    expect(marcus.totalTDs).toBe(2);
    expect(marcus.gamesPlayed).toBe(3);

    const devin = snapshot.playerStats.find((p) => p.name === "Devin White")!;
    expect(devin.receptions).toBe(1);
    expect(devin.recTD).toBe(1);
    expect(devin.totalTDs).toBe(1);

    const chris = snapshot.playerStats.find((p) => p.name === "Chris Evans")!;
    expect(chris.flagPulls).toBe(1);
    expect(chris.int).toBe(1);
  });

  it("generates correct snapshot document IDs", () => {
    expect(teamSeasonSnapshotDocId("team_apex", "season-1")).toBe("team_apex__season-1");
  });
});

describe("buildTeamCareerSummaries", () => {
  it("aggregates player statistics across multiple seasons into cumulative career lines", () => {
    const season1Snapshot = {
      teamId: "team_apex",
      seasonId: "season-1",
      title: "Season 1",
      number: 1,
      startedAt: "2026-01-01",
      endedAt: "2026-04-01",
      won: 8,
      lost: 2,
      tied: 0,
      pf: 200,
      pa: 120,
      diff: 80,
      pts: 16,
      gamesPlayed: 10,
      isChampion: true,
      results: [],
      playerStats: [
        {
          playerId: "p1",
          name: "Marcus Jones",
          number: "10",
          teamId: "team_apex",
          teamName: "Apex",
          teamShortcode: "APEX",
          gamesPlayed: 10,
          passAtt: 120,
          passComp: 80,
          passTD: 25,
          passInt: 4,
          receptions: 0,
          recTD: 0,
          rushAtt: 15,
          rushTD: 5,
          flagPulls: 2,
          sacks: 0,
          int: 0,
          defTD: 0,
          convPass: 0,
          convRec: 0,
          pbu: 0,
          safeties: 0,
          ffl: 0,
          totalTDs: 30,
        },
      ],
    };

    const liveStats = [
      {
        playerId: "p1",
        name: "Marcus Jones",
        number: "10",
        teamId: "team_apex",
        teamName: "Apex",
        teamShortcode: "APEX",
        gamesPlayed: 5,
        passAtt: 60,
        passComp: 45,
        passTD: 12,
        passInt: 1,
        receptions: 0,
        recTD: 0,
        rushAtt: 8,
        rushTD: 2,
        flagPulls: 1,
        sacks: 0,
        int: 0,
        defTD: 0,
        convPass: 0,
        convRec: 0,
        pbu: 0,
        safeties: 0,
        ffl: 0,
        totalTDs: 14,
      },
    ];

    const careers = buildTeamCareerSummaries(
      [season1Snapshot],
      liveStats,
      "Season 2",
      2,
      "season-2",
    );

    expect(careers).toHaveLength(1);
    const marcusCareer = careers[0];
    expect(marcusCareer.name).toBe("Marcus Jones");
    expect(marcusCareer.championships).toBe(1);
    expect(marcusCareer.totals.gamesPlayed).toBe(15);
    expect(marcusCareer.totals.passTD).toBe(37); // 25 + 12
    expect(marcusCareer.totals.rushTD).toBe(7); // 5 + 2
    expect(marcusCareer.totals.totalTDs).toBe(44); // 30 + 14
    expect(marcusCareer.seasons).toHaveLength(2);
  });
});

