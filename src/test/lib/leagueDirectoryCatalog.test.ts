import { describe, expect, it } from "vitest";
import { buildDirectoryCatalog } from "@/lib/leagueDirectoryData";

describe("buildDirectoryCatalog", () => {
  it("never lists the shared demo league", () => {
    const catalog = buildDirectoryCatalog(
      [{ id: "default", name: "FlagOS Demo League", visibility: "public" }],
      { id: "default", leagueName: "FlagOS Demo League", visibility: "public" },
      [
        { id: "demo", leagueName: "Demo", visibility: "public" },
        { id: "league_real", leagueName: "Real League", visibility: "public" },
      ],
      "default",
    );
    expect(catalog.map((l) => l.id)).toEqual(["league_real"]);
  });
});
