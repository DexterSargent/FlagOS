import { describe, expect, it } from "vitest";
import { findVenue, isValidPublicEmail, mapsSearchUrl, validatePlayerInfo, validateVenues } from "@/lib/leaguePublicProfile";

describe("leaguePublicProfile", () => {
  it("accepts valid player details and rejects unknown or oversized fields", () => {
    expect(validatePlayerInfo(undefined)).toBeNull();
    expect(validatePlayerInfo({ city: "Toronto", acceptsFreeAgents: true })).toBeNull();
    expect(validatePlayerInfo({ city: "x".repeat(81) })).toMatch(/too long/);
    expect(validatePlayerInfo({ ownerUid: "abc" })).toMatch(/not supported/);
    expect(validatePlayerInfo({ acceptsFreeAgents: "yes" })).toMatch(/invalid/);
    expect(validatePlayerInfo(["city"])).toMatch(/invalid/);
  });

  it("validates venue lists", () => {
    expect(validateVenues([{ name: "Field 1", address: "1 Main St", notes: "Lot B" }])).toBeNull();
    expect(validateVenues([{ name: " " }])).toMatch(/needs a name/);
    expect(validateVenues([{ name: "Field 1", script: "x" }])).toMatch(/invalid/);
    expect(validateVenues(Array.from({ length: 21 }, (_, i) => ({ name: `F${i}` })))).toMatch(/invalid/);
  });

  it("matches venues by game location and builds map links", () => {
    const venues = [{ name: "Field 1", address: "1 Main St" }];
    expect(findVenue(venues, " field 1 ")?.address).toBe("1 Main St");
    expect(findVenue(venues, "Field 2")).toBeNull();
    expect(mapsSearchUrl("1 Main St, Toronto")).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20Main%20St%2C%20Toronto",
    );
  });

  it("validates public emails", () => {
    expect(isValidPublicEmail("organizer@example.com")).toBe(true);
    expect(isValidPublicEmail("not-an-email")).toBe(false);
  });
});
