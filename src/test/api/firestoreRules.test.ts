// Run with the local Firestore emulator; this suite never connects to a live project.
// firebase emulators:exec --only firestore --project demo-team-rules "npm test -- src/test/api/firestoreRules.test.ts"
import { beforeEach, describe, expect, it } from "vitest";

const host = process.env.FIRESTORE_EMULATOR_HOST;
const project = "demo-team-rules";
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const teamId = "indie_team";
const head = "head@example.com";
const coach = "coach@example.com";
const matchId = "indie_match_1";
const fixture = {
  homeTeamId: teamId, awayTeamId: "opponent_rivals",
  managingTeamId: teamId, homeTeamName: "Indie", awayTeamName: "Rivals",
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
      : Array.isArray(value) ? { arrayValue: { values: value.map((item) => ({ stringValue: item })) } }
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

async function seedTeam(visibility = "public") {
  await write(`teams/${teamId}`, { name: "Indie", leagueId: "", visibility, isStandalone: true, primaryColor: "#B31B1B" });
  await write(`team_private/${teamId}`, { adminEmails: [head, coach] });
}

describe.skipIf(!host)("independent team Firestore rules (local emulator)", () => {
  beforeEach(async () => {
    expect(host).toMatch(/^(localhost|127\.0\.0\.1):\d+$/);
    await seedTeam();
    const response = await write(`matches/${matchId}`, fixture);
    expect(response.status, await response.text()).toBe(200);
    await write("plays/indie-play", { matchId, isHidden: false, type: "Run", leagueId: "", timestamp: new Date("2026-10-04T14:00:00Z") });
    await write("teams/unrelated", { name: "Other", leagueId: "" });
  });

  it.each([undefined, "viewer@example.com"])("allows the public team browser queries for %s", async (email) => {
    const bearer = email ? auth(email) : undefined;
    const matches = await query("matches", [filter("managingTeamId", teamId), filter("isHidden", false)], 512, bearer);
    const matchBody = await matches.text();
    expect(matches.status, matchBody).toBe(200);
    expect(matchBody).toContain(matchId);
    const plays = await query("plays", [filter("matchId", matchId), filter("isHidden", false)], 500, bearer, "timestamp");
    const playBody = await plays.text();
    expect(plays.status, playBody).toBe(200);
    expect(playBody).toContain("indie-play");
  });

  it("allows signed-out viewers to read a public independent team and roster", async () => {
    await write("players/p_indie", { teamId, leagueId: "", playerName: "Public Player", number: "7" });
    const team = await read(`teams/${teamId}`);
    const teamBody = await team.text();
    expect(team.status, teamBody).toBe(200);
    expect(teamBody).toContain("#B31B1B");
    const roster = await query("players", [filter("teamId", teamId)], 100);
    const rosterBody = await roster.text();
    expect(roster.status, rosterBody).toBe(200);
    expect(rosterBody).toContain("p_indie");
    expect((await read(`team_private/${teamId}`)).status).toBe(403);
  });

  it("does not expose private, PII-bearing or unrelated team records", async () => {
    await seedTeam("private");
    expect((await read(`teams/${teamId}`)).status).toBe(403);
    expect((await read(`matches/${matchId}`)).status).toBe(403);
    await write("players/p_indie_private", { teamId, leagueId: "", playerName: "Hidden" });
    expect((await query("players", [filter("teamId", teamId)], 100)).status).toBe(403);
    await write(`teams/${teamId}`, { name: "Indie", leagueId: "", visibility: "public", coachEmail: "x@example.com" });
    expect((await read(`teams/${teamId}`)).status).toBe(403);
    await seedTeam();
    await write("players/p_indie_pii", { teamId, leagueId: "", playerName: "PII", email: "x@example.com" });
    expect((await read("players/p_indie_pii")).status).toBe(403);
    await write("players/p_other", { teamId: "unrelated", leagueId: "", playerName: "Other" });
    expect((await query("players", [filter("teamId", "unrelated")], 100)).status).toBe(403);
  });

  it("does not treat a public league team as an independent public portal", async () => {
    await write(`teams/${teamId}`, { name: "Indie", leagueId: "private-league", visibility: "public" });
    expect((await read(`teams/${teamId}`)).status).toBe(403);
    expect((await read(`matches/${matchId}`)).status).toBe(403);
  });

  it("requires visibility constraints and bounded match queries", async () => {
    expect((await query("matches", [filter("managingTeamId", teamId)], 512)).status).toBe(403);
    expect((await query("matches", [filter("managingTeamId", teamId), filter("isHidden", false)], 513)).status).toBe(403);
  });

  it("hides plays once their parent match is hidden", async () => {
    await write(`matches/${matchId}`, { ...fixture, isHidden: true });
    expect((await read("plays/indie-play")).status).toBe(403);
  });

  it("does not expose matches or plays managed by a non-public team", async () => {
    await write("matches/unrelated", { ...fixture, homeTeamId: "unrelated", managingTeamId: "unrelated" });
    await write("plays/unrelated", { matchId: "unrelated", isHidden: false });
    expect((await read("matches/unrelated")).status).toBe(403);
    expect((await read("plays/unrelated")).status).toBe(403);
  });

  it("does not expose a hidden parent's plays through public league membership", async () => {
    await write("leagues/rules-public", { visibility: "public" });
    await write(`matches/${matchId}`, { ...fixture, leagueId: "rules-public", isHidden: true });
    await write("plays/indie-play", { matchId, isHidden: false, leagueId: "rules-public" });
    expect((await read("plays/indie-play", auth("viewer@example.com"))).status).toBe(403);
  });

  it("lets signed-in members list a public league's visible plays", async () => {
    await write("leagues/rules-public", { visibility: "public" });
    await write("plays/league-play", { matchId: "league-match", isHidden: false, leagueId: "rules-public" });
    const leagueQuery = [filter("leagueId", "rules-public"), filter("isHidden", true, "NOT_EQUAL")];
    const listed = await query("plays", leagueQuery, 10_000, auth("viewer@example.com"));
    const body = await listed.text();
    expect(listed.status, body).toBe(200);
    expect(body).toContain("league-play");
    expect((await query("plays", [filter("leagueId", "rules-public")], 10_000, auth("viewer@example.com"))).status).toBe(403);
    await write("leagues/rules-public", { visibility: "private" });
    expect((await query("plays", leagueQuery, 10_000, auth("viewer@example.com"))).status).toBe(403);
  });

  it("opens a private league only to members listed in league_access", async () => {
    const viewer = auth("viewer@example.com");
    await write("leagues/rules-private", { visibility: "private", leagueName: "Private" });
    await write("teams/private-team", { name: "Private Team", leagueId: "rules-private" });
    await write("players/private-player", { teamId: "private-team", leagueId: "rules-private", playerName: "Member" });
    await write("matches/private-match", { ...fixture, leagueId: "rules-private", managingTeamId: "private-team" });
    await write("plays/private-play", { matchId: "private-match", isHidden: false, leagueId: "rules-private" });
    const visibleOnly = [filter("leagueId", "rules-private"), filter("isHidden", true, "NOT_EQUAL")];
    const checks = async () => [
      (await read("leagues/rules-private", viewer)).status,
      (await query("teams", [filter("leagueId", "rules-private")], 300, viewer)).status,
      (await query("players", [filter("leagueId", "rules-private")], 1920, viewer)).status,
      (await query("matches", visibleOnly, 512, viewer)).status,
      (await query("plays", visibleOnly, 10_000, viewer)).status,
    ];
    try {
      await write("league_access/rules-test-user", { leagueIds: ["some-other-league"] });
      expect(await checks()).toEqual([403, 403, 403, 403, 403]);
      await write("league_access/rules-test-user", { leagueIds: ["rules-private"] });
      expect(await checks()).toEqual([200, 200, 200, 200, 200]);
      expect((await read("league_access/rules-test-user", viewer)).status).toBe(403);
      expect((await write("league_access/rules-test-user", { leagueIds: ["x"] }, viewer)).status).toBe(403);
    } finally {
      await write("league_access/rules-test-user", { leagueIds: [] });
    }
  });

  it("lets a league member list a league team's roster when the query is scoped to the league", async () => {
    const viewer = auth("viewer@example.com");
    await write("leagues/rules-roster", { visibility: "private", leagueName: "Roster League" });
    await write("teams/roster-team", { name: "Roster Team", leagueId: "rules-roster" });
    await write("players/roster-player", { teamId: "roster-team", leagueId: "rules-roster", playerName: "Member" });
    try {
      await write("league_access/rules-test-user", { leagueIds: ["rules-roster"] });
      const scoped = await query("players", [filter("teamId", "roster-team"), filter("leagueId", "rules-roster")], 30, viewer);
      const body = await scoped.text();
      expect(scoped.status, body).toBe(200);
      expect(body).toContain("roster-player");
      // A teamId-only query cannot prove league membership, so it must also filter by leagueId.
      expect((await query("players", [filter("teamId", "roster-team")], 30, viewer)).status).toBe(403);
      await write("league_access/rules-test-user", { leagueIds: [] });
      expect((await query("players", [filter("teamId", "roster-team"), filter("leagueId", "rules-roster")], 30, viewer)).status).toBe(403);
    } finally {
      await write("league_access/rules-test-user", { leagueIds: [] });
    }
  });

  it("allows listed coaches to update scores", async () => {
    const response = await write(`matches/${matchId}`, { ...fixture, homeScore: 7 }, auth(coach));
    expect(response.status, await response.text()).toBe(200);
  });

  it("rejects unverified coaches, outsiders, and cross-team writes", async () => {
    expect((await write(`matches/${matchId}`, fixture, auth(coach, false))).status).toBe(403);
    expect((await write(`matches/${matchId}`, fixture, auth("outsider@example.com"))).status).toBe(403);
    expect((await write("teams/unrelated", { name: "Hijacked", leagueId: "" }, auth(coach))).status).toBe(403);
  });

  it("prevents scope reassignment and oversized updates", async () => {
    for (const change of [{ leagueId: "other" }, { managingTeamId: "other" }, { homeTeamName: "x".repeat(101) }]) {
      expect((await write(`matches/${matchId}`, { ...fixture, ...change }, auth(coach))).status).toBe(403);
    }
  });

  it("permits only the head coach (first admin email) to soft-hide games", async () => {
    expect((await write(`matches/${matchId}`, { ...fixture, isHidden: true }, auth(coach))).status).toBe(403);
    expect((await write(`matches/${matchId}`, { ...fixture, isHidden: true }, auth(head))).status).toBe(200);
    expect((await read(`matches/${matchId}`)).status).toBe(403);
  });

  it("never allows client-side match creation", async () => {
    expect((await write("matches/new-match", fixture, auth(head))).status).toBe(403);
  });

  it("blocks season writes in an archived league until it is reactivated", async () => {
    const league = { visibility: "public", adminEmails: [head] };
    const leagueMatch = { ...fixture, leagueId: "rules-archived" };
    await write("leagues/rules-archived", { ...league, isArchived: false, seasonStatus: "active" });
    await write(`matches/${matchId}`, leagueMatch);
    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 7 }, auth(head))).status).toBe(200);
    await write("leagues/rules-archived", { ...league, isArchived: true, seasonStatus: "archived" });
    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 14 }, auth(head))).status).toBe(403);
    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 14 }, auth("dextersargent@gmail.com"))).status).toBe(403);
  });

  it("blocks independent-team season writes while archived but allows reopening", async () => {
    const teamDoc = { id: teamId, name: "Indie", leagueId: "", visibility: "public", isStandalone: true, primaryColor: "#B31B1B" };
    await seedTeam();
    await write(`matches/${matchId}`, fixture);
    await write(`teams/${teamId}`, { ...teamDoc, isArchived: true, seasonStatus: "archived" });
    expect((await write(`matches/${matchId}`, { ...fixture, homeScore: 21 }, auth(head))).status).toBe(403);
    expect((await write(`teams/${teamId}`, { ...teamDoc, isArchived: false, seasonStatus: "active" }, auth(head))).status).toBe(200);
    expect((await write(`matches/${matchId}`, { ...fixture, homeScore: 21 }, auth(head))).status).toBe(200);
  });

  it("keeps free-agent interest submissions readable only by the platform admin", async () => {
    await write("free_agent_interest/fa1", { name: "Sam", email: "sam@example.com", area: "Toronto" });
    const listAs = (bearer?: string, max = 50) => fetch(`${base}:runQuery`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(bearer ? { authorization: "Bearer " + bearer } : {}) },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "free_agent_interest" }], limit: max } }),
    });
    expect((await read("free_agent_interest/fa1")).status).toBe(403);
    expect((await read("free_agent_interest/fa1", auth(coach))).status).toBe(403);
    expect((await listAs(auth(coach))).status).toBe(403);
    expect((await write("free_agent_interest/fa2", { name: "Spam", email: "x@example.com", area: "X" }, auth(coach))).status).toBe(403);
    expect((await read("free_agent_interest/fa1", auth("dextersargent@gmail.com"))).status).toBe(200);
    expect((await listAs(auth("dextersargent@gmail.com"))).status).toBe(200);
    expect((await listAs(auth("dextersargent@gmail.com"), 500)).status).toBe(403);
  });

  it("lets a temporary scorer record only their game, only until the grant expires", async () => {
    const scorer = "volunteer@example.com";
    const leagueMatch = { ...fixture, leagueId: "rules-scorer-league" };
    await write("leagues/rules-scorer-league", { visibility: "public", adminEmails: [head], isArchived: false, seasonStatus: "active" });
    await write(`matches/${matchId}`, leagueMatch);
    await write("matches/other-match", { ...leagueMatch });
    const grantPath = `scorer_grants/${matchId}__rules-test-user`;

    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 7 }, auth(scorer))).status).toBe(403);

    await write(grantPath, { uid: "rules-test-user", matchId, expiresAt: new Date(Date.now() + 3_600_000) });
    expect((await read(grantPath, auth(scorer))).status).toBe(200);
    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 7 }, auth(scorer))).status).toBe(200);
    expect((await write("matches/other-match", { ...leagueMatch, homeScore: 7 }, auth(scorer))).status).toBe(403);
    expect((await write(grantPath, { uid: "rules-test-user", matchId, expiresAt: new Date(Date.now() + 9e9) }, auth(scorer))).status).toBe(403);
    expect((await read("scorer_invites/anything", auth(scorer))).status).toBe(403);

    await write(grantPath, { uid: "rules-test-user", matchId, expiresAt: new Date(Date.now() - 60_000) });
    expect((await write(`matches/${matchId}`, { ...leagueMatch, homeScore: 14 }, auth(scorer))).status).toBe(403);
  });

  it("lets a temporary scorer read a private league's teams and rosters only while their access lasts", async () => {
    const scorer = "volunteer@example.com";
    const leagueId = "rules-private-scorer-league";
    const accessPath = `scorer_league_access/${leagueId}__rules-test-user`;
    await write(`leagues/${leagueId}`, { visibility: "private", isArchived: false, seasonStatus: "active" });
    await write("teams/rules-private-team", { name: "Private Team", leagueId });
    await write("players/rules-private-player", { name: "Private Player", teamId: "rules-private-team", leagueId });
    await write("leagues/rules-other-private-league", { visibility: "private", isArchived: false, seasonStatus: "active" });

    expect((await read(`leagues/${leagueId}`, auth(scorer))).status).toBe(403);
    expect((await read("teams/rules-private-team", auth(scorer))).status).toBe(403);
    expect((await read("players/rules-private-player", auth(scorer))).status).toBe(403);

    await write(accessPath, { uid: "rules-test-user", leagueId, expiresAt: new Date(Date.now() + 3_600_000) });
    expect((await read(`leagues/${leagueId}`, auth(scorer))).status).toBe(200);
    expect((await read("teams/rules-private-team", auth(scorer))).status).toBe(200);
    expect((await read("players/rules-private-player", auth(scorer))).status).toBe(200);
    expect((await read("leagues/rules-other-private-league", auth(scorer))).status).toBe(403);
    expect((await read(accessPath, auth(scorer))).status).toBe(403);
    expect((await write(accessPath, { uid: "rules-test-user", leagueId, expiresAt: new Date(Date.now() + 9e9) }, auth(scorer))).status).toBe(403);

    await write(accessPath, { uid: "rules-test-user", leagueId, expiresAt: new Date(Date.now() - 60_000) });
    expect((await read(`leagues/${leagueId}`, auth(scorer))).status).toBe(403);
    expect((await read("players/rules-private-player", auth(scorer))).status).toBe(403);
  });
});
