// Run with the local Firestore emulator; this suite never connects to a live project.
// firebase emulators:exec --only firestore --project demo-york-backend "npm test -- src/test/api/firestoreRules.test.ts"
import { beforeEach, describe, expect, it } from "vitest";

const host = process.env.FIRESTORE_EMULATOR_HOST;
const project = "demo-york-backend";
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const coach = "tbrown99@my.yorku.ca";
const head = "dexters4@my.yorku.ca";
const seedId = "match_york_mcmaster";
const fixture = {
  homeTeamId: "york_lions", awayTeamId: "opponent_mcmaster",
  managingTeamId: "york_lions", homeTeamName: "York", awayTeamName: "McMaster",
  leagueId: "", isHidden: false, homeScore: 0, awayScore: 0,
};

function auth(email: string, verified = true) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: "rules-test-user", user_id: "rules-test-user", email, email_verified: verified,
    aud: project, iss: `https://securetoken.google.com/${project}`,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
    firebase: { sign_in_provider: "password" },
  })}.`;
}

function fields(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    value instanceof Date ? { timestampValue: value.toISOString() }
      : typeof value === "boolean" ? { booleanValue: value }
      : typeof value === "number" ? { integerValue: String(value) }
        : { stringValue: value },
  ]));
}

async function write(path: string, data: Record<string, unknown>, bearer = "owner") {
  return fetch(`${base}/${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ fields: fields(data) }),
  });
}

async function read(path: string, bearer?: string) {
  return fetch(`${base}/${path}`, { headers: bearer ? { authorization: `Bearer ${bearer}` } : {} });
}

function filter(fieldPath: string, value: unknown, op = "EQUAL") {
  return { fieldFilter: { field: { fieldPath }, op,
    value: Array.isArray(value)
      ? { arrayValue: { values: value.map((item) => ({ stringValue: item })) } }
      : typeof value === "boolean" ? { booleanValue: value } : { stringValue: value },
  } };
}

async function query(
  collectionId: string, filters: ReturnType<typeof filter>[], limit: number, bearer?: string,
  orderBy?: string,
) {
  return fetch(`${base}:runQuery`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      where: { compositeFilter: { op: "AND", filters } }, limit,
      ...(orderBy ? { orderBy: [{ field: { fieldPath: orderBy }, direction: "ASCENDING" }] } : {}),
    } }),
  });
}

describe.skipIf(!host)("York Firestore rules (local emulator)", () => {
  beforeEach(async () => {
    expect(host).toMatch(/^(localhost|127\.0\.0\.1):\d+$/);
    const response = await write(`matches/${seedId}`, fixture);
    expect(response.status, await response.text()).toBe(200);
    await write("plays/york-rules-play", { matchId: seedId, isHidden: false, type: "Run", leagueId: "" });
    await write("teams/unrelated", { name: "Other", leagueId: "" });
  });

  it.each(["homeTeamId", "awayTeamId", "managingTeamId"])("allows visible York %s queries without authentication", async (field) => {
    const response = await query("matches", [
      filter(field, ["york_lions", "team_york", "york", "yuwffl_lions", "york_wffl"], "IN"),
      filter("isHidden", false),
    ], 512);
    expect(response.status, await response.text()).toBe(200);
  });

  it.each([undefined, "viewer@example.com"])("allows the actual public York browser queries for %s", async (email) => {
    const bearer = email ? auth(email) : undefined;
    await write("teams/york_lions", { name: "York", leagueId: "", visibility: "public", isStandalone: true });
    const laurier = { ...fixture, awayTeamId: "opponent_laurier", awayTeamName: "Laurier" };
    await write("matches/match_york_laurier", laurier);
    await write("plays/york-laurier-play", {
      matchId: "match_york_laurier", isHidden: false, leagueId: "", managingTeamId: "york_lions",
      isPublicYork: true, type: "Run", timestamp: new Date("2026-10-04T14:00:00Z"),
    });
    const aliases = ["york_lions", "team_york", "york", "yuwffl_lions", "york_wffl"];
    for (const field of ["homeTeamId", "awayTeamId", "managingTeamId"]) {
      const response = await query("matches", [filter(field, aliases, "IN"), filter("isHidden", false)], 512, bearer);
      const body = await response.text();
      expect(response.status, body).toBe(200);
      if (field !== "awayTeamId") expect(body).toContain("match_york_laurier");
    }
    const response = await query("plays", [
      filter("matchId", "match_york_laurier"), filter("isHidden", false),
    ], 500, bearer, "timestamp");
    const body = await response.text();
    expect(response.status, body).toBe(200);
    expect(body).toContain("york-laurier-play");
  });

  it("allows signed-out viewers to read the provisioned public York team and roster", async () => {
    await write("teams/york_lions", {
      name: "York", leagueId: "", visibility: "public", isStandalone: true,
      primaryColor: "#B31B1B", secondaryColor: "#FFC72C",
    });
    await write("players/p_york_rules", {
      teamId: "york_lions", leagueId: "", playerName: "Public Player", number: "7",
    });
    const team = await read("teams/york_lions");
    const teamBody = await team.text();
    expect(team.status, teamBody).toBe(200);
    expect(teamBody).toContain("#B31B1B");
    const roster = await query("players", [filter("teamId", "york_lions")], 100);
    const rosterBody = await roster.text();
    expect(roster.status, rosterBody).toBe(200);
    expect(rosterBody).toContain("p_york_rules");
  });

  it("does not expose private or non-public York team and player records", async () => {
    await write("teams/york_lions", { name: "York", leagueId: "", visibility: "private" });
    expect((await read("teams/york_lions")).status).toBe(403);
    await write("players/p_york_private", { teamId: "york_lions", leagueId: "", playerName: "Hidden" });
    expect((await query("players", [filter("teamId", "york_lions")], 100)).status).toBe(403);
    await write("teams/york_lions", { name: "York", leagueId: "", visibility: "public", coachEmail: "x@example.com" });
    expect((await read("teams/york_lions")).status).toBe(403);
    await write("teams/york_lions", { name: "York", leagueId: "", visibility: "public" });
    await write("players/p_york_pii", { teamId: "york_lions", leagueId: "", playerName: "PII", email: "x@example.com" });
    expect((await read("players/p_york_pii")).status).toBe(403);
    await write("players/p_other", { teamId: "unrelated", leagueId: "", playerName: "Other" });
    expect((await query("players", [filter("teamId", "unrelated")], 100)).status).toBe(403);
  });

  it("requires visibility constraints and bounded match queries", async () => {
    expect((await query("matches", [filter("homeTeamId", ["york_lions"], "IN")], 512)).status).toBe(403);
    expect((await query("matches", [filter("homeTeamId", ["york_lions"], "IN"), filter("isHidden", false)], 513)).status).toBe(403);
  });

  it("allows public plays only for a visible York parent", async () => {
    const response = await query("plays", [
      filter("matchId", [seedId], "IN"), filter("isHidden", false),
    ], 10000);
    expect(response.status, await response.text()).toBe(200);
    await write(`matches/${seedId}`, { ...fixture, isHidden: true });
    expect((await read("plays/york-rules-play")).status).toBe(403);
  });

  it("does not expose unrelated matches or plays with forged visibility markers", async () => {
    await write("matches/unrelated", { ...fixture, homeTeamId: "other", managingTeamId: "other" });
    await write("plays/unrelated", { matchId: "unrelated", isPublicYork: true, isHidden: false });
    expect((await read("matches/unrelated")).status).toBe(403);
    expect((await read("plays/unrelated")).status).toBe(403);
  });

  it("does not expose a hidden York parent's plays through public league membership", async () => {
    await write("leagues/rules-public", { visibility: "public" });
    await write(`matches/${seedId}`, { ...fixture, leagueId: "rules-public", isHidden: true });
    await write("plays/york-rules-play", { matchId: seedId, isHidden: false, leagueId: "rules-public" });
    expect((await read("plays/york-rules-play", auth("viewer@example.com"))).status).toBe(403);
  });

  it("supports a ten-parent public play query within the rules access-call limit", async () => {
    const ids = Array.from({ length: 10 }, (_, index) => `rules-query-${index}`);
    for (const id of ids) {
      await write(`matches/${id}`, fixture);
      await write(`plays/${id}`, { matchId: id, isHidden: false });
    }
    const response = await query("plays", [filter("matchId", ids, "IN"), filter("isHidden", false)], 10000);
    expect(response.status, await response.text()).toBe(200);
  });

  it("allows verified requested coaches to update scores without a team document", async () => {
    const response = await write(`matches/${seedId}`, { ...fixture, homeScore: 7 }, auth(coach));
    expect(response.status, await response.text()).toBe(200);
  });

  it("rejects unverified coaches, outsiders, and cross-team writes", async () => {
    expect((await write(`matches/${seedId}`, fixture, auth(coach, false))).status).toBe(403);
    expect((await write(`matches/${seedId}`, fixture, auth("outsider@example.com"))).status).toBe(403);
    expect((await write("teams/unrelated", { name: "Hijacked", leagueId: "" }, auth(coach))).status).toBe(403);
  });

  it("prevents scope reassignment, visibility-marker injection and oversized updates", async () => {
    for (const change of [
      { leagueId: "other" }, { managingTeamId: "other" },
      { isPublicYork: true }, { homeTeamName: "x".repeat(101) },
    ]) {
      expect((await write(`matches/${seedId}`, { ...fixture, ...change }, auth(coach))).status).toBe(403);
    }
  });

  it("permits primary-only soft hiding", async () => {
    expect((await write(`matches/${seedId}`, { ...fixture, isHidden: true }, auth(coach))).status).toBe(403);
    expect((await write(`matches/${seedId}`, { ...fixture, isHidden: true }, auth(head))).status).toBe(200);
    expect((await read(`matches/${seedId}`)).status).toBe(403);
  });

  it("permits authorized creation only for the bounded York seed fixtures", async () => {
    await fetch(`${base}/matches/${seedId}`, { method: "DELETE", headers: { authorization: "Bearer owner" } });
    expect((await write(`matches/${seedId}`, fixture, auth(coach))).status).toBe(200);
    expect((await write("matches/not-a-seed", fixture, auth(coach))).status).toBe(403);
  });
});
