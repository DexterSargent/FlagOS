import { beforeEach, describe, expect, it, vi } from "vitest";

type Data = Record<string, any>;
type Stored = { data: Data; updateTime: { seconds: number; nanoseconds: number } };

const { fake, verifyIdTokenMock } = vi.hoisted(() => {
  class FakeDb {
    store = new Map<string, Stored>();
    clock = 1;
    fullPlayReads = 0;
    metadataReads = 0;
    projectedTeamReads = 0;
    rosterFields: string[] | null = null;
    failGetAll = false;
    failCommit = false;
    beforeFullRead: (() => void) | null = null;
    put(path: string, data: Data) {
      this.clock += 1;
      this.store.set(path, { data: structuredClone(data), updateTime: { seconds: 1_800_000_000, nanoseconds: this.clock } });
    }
    patch(path: string, data: Data) {
      this.put(path, { ...this.store.get(path)!.data, ...data });
    }
    remove(path: string) {
      this.store.delete(path);
    }
    snapshot(path: string, fields: string[] | null = null) {
      const stored = this.store.get(path);
      const data = stored
        ? (fields ? Object.fromEntries(fields.filter((f) => f in stored.data).map((f) => [f, structuredClone(stored.data[f])])) : structuredClone(stored.data))
        : undefined;
      return {
        id: path.split("/").pop()!,
        exists: Boolean(stored),
        updateTime: stored?.updateTime,
        data: () => data,
        get: (field: string) => data?.[field],
      };
    }
    collection(name: string) {
      return new FakeQuery(this, name, [], Infinity, null);
    }
    async getAll(...refs: { path: string }[]) {
      if (this.failGetAll) throw new Error("cache unavailable");
      return refs.map((ref) => this.snapshot(ref.path));
    }
    batch() {
      const writes: [string, Data][] = [];
      return {
        set: (ref: { path: string }, data: Data) => writes.push([ref.path, data]),
        commit: async () => {
          if (this.failCommit) throw new Error("write failed");
          writes.forEach(([path, data]) => this.put(path, data));
        },
      };
    }
    async runTransaction(fn: (tx: any) => Promise<unknown>, options: any) {
      expect(options).toEqual({ readOnly: true });
      return fn({
        get: (query: FakeQuery) => query.run(),
        getAll: async (...args: any[]) => {
          const options = args.at(-1)?.fieldMask ? args.pop() : null;
          this.projectedTeamReads += 1;
          expect(options?.fieldMask).toBeTruthy();
          return args.map((ref: { path: string }) => this.snapshot(ref.path, options.fieldMask));
        },
      });
    }
  }
  class FakeQuery {
    constructor(
      readonly db: FakeDb,
      readonly name: string,
      readonly filters: [string, string, unknown][],
      readonly max: number,
      readonly fields: string[] | null,
    ) {}
    where(field: string, op: string, value: unknown) {
      return new FakeQuery(this.db, this.name, [...this.filters, [field, op, value]], this.max, this.fields);
    }
    limit(max: number) {
      return new FakeQuery(this.db, this.name, this.filters, max, this.fields);
    }
    select(...fields: string[]) {
      return new FakeQuery(this.db, this.name, this.filters, this.max, fields);
    }
    doc(id: string) {
      const path = `${this.name}/${id}`;
      return { path, get: async () => this.db.snapshot(path) };
    }
    async run() {
      if (this.name === "players") this.db.rosterFields = this.fields;
      if (this.name === "plays") {
        if (this.fields) {
          // Metadata reads must be pure projections (document names + update times only).
          expect(this.fields).toEqual([]);
          this.db.metadataReads += 1;
        }
        else {
          this.db.fullPlayReads += 1;
          this.db.beforeFullRead?.();
        }
      }
      const docs = [...this.db.store.keys()]
        .filter((path) => path.startsWith(`${this.name}/`) && path.split("/").length === 2)
        .filter((path) => this.filters.every(([field, op, value]) => {
          const actual = this.db.store.get(path)!.data[field];
          return op === "in" ? (value as unknown[]).includes(actual) : actual === value;
        }))
        .slice(0, this.max)
        .map((path) => this.db.snapshot(path, this.fields));
      return { size: docs.length, docs };
    }
  }
  return { fake: new FakeDb(), verifyIdTokenMock: vi.fn() };
});

vi.mock("@/lib/firebaseAdmin", () => ({ adminDb: fake, adminAuth: { verifyIdToken: verifyIdTokenMock } }));

import { GET } from "@/app/api/public/teams/[teamId]/stat-summary/route";
import {
  buildPublicTeamSeasonSummary,
  GAME_SUMMARY_COLLECTION,
  YORK_PUBLIC_SCOPE,
} from "@/lib/teamStatSummaryService";
import {
  buildRosterPlayerStats,
  formatPlayerLabel,
  getPlayerNumber,
  loadTeamSeasonSummary,
  TeamSeasonSummaryError,
} from "@/lib/teamSeasonSummary";
import { auth } from "@/lib/firebase";
import { invalidatePublicTeamData } from "@/lib/publicTeamCache";
import { getPlayerSeasonStats } from "@/lib/teamSeasonAggregation";

const db = fake as any;
let ip = 0;

function seedYork() {
  fake.store.clear();
  fake.fullPlayReads = 0;
  fake.metadataReads = 0;
  fake.failGetAll = false;
  fake.failCommit = false;
  fake.beforeFullRead = null;
  fake.put("matches/m1", { status: "completed", isHidden: false, homeTeamId: "york_lions", awayTeamId: "opp", homeScore: 14, awayScore: 7, didNotPlay: ["Dana"], coachNotes: "private" });
  fake.put("matches/m2", { status: "completed", isHidden: false, homeTeamId: "opp2", awayTeamId: "york", homeScore: 6, awayScore: 0 });
  fake.put("matches/m3", { status: "scheduled", isHidden: false, homeTeamId: "york_lions", awayTeamId: "opp3" });
  fake.put("plays/a", { matchId: "m1", isHidden: false, possessionTeamId: "york_lions", playType: "Pass", qbPlayerId: "Quinn", receiverPlayerId: "Riley", passOutcome: "Complete", isTouchdown: true });
  fake.put("plays/b", { matchId: "m1", isHidden: false, possessionTeamId: "york_lions", playType: "Pass", qbPlayerId: "Quinn", receiverPlayerId: "Riley", passOutcome: "Complete", isConversion: true, conversionAttempt: 1, conversionSuccess: true });
  fake.put("plays/c", { matchId: "m1", isHidden: true, possessionTeamId: "york_lions", playType: "Run", runnerPlayerId: "Riley", isTouchdown: true });
  fake.put("plays/d", { matchId: "m2", isHidden: false, possessionTeamId: "opp2", playType: "Pass", passOutcome: "Interception", defenders: ["Dana"], isPick6: true });
  fake.put("plays/e", { matchId: "m1", possessionTeamId: "york_lions", playType: "Run", runnerPlayerId: "Riley" });
  fake.put("teams/york_lions", { name: "York Lions", visibility: "public", logoUrl: "data:big" });
  fake.put("teams/york", { name: "Old York", visibility: "private" });
  fake.put("players/p1", { teamId: "york_lions", playerName: "Quinn", number: "12", notes: "private note", experience: "secret" });
  fake.put("players/p2", { teamId: "york_lions", playerName: "Bench", number: "7" });
  fake.put("players/p3", { teamId: "york_lions", playerName: "Riley" });
  fake.put("players/p4", { teamId: "york_lions", playerName: "Leaky", number: "9", email: "leaky@example.com" });
  fake.put("players/p5", { teamId: "york", playerName: "Hidden Team", number: "3" });
}

const build = () => buildPublicTeamSeasonSummary(db, YORK_PUBLIC_SCOPE);

describe("team stat summary service", () => {
  beforeEach(seedYork);

  it("builds from explicitly visible plays and persists fingerprinted game summaries", async () => {
    const summary = await build();
    expect(summary.completedGames).toBe(2);
    expect(summary.teamStats.recordFormatted).toBe("1-1-0");
    expect(summary.teamStats.pat1Formatted).toBe("100.0% (1/1)");
    expect(summary.playerStats.Quinn).toMatchObject({ passAtt: 1, passTD: 1, gamesPlayed: 2 });
    // Hidden play c and play e without isHidden=false are not public, so they never count.
    expect(summary.playerStats.Riley).toMatchObject({ rushAtt: 0, rushTD: 0, receptions: 1 });
    expect(summary.playerStats.Dana).toMatchObject({ int: 1, defTD: 1, gamesPlayed: 1 });
    expect(summary.cache).toEqual({ hits: 0, misses: 2 });
    const stored = fake.store.get(`${GAME_SUMMARY_COLLECTION}/york_lions__m1`)!.data;
    expect(stored.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(summary)).not.toMatch(/coachNotes|private|email/);
  });

  it("reuses persisted summaries only while the fingerprint is unchanged", async () => {
    await build();
    fake.fullPlayReads = 0;
    const second = await build();
    expect(second.cache).toEqual({ hits: 2, misses: 0 });
    expect(fake.fullPlayReads).toBe(0);
    expect(fake.metadataReads).toBe(4);
  });

  it.each([
    ["editing a play", () => fake.patch("plays/a", { isTouchdown: false }), (s: any) => expect(s.playerStats.Quinn.passTD).toBe(0)],
    ["hiding a play", () => fake.patch("plays/a", { isHidden: true }), (s: any) => expect(s.playerStats.Quinn).toBeUndefined()],
    ["unhiding a play", () => fake.patch("plays/c", { isHidden: false }), (s: any) => expect(s.playerStats.Riley.rushTD).toBe(1)],
    ["deleting a play", () => fake.remove("plays/a"), (s: any) => expect(s.playerStats.Riley).toBeUndefined()],
    ["converting a TD to a conversion", () => fake.patch("plays/a", { isConversion: true, conversionAttempt: 2, conversionSuccess: true }), (s: any) => {
      expect(s.playerStats.Quinn).toBeUndefined();
      expect(s.teamStats.pat2Attempts).toBe(1);
    }],
    ["changing DNP", () => fake.patch("matches/m1", { didNotPlay: [] }), (s: any) => expect(s.playerStats.Dana.gamesPlayed).toBe(2)],
    ["correcting a score", () => fake.patch("matches/m2", { homeScore: 0, awayScore: 6 }), (s: any) => expect(s.teamStats.recordFormatted).toBe("2-0-0")],
    ["hiding a match", () => fake.patch("matches/m2", { isHidden: true }), (s: any) => expect(s.completedGames).toBe(1)],
    ["reopening a match", () => fake.patch("matches/m1", { status: "in_progress" }), (s: any) => expect(s.playerStats.Quinn).toBeUndefined()],
    ["completing a match", () => fake.patch("matches/m3", { status: "Final", homeScore: 1, awayScore: 0 }), (s: any) => expect(s.completedGames).toBe(3)],
  ])("invalidates the cache after %s", async (_label, change, verify) => {
    await build();
    change();
    const summary = await build();
    expect(summary.cache.hits).toBeLessThanOrEqual(2);
    verify(summary);
  });

  it("rebuilds when the cache cannot be read or contains an invalid entry", async () => {
    await build();
    fake.patch(`${GAME_SUMMARY_COLLECTION}/york_lions__m1`, { summary: { bogus: true } });
    expect((await build()).cache).toEqual({ hits: 1, misses: 1 });
    fake.failGetAll = true;
    const summary = await build();
    expect(summary.cache).toEqual({ hits: 0, misses: 2 });
    expect(summary.playerStats.Quinn.passTD).toBe(1);
  });

  it("serves computed stats when persisting the cache fails", async () => {
    fake.failCommit = true;
    const summary = await build();
    expect(summary.playerStats.Quinn.passTD).toBe(1);
    expect(fake.store.has(`${GAME_SUMMARY_COLLECTION}/york_lions__m1`)).toBe(false);
  });

  it("never caches when plays change mid-read and refuses after repeated conflicts", async () => {
    let counter = 0;
    fake.beforeFullRead = () => fake.put(`plays/racing_${counter++}`, { matchId: "m1", isHidden: false });
    await expect(build()).rejects.toMatchObject({ status: 503 });
    expect(fake.store.has(`${GAME_SUMMARY_COLLECTION}/york_lions__m1`)).toBe(false);
  });

  it("serves cache hits from metadata projections without reading play fields", async () => {
    await build();
    fake.fullPlayReads = 0;
    fake.metadataReads = 0;
    fake.patch("plays/d", { isHidden: true });
    const summary = await build();
    // Only m2 changed: m1 is served from its fingerprint-validated summary with no full play read.
    expect(summary.cache).toEqual({ hits: 1, misses: 1 });
    expect(fake.fullPlayReads).toBe(1);
    expect(fake.metadataReads).toBe(2);
    expect(summary.playerStats.Dana).toMatchObject({ int: 0, defTD: 0 });
    expect(summary.playerStats.Quinn.passTD).toBe(1);
  });

  it("retries a correction that lands mid-read and caches only the corrected snapshot", async () => {
    await build();
    fake.patch("plays/a", { isTouchdown: false });
    let raced = false;
    fake.beforeFullRead = () => {
      if (raced) return;
      raced = true;
      fake.patch("plays/a", { isHidden: true });
    };
    const corrected = await build();
    expect(getPlayerSeasonStats(corrected, "Quinn")).toMatchObject({ passTD: 0, passAtt: 0, gamesPlayed: 2 });
    fake.beforeFullRead = null;
    fake.fullPlayReads = 0;
    const cached = await build();
    expect(cached.cache).toEqual({ hits: 2, misses: 0 });
    expect(fake.fullPlayReads).toBe(0);
    expect(getPlayerSeasonStats(cached, "Quinn").passAtt).toBe(0);
    fake.patch("plays/a", { isHidden: false });
    expect((await build()).playerStats.Quinn).toMatchObject({ passAtt: 1, passTD: 0 });
  });

  it("returns projected public roster labels only", async () => {
    const summary = await build();
    expect(summary.roster).toEqual([
      { name: "Bench", number: "7" },
      { name: "Quinn", number: "12" },
      { name: "Riley", number: null },
    ]);
    expect(fake.rosterFields).toEqual(["playerName", "number", "teamId", "leagueId", "email", "emails"]);
    expect(JSON.stringify(summary)).not.toMatch(/private note|secret|leaky|Hidden Team|data:big/);
    fake.patch("teams/york_lions", { coachEmail: "coach@example.com" });
    expect((await build()).roster).toEqual([]);
  });
});

function get(teamId: string, headers: Record<string, string> = {}) {
  ip += 1;
  return GET(new Request(`http://localhost/api/public/teams/${teamId}/stat-summary`, {
    headers: { "x-forwarded-for": `10.0.0.${ip}`, ...headers },
  }), { params: Promise.resolve({ teamId }) });
}

describe("team stat summary API", () => {
  beforeEach(() => {
    seedYork();
    fake.put("teams/team_a", { name: "Alpha", shortcode: "ALP", leagueId: "public_league", coachEmail: "coach@example.com" });
    fake.put("teams/team_b", { name: "Beta", leagueId: "private_league" });
    fake.put("leagues/public_league", { visibility: "public" });
    fake.put("leagues/private_league", { visibility: "private" });
    fake.put("matches/l1", { leagueId: "public_league", isHidden: false, status: "completed", homeTeamId: "team_a", awayTeamId: "team_b", homeScore: 7, awayScore: 0 });
    fake.put("plays/l1a", { matchId: "l1", leagueId: "public_league", isHidden: false, possessionTeamId: "team_a", playType: "Run", runnerPlayerId: "Ana", isTouchdown: true });
    fake.put("players/la", { teamId: "team_a", leagueId: "public_league", playerName: "Ana", number: "4" });
    fake.put("players/lb", { teamId: "team_a", leagueId: "other_league", playerName: "Elsewhere", number: "5" });
    verifyIdTokenMock.mockResolvedValue({ uid: "viewer" });
  });

  it("returns York summaries publicly with no-store and only numeric stats", async () => {
    const response = await get("york");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { data } = await response.json();
    expect(data.teamId).toBe("york_lions");
    expect(Object.keys(data).sort()).toEqual(["cache", "completedGames", "didNotPlayCounts", "games", "generatedAt", "playerStats", "roster", "schemaVersion", "teamId", "teamStats"]);
    expect(JSON.stringify(data)).not.toMatch(/coach@|coachNotes/);
  });

  it("requires sign-in and a public league for other teams", async () => {
    expect((await get("team_a")).status).toBe(401);
    const response = await get("team_a", { authorization: "Bearer token" });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.playerStats.Ana).toMatchObject({ rushTD: 1, gamesPlayed: 1 });
    expect(data.roster).toEqual([{ name: "Ana", number: "4" }]);
    expect(JSON.stringify(data)).not.toMatch(/coach@example.com/);
    expect((await get("team_b", { authorization: "Bearer token" })).status).toBe(404);
    expect((await get("missing", { authorization: "Bearer token" })).status).toBe(404);
    verifyIdTokenMock.mockRejectedValueOnce(new Error("bad"));
    expect((await get("team_a", { authorization: "Bearer bad" })).status).toBe(401);
  });

  it("maps failures to generic errors without leaking details", async () => {
    const spy = vi.spyOn(fake, "runTransaction").mockRejectedValueOnce(new Error("internal secret"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await get("york_lions");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to load team stats." });
    spy.mockRestore();
    errorLog.mockRestore();
  });

  it("rate limits repeated callers", async () => {
    const headers = { "x-forwarded-for": "203.0.113.9" };
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await GET(new Request("http://localhost/x", { headers }), { params: Promise.resolve({ teamId: "york" }) })).status);
    }
    expect(statuses.slice(0, 30).every((status) => status === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});

describe("loadTeamSeasonSummary client helper", () => {
  beforeEach(() => {
    seedYork();
    invalidatePublicTeamData();
  });

  it("fetches through the API and exposes roster stats with DNP-aware games played", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const teamId = decodeURIComponent(String(input).split("/")[4]);
      return get(teamId);
    });
    const summary = await loadTeamSeasonSummary("york_lions");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/teams/york_lions/stat-summary", expect.objectContaining({ cache: "no-store" }));
    expect(summary.teamStats.recordFormatted).toBe("1-1-0");
    expect(buildRosterPlayerStats(summary, ["Quinn", "Bench"])).toMatchObject({
      Quinn: { passTD: 1, gamesPlayed: 2 },
      Bench: { passTD: 0, gamesPlayed: 2 },
    });
    // Defaults to the public roster; zero-stat players still get DNP-aware games played.
    expect(Object.keys(buildRosterPlayerStats(summary))).toEqual(["Bench", "Quinn", "Riley"]);
    expect(buildRosterPlayerStats(summary).Bench).toMatchObject({ gamesPlayed: 2, totalTDs: 0 });
    expect(formatPlayerLabel(summary, "Quinn")).toBe("#12 Quinn");
    expect(formatPlayerLabel(summary, "Riley")).toBe("Riley");
    expect(getPlayerNumber(summary, "Bench")).toBe("7");
    await loadTeamSeasonSummary("york_lions");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await loadTeamSeasonSummary("york_lions", { fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockRestore();
  });

  it("scopes cached non-York responses to the signed-in uid", async () => {
    fake.put("teams/team_a", { name: "Alpha", leagueId: "public_league" });
    fake.put("leagues/public_league", { visibility: "public" });
    verifyIdTokenMock.mockImplementation(async (token: string) => ({ uid: token.replace("token-", "") }));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) =>
      get("team_a", (init?.headers || {}) as Record<string, string>));
    const mutableAuth = auth as { currentUser: unknown };
    const signIn = (uid: string) => { mutableAuth.currentUser = { uid, getIdToken: async () => `token-${uid}` }; };
    try {
      signIn("u1");
      await loadTeamSeasonSummary("team_a");
      await loadTeamSeasonSummary("team_a");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      mutableAuth.currentUser = null;
      await expect(loadTeamSeasonSummary("team_a")).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      // Failures are not cached, and another account never reuses u1's entry.
      await expect(loadTeamSeasonSummary("team_a")).rejects.toMatchObject({ status: 401 });
      signIn("u2");
      await loadTeamSeasonSummary("team_a");
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock.mock.calls[3][1]?.headers).toMatchObject({ Authorization: "Bearer token-u2" });
    } finally {
      mutableAuth.currentUser = null;
      fetchMock.mockRestore();
    }
  });

  it("raises typed errors for failures and malformed responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: "Busy" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: { teamId: "x" } }))
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(loadTeamSeasonSummary("york", { fresh: true })).rejects.toMatchObject({ status: 503, message: "Busy" });
    await expect(loadTeamSeasonSummary("york", { fresh: true })).rejects.toMatchObject({ status: 502 });
    await expect(loadTeamSeasonSummary("york", { fresh: true })).rejects.toBeInstanceOf(TeamSeasonSummaryError);
    fetchMock.mockRestore();
  });
});
