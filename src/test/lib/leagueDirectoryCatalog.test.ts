import { describe, expect, it } from "vitest";
import { buildDirectoryCatalog } from "@/lib/leagueDirectoryData";

describe("buildDirectoryCatalog", () => {
  it("never lists the shared demo league", () => {
    const catalog = buildDirectoryCatalog(
      [{ id: "default", name: "FlagOS Demo League", visibility: "public" }],
      { id: "default", leagueName: "FlagOS Demo League", visibility: "public" },
      [
        { id: "demo", leagueName: "Demo", visibility: "public" },
        { id: "league_real", leagueName: "Real League", visibility: "public", directoryListed: true },
      ],
      "default",
    );
    expect(catalog.map((l) => l.id)).toEqual(["league_real"]);
  });

  it("only lists leagues whose admins opted in, plus the user's own leagues", () => {
    const catalog = buildDirectoryCatalog(
      [{ id: "mine", name: "My Unlisted League", visibility: "public" }],
      undefined,
      [
        { id: "listed", leagueName: "Listed", visibility: "public", directoryListed: true },
        { id: "unlisted", leagueName: "Unlisted", visibility: "public" },
        { id: "private_listed", leagueName: "Private", visibility: "private", directoryListed: true },
      ],
    );
    expect(catalog.map((l) => l.id).sort()).toEqual(["listed", "mine"]);
    expect(catalog.find((l) => l.id === "mine")?.isListed).toBe(false);
  });

  it("never invents venue, schedule, or deadline details", () => {
    const [league] = buildDirectoryCatalog([], undefined, [
      { id: "bare", leagueName: "Bare League", visibility: "public", directoryListed: true },
    ]);
    expect(league.venue.address).toBe("");
    expect(league.venue.city).toBe("");
    expect(league.venue.latitude).toBeUndefined();
    expect(league.gameDay).toBe("");
    expect(league.registrationDeadline).toBe("");
    expect(league.competitionTier).toBe("");
    expect(league.division).toBe("");
  });

  it("uses published player details and public contact only", () => {
    const [league] = buildDirectoryCatalog([], undefined, [
      {
        id: "full",
        leagueName: "Full League",
        visibility: "public",
        directoryListed: true,
        publicContactEmail: "organizer@example.com",
        playerInfo: { city: "Hamilton, ON", gameDay: "Tuesdays", skillLevel: "Recreational", acceptsFreeAgents: true },
      },
    ]);
    expect(league.contactEmail).toBe("organizer@example.com");
    expect(league.venue.city).toBe("Hamilton, ON");
    expect(league.gameDay).toBe("Tuesdays");
    expect(league.competitionTier).toBe("Recreational");
    expect(league.acceptsFreeAgents).toBe(true);
  });
});
