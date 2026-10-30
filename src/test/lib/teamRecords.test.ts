import { describe, it, expect } from "vitest";
import { calculateTeamRecords } from "@/lib/teamRecords";
import { inflatePlayerLine } from "@/lib/leagueSeasons";
import type { TeamSeason, TeamSeasonSnapshot } from "@/lib/teamSeasons";

describe("calculateTeamRecords", () => {
  const teamId = "team_york_lions";
  const teamName = "York Lions";

  const seasons: TeamSeason[] = [
    { id: "s1", number: 1, title: "Season 1", status: "archived", won: 6, lost: 2, tied: 0, pf: 253, pa: 118 },
    { id: "s2", number: 2, title: "Season 2", status: "active", won: 3, lost: 0, tied: 0, pf: 95, pa: 42 },
  ];

  const snapshots: TeamSeasonSnapshot[] = [
    {
      teamId,
      seasonId: "s1",
      title: "Season 1",
      number: 1,
      endedAt: "2025-11-01",
      won: 6,
      lost: 2,
      tied: 0,
      pf: 253,
      pa: 118,
      diff: 135,
      pts: 12,
      gamesPlayed: 8,
      playerStats: [
        inflatePlayerLine({
          playerId: "p1",
          name: "Sarah Connor",
          number: "10",
          teamId,
          teamName,
          teamShortcode: "YORK",
          gamesPlayed: 8,
          passTD: 18,
          recTD: 0,
          rushTD: 2,
          totalTDs: 20,
          sacks: 0,
          int: 0,
          flagPulls: 12,
        }),
        inflatePlayerLine({
          playerId: "p2",
          name: "Maya Lin",
          number: "88",
          teamId,
          teamName,
          teamShortcode: "YORK",
          gamesPlayed: 8,
          passTD: 0,
          recTD: 12,
          rushTD: 1,
          totalTDs: 13,
          sacks: 6,
          int: 4,
          flagPulls: 34,
        }),
      ],
      results: [
        {
          id: "m_s1_1",
          date: "2025-09-10",
          homeTeamId: teamId,
          awayTeamId: "team_toros",
          homeTeamName: teamName,
          awayTeamName: "Toros",
          homeScore: 42,
          awayScore: 14,
          isPlayoff: false,
        },
        {
          id: "m_s1_2",
          date: "2025-09-20",
          homeTeamId: "team_hawks",
          awayTeamId: teamId,
          homeTeamName: "Hawks",
          awayTeamName: teamName,
          homeScore: 7,
          awayScore: 35,
          isPlayoff: false,
        },
      ],
    },
  ];

  it("returns empty record arrays when no games, seasons or plays exist", () => {
    const res = calculateTeamRecords({
      teamId: "empty_team",
      teamName: "Empty Team",
      seasons: [],
      snapshots: [],
    });
    expect(res.gameRecords).toEqual([]);
    expect(res.seasonRecords).toEqual([]);
    expect(res.careerRecords).toEqual([]);
  });

  it("calculates single-game team records from snapshots and live matches", () => {
    const liveMatches = [
      {
        id: "m_live_1",
        date: "2026-10-15",
        homeTeamId: teamId,
        awayTeamId: "team_vipers",
        homeTeamName: teamName,
        awayTeamName: "Vipers",
        homeScore: 48,
        awayScore: 6,
      },
    ];

    const res = calculateTeamRecords({
      teamId,
      teamName,
      seasons,
      snapshots,
      matches: liveMatches,
    });

    const highScore = res.gameRecords.find((r) => r.id === "game_highest_score");
    expect(highScore).toBeDefined();
    expect(highScore?.value).toBe(48);
    expect(highScore?.holder).toBe("York Lions");

    const margin = res.gameRecords.find((r) => r.id === "game_largest_margin");
    expect(margin).toBeDefined();
    expect(margin?.value).toBe(42); // 48 - 6 = 42
  });

  it("calculates single-season and career records across snapshot and live player stats", () => {
    const livePlayerStats = [
      {
        playerId: "p1",
        name: "Sarah Connor",
        number: "10",
        teamId,
        teamName,
        teamShortcode: "YORK",
        gamesPlayed: 3,
        passTD: 8,
        recTD: 0,
        rushTD: 1,
        totalTDs: 9,
        sacks: 0,
        int: 0,
        flagPulls: 4,
      },
      {
        playerId: "p3",
        name: "Chloe Vance",
        number: "7",
        teamId,
        teamName,
        teamShortcode: "YORK",
        gamesPlayed: 3,
        passTD: 0,
        recTD: 6,
        rushTD: 0,
        totalTDs: 6,
        sacks: 5,
        int: 2,
        flagPulls: 15,
      },
    ];

    const res = calculateTeamRecords({
      teamId,
      teamName,
      seasons,
      snapshots,
      livePlayerStats,
      liveRecord: { won: 3, lost: 0, tied: 0, pf: 95, pa: 42 },
    });

    // Season records
    const seasonPass = res.seasonRecords.find((r) => r.id === "season_pass_td");
    expect(seasonPass?.holder).toBe("Sarah Connor");
    expect(seasonPass?.value).toBe(18); // Season 1 record

    const seasonRec = res.seasonRecords.find((r) => r.id === "season_rec_td");
    expect(seasonRec?.holder).toBe("Maya Lin");
    expect(seasonRec?.value).toBe(12);

    // Career records
    const careerPass = res.careerRecords.find((r) => r.id === "career_pass_td");
    expect(careerPass?.holder).toBe("Sarah Connor");
    expect(careerPass?.value).toBe(26); // 18 + 8 = 26

    const careerTotalTD = res.careerRecords.find((r) => r.id === "career_total_td");
    expect(careerTotalTD?.holder).toBe("Sarah Connor");
    expect(careerTotalTD?.value).toBe(29); // 20 + 9 = 29

    const careerSacks = res.careerRecords.find((r) => r.id === "career_sacks");
    expect(careerSacks?.holder).toBe("Maya Lin");
    expect(careerSacks?.value).toBe(6);
  });

  it("calculates comprehensive single-game player and team records from plays", () => {
    const plays = [
      {
        matchId: "m1",
        possessionTeamId: teamId,
        playType: "Pass",
        qbPlayerId: "Sarah Connor",
        receiverPlayerId: "Chloe Vance",
        passOutcome: "Complete",
        isTouchdown: true,
      },
      {
        matchId: "m1",
        possessionTeamId: teamId,
        playType: "Pass",
        qbPlayerId: "Sarah Connor",
        receiverPlayerId: "Chloe Vance",
        passOutcome: "Complete",
        isTouchdown: true,
      },
      {
        matchId: "m1",
        possessionTeamId: teamId,
        playType: "Pass",
        qbPlayerId: "Sarah Connor",
        receiverPlayerId: "Maya Lin",
        passOutcome: "Complete",
        isTouchdown: true,
      },
      {
        matchId: "m1",
        possessionTeamId: "opponent_team",
        playType: "Pass",
        passOutcome: "Sack",
        defenders: ["Maya Lin", "Maya Lin"],
      },
      {
        matchId: "m1",
        possessionTeamId: "opponent_team",
        playType: "Pass",
        passOutcome: "Interception",
        defenders: ["Maya Lin"],
        isPick6: true,
      },
    ];

    const matches = [
      {
        id: "m1",
        homeTeamId: teamId,
        awayTeamId: "opponent_team",
        homeTeamName: teamName,
        awayTeamName: "Rivals",
        homeScore: 28,
        awayScore: 0,
        status: "Final",
        date: "2026-10-04",
      },
    ];

    const res = calculateTeamRecords({
      teamId,
      teamName,
      seasons,
      snapshots: [],
      matches,
      plays,
    });

    // Player Single Game Records
    const passTdRecord = res.gameRecords.find((r) => r.id === "game_pass_td");
    expect(passTdRecord?.holder).toBe("Sarah Connor");
    expect(passTdRecord?.value).toBe(3);

    const recTdRecord = res.gameRecords.find((r) => r.id === "game_rec_td");
    expect(recTdRecord?.holder).toBe("Chloe Vance");
    expect(recTdRecord?.value).toBe(2);

    const sacksRecord = res.gameRecords.find((r) => r.id === "game_sacks");
    expect(sacksRecord?.holder).toBe("Maya Lin");
    expect(sacksRecord?.value).toBe(2);

    const intRecord = res.gameRecords.find((r) => r.id === "game_int");
    expect(intRecord?.holder).toBe("Maya Lin");
    expect(intRecord?.value).toBe(1);

    // Team Single Game Records
    const teamTdRecord = res.gameRecords.find((r) => r.id === "game_team_total_tds");
    expect(teamTdRecord?.holder).toBe(teamName);
    expect(teamTdRecord?.value).toBe(4); // 3 offensive + 1 pick-6

    const teamPassTdRecord = res.gameRecords.find((r) => r.id === "game_team_pass_tds");
    expect(teamPassTdRecord?.holder).toBe(teamName);
    expect(teamPassTdRecord?.value).toBe(3);

    const shutoutRecord = res.gameRecords.find((r) => r.id === "game_fewest_pts_allowed");
    expect(shutoutRecord?.value).toBe(0);
  });
});
