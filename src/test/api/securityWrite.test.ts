import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/write/route";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";

const TEAM_ADMIN_EMAILS = ["head@falcons.com", "assistant@falcons.com", "coordinator@falcons.com"];
const PRIMARY_ADMIN_EMAILS = [TEAM_ADMIN_EMAILS[0]];

const { verifyIdTokenMock, runTransactionMock, transaction, batchMock } = vi.hoisted(() => {
  const transaction = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return {
    verifyIdTokenMock: vi.fn(),
    runTransactionMock: vi.fn(),
    transaction,
    batchMock: { delete: vi.fn(), commit: vi.fn() },
  };
});

const emptyQuery = { docs: [] as unknown[] };
const queryResults = new Map<string, { docs: unknown[] }>();

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyIdTokenMock },
  adminDb: {
    doc: vi.fn((path: string) => ({ path, id: path.split("/").pop() })),
    collection: vi.fn((name: string) => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ collection: name })),
        get: vi.fn(async () => queryResults.get(name) || emptyQuery),
      })),
      get: vi.fn(async () => queryResults.get(name) || emptyQuery),
      limit: vi.fn(() => ({ collection: name })),
      doc: vi.fn(() => ({ id: "created-record-id" })),
      add: vi.fn(async () => ({ id: "audit-id" })),
    })),
    batch: vi.fn(() => batchMock),
    runTransaction: runTransactionMock,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

const validToken = {
  uid: "owner-1",
  email: "dextersargent@flagos.ca",
  email_verified: true,
};

const validLeague = {
  leagueName: "Test League",
  shortcode: "TEST",
  tagline: "Test",
  seasonTitle: "2026 Season",
  primaryColor: "#3ca505",
  accentColor: "#3b82f6",
  visibility: "public",
  ownerUid: validToken.uid,
  adminEmails: [validToken.email],
  contactEmail: "contact@example.com",
  subscription: { adminEmails: ["billing@example.com"], status: "active" },
  rules: { playersOnField: 5 },
};

function storedTeamSnapshot(path: string) {
  const data = path === "teams/falcons" ? { name: "Falcons", isStandalone: true, subscription: { status: "active" } }
    : path === "team_private/falcons" ? { adminEmails: TEAM_ADMIN_EMAILS } : undefined;
  return { exists: !!data, data: () => data, get: (_field: string): unknown => undefined };
}

function request(body: unknown, token = "valid-token") {
  return new Request("http://localhost/api/security/write", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("secure data write API", () => {
  describe("private depth charts", () => {
    const payload = { teamId: "falcons", visibleToPlayers: false, charts: [
      { id: "chart", name: "Offense", formationKey: "default:offense", assignments: { QB: ["p1", "p2"] } },
    ] };
    it("saves coach-authored assignments outside public team documents", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[2] });
      const roster = [
        { id: "p1", ref: { path: "players/p1" }, data: () => ({ positions: ["QB"] }) },
        { id: "p2", ref: { path: "players/p2" }, data: () => ({ positions: ["WR", "DB"], depthChartPositions: ["DB"] }) },
      ];
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 2, docs: roster }
        : { exists: false, data: () => undefined });
      const response = await POST(request({ entity: "depth_chart", data: payload }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "team_depth_charts/falcons" }),
        expect.objectContaining({ charts: payload.charts, visibleToPlayers: false }),
      );
      // p1 already plays QB; p2 gains QB from the chart and loses the DB slot it was auto-given.
      expect(transaction.update).toHaveBeenCalledTimes(1);
      expect(transaction.update).toHaveBeenCalledWith({ path: "players/p2" }, {
        positions: ["WR", "QB"], position: "WR", depthChartPositions: ["QB"],
      });
    });
    it("rejects another team's player assignments", async () => {
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 1, docs: [{ id: "p1" }] }
        : { exists: false, data: () => undefined });
      expect((await POST(request({ entity: "depth_chart", data: payload }))).status).toBe(400);
      expect(transaction.set).not.toHaveBeenCalled();
    });
    it("rejects writes by ordinary players", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "player@example.com" });
      transaction.get.mockResolvedValue({ exists: true, data: () => ({ leagueId: "" }) });
      expect((await POST(request({ entity: "depth_chart", data: payload }))).status).toBe(403);
    });
    it("rejects invalid chart structures before transactions", async () => {
      expect((await POST(request({ entity: "depth_chart", data: { ...payload, visibleToPlayers: "yes" } }))).status).toBe(400);
      expect(runTransactionMock).not.toHaveBeenCalled();
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue(validToken);
    runTransactionMock.mockImplementation(async (callback) => {
      const get = transaction.get.getMockImplementation();
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "teams/falcons" || ref.path === "team_private/falcons") return storedTeamSnapshot(ref.path);
        const result = await get?.(ref);
        return { data: () => undefined, get: () => undefined, ...result };
      });
      return callback(transaction);
    });
    transaction.get.mockResolvedValue({ exists: false });
    transaction.getAll.mockImplementation(async (...refs) => refs.map(() => ({
      exists: false, data: () => undefined, get: () => undefined,
    })));
    transaction.get.mockImplementation(async (queryOrRef) => {
      if (queryOrRef && typeof queryOrRef === "object" && "collection" in queryOrRef) {
        return { size: 0 };
      }
      return { exists: false };
    });
  });

  it("creates records through the trusted path and increments the owner quota", async () => {
    const response = await POST(request({
      entity: "league",
      data: validLeague,
    }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "created-record-id" });
    expect(transaction.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringMatching(/^write_counters\//) }),
      expect.objectContaining({ createdCount: 1, limit: 10 }),
    );
    expect(transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: "created-record-id" }),
      expect.objectContaining({
        leagueName: "Test League",
        ownerUid: validToken.uid,
        createdAt: "server-timestamp",
        subscription: { status: "active" },
      }),
    );
    const publicCreate = transaction.create.mock.calls.find(
      ([, record]) => record.leagueName === "Test League",
    );
    expect(publicCreate?.[1]).not.toHaveProperty("adminEmails");
    expect(publicCreate?.[1]).not.toHaveProperty("contactEmail");
    const privateCreate = transaction.create.mock.calls.find(
      ([ref]) => ref.path === "league_private/created-record-id",
    );
    expect(privateCreate?.[1]).toMatchObject({
      ownerUid: validToken.uid,
      adminEmails: [validToken.email],
      subscriptionAdminEmails: ["billing@example.com"],
      contactEmail: "contact@example.com",
    });
    expect(privateCreate?.[1]).not.toHaveProperty("leagueName");
  });

  describe("playbook route payloads", () => {
    beforeEach(() => {
      transaction.get.mockResolvedValue({ exists: false, data: () => undefined });
    });

    function teamPlaybooks() {
      return [
        createDefaultPlaybooks("falcons")[0],
        ...createDefaultPlaybooks("falcons").filter((book) => book.type === "defense"),
      ];
    }

    it.each(TEAM_ADMIN_EMAILS)("saves the full independent team playbooks with route and motion coordinates for coach %s", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      const playbooks = teamPlaybooks();
      playbooks[0].plays[0].players[0].motionPath = [{ x: 40, y: 50 }, { x: 50, y: 50 }];
      const response = await POST(request({
        entity: "playbook", data: { teamId: "falcons", playbooks },
      }));

      expect(await response.json()).toEqual({ id: "playbook" });
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "teams/falcons/meta/playbook" }),
        expect.objectContaining({ playbooks }),
      );
    });

    it("rejects excessively nested route coordinates before starting a transaction", async () => {
      const playbooks = teamPlaybooks();
      const player = playbooks[0].plays[0].players[0];
      player.route = [{ x: { nested: 50 } as unknown as number, y: 50 }];
      const response = await POST(request({
        entity: "playbook", data: { teamId: "falcons", playbooks },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payload nesting is too deep." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it.each(["route", "motionPath"] as const)("still rejects more than 50 %s points", async (field) => {
      const playbooks = teamPlaybooks();
      playbooks[0].plays[0].players[0][field] = Array.from({ length: 51 }, () => ({ x: 50, y: 50 }));
      const response = await POST(request({
        entity: "playbook", data: { teamId: "falcons", playbooks },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "A player route may contain at most 50 points." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("preserves the original nesting limit for other record types", async () => {
      const response = await POST(request({
        entity: "team", data: { teamId: "falcons", playbooks: teamPlaybooks() },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payload nesting is too deep." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("still rejects playbook saves by non-coaches", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "player@example.com" });
      const response = await POST(request({
        entity: "playbook", data: { teamId: "falcons", playbooks: teamPlaybooks() },
      }));

      expect(response.status).toBe(403);
      expect(transaction.set).not.toHaveBeenCalled();
    });
  });
  it("rejects an unverified account before writing", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...validToken, email_verified: false });
    const response = await POST(request({
      entity: "league",
      data: { leagueName: "Test League", shortcode: "TEST" },
    }));

    expect(response.status).toBe(403);
    expect(transaction.create).not.toHaveBeenCalled();
  });

  it("rejects matches that attach another league's team", async () => {
    transaction.get.mockImplementation(async (queryOrRef) => {
      if (queryOrRef && typeof queryOrRef === "object" && "collection" in queryOrRef) {
        return { size: 0 };
      }
      const path = queryOrRef.path;
      if (path === "leagues/league-1") {
        return { exists: true, data: () => ({ ownerUid: validToken.uid }) };
      }
      if (path === "teams/team-a") {
        return { exists: true, data: () => ({ leagueId: "league-1" }) };
      }
      if (path === "teams/team-b") {
        return { exists: true, data: () => ({ leagueId: "league-2" }) };
      }
      return { exists: false, data: () => undefined };
    });

    const response = await POST(request({
      entity: "match",
      data: {
        leagueId: "league-1",
        homeTeamId: "team-a",
        awayTeamId: "team-b",
      },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Every match team must belong to the selected league.",
    });
    expect(transaction.create).not.toHaveBeenCalled();
  });

  it("blocks creation when the legacy-aware quota is already full", async () => {
    transaction.get.mockImplementation(async (queryOrRef) => {
      if (queryOrRef && typeof queryOrRef === "object" && "collection" in queryOrRef) {
        return { size: 10 };
      }
      return { exists: false };
    });
    const response = await POST(request({
      entity: "league",
      data: {
        ...validLeague,
      },
    }));

    expect(response.status).toBe(409);
    expect(transaction.create).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before authentication or writes", async () => {
    const response = await POST(request({
      entity: "player",
      data: { playerName: "x".repeat(300_001), teamId: "team-1" },
    }));

    expect(response.status).toBe(413);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
    expect(transaction.create).not.toHaveBeenCalled();
  });

  describe("platform-owner provisioning", () => {
    const independentTeam = {
      name: "Waterloo Wolves", shortcode: "WAT", leagueId: "", isStandalone: true,
      visibility: "public", primaryColor: "#22c55e", adminEmails: [validToken.email],
      subscription: { plan: "team", status: "active", paymentMethod: "complimentary" },
    };

    it("rejects league creation by anyone other than the platform owner", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "coach@example.com" });
      const response = await POST(request({
        entity: "league", data: { ...validLeague, adminEmails: ["coach@example.com"] },
      }));
      expect(response.status).toBe(403);
      expect(transaction.create).not.toHaveBeenCalled();
    });

    it("rejects team creation by non-owners without a paid plan, even league admins", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "commissioner@example.com" });
      const league = { subscription: { paymentMethod: "complimentary", status: "active", teamCount: 8 } };
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : ref.path === "league_private/league-1"
          ? { exists: true, data: () => ({ adminEmails: ["commissioner@example.com"] }) }
          : ref.path === "leagues/league-1"
            ? { exists: true, data: () => league, get: (field: string) => (league as Record<string, unknown>)[field] }
            : { exists: false, data: () => undefined });
      for (const data of [independentTeam, { name: "Hawks", leagueId: "league-1" }]) {
        const response = await POST(request({ entity: "team", data }));
        expect(response.status).toBe(403);
      }
      expect(transaction.create).not.toHaveBeenCalled();
    });

    describe("with Stripe checkout enabled", () => {
      const billingEnv = {
        BILLING_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "rk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
        STRIPE_PRICE_TEAM: "price_team", STRIPE_PRICE_LEAGUE_BASE: "price_base", STRIPE_PRICE_LEAGUE_SEAT: "price_seat",
      };
      const coach = { ...validToken, uid: "coach-1", email: "coach@example.com" };
      const paidRequest = (fields: Record<string, unknown>) => ({
        exists: true,
        data: () => fields,
        get: (field: string) => fields[field],
      });

      beforeEach(() => {
        for (const [key, value] of Object.entries(billingEnv)) vi.stubEnv(key, value);
        verifyIdTokenMock.mockResolvedValue(coach);
      });
      afterEach(() => vi.unstubAllEnvs());

      it("creates a paid independent team from the buyer's own paid purchase and consumes it", async () => {
        transaction.get.mockImplementation(async (ref) => "collection" in ref
          ? { size: 0 }
          : ref.path === "billing_requests/req-1"
            ? paidRequest({ uid: "coach-1", kind: "team", status: "paid", customerId: "cus_1", subscriptionId: "sub_1", teamCount: 1 })
            : { exists: false, data: () => undefined });
        const response = await POST(request({ entity: "team", data: {
          ...independentTeam, adminEmails: ["someone-else@example.com"], billingRequestId: "req-1",
          subscription: { plan: "team", status: "active", paymentMethod: "complimentary" },
        } }));
        expect(response.status).toBe(201);
        const publicCreate = transaction.create.mock.calls.find(([ref]) => ref.id === "created-record-id");
        expect(publicCreate?.[1]).toMatchObject({ subscription: { paymentMethod: "paid", status: "active" } });
        expect(publicCreate?.[1]).not.toHaveProperty("billingRequestId");
        expect(transaction.create).toHaveBeenCalledWith(
          expect.objectContaining({ path: "team_private/created-record-id" }),
          expect.objectContaining({ adminEmails: ["coach@example.com"] }),
        );
        expect(transaction.update).toHaveBeenCalledWith(
          expect.objectContaining({ path: "billing_requests/req-1" }),
          expect.objectContaining({ status: "consumed", createdEntityId: "created-record-id" }),
        );
        expect(transaction.set).toHaveBeenCalledWith(
          expect.objectContaining({ path: "billing_accounts/team_created-record-id" }),
          expect.objectContaining({ subscriptionId: "sub_1", ownerUid: "coach-1" }),
        );
      });

      it("rejects purchases that are unpaid, already used, the wrong kind, or someone else's", async () => {
        const cases: Array<[Record<string, unknown>, number]> = [
          [{ uid: "coach-1", kind: "team", status: "pending" }, 402],
          [{ uid: "coach-1", kind: "team", status: "consumed" }, 409],
          [{ uid: "coach-1", kind: "league", status: "paid" }, 403],
          [{ uid: "other", kind: "team", status: "paid" }, 403],
        ];
        for (const [fields, status] of cases) {
          transaction.get.mockImplementation(async (ref) => "collection" in ref
            ? { size: 0 }
            : ref.path === "billing_requests/req-1" ? paidRequest(fields) : { exists: false, data: () => undefined });
          const response = await POST(request({ entity: "team", data: { ...independentTeam, billingRequestId: "req-1" } }));
          expect(response.status).toBe(status);
        }
        expect(transaction.create).not.toHaveBeenCalled();
      });

      it("lets a paid league's admin add teams only within the paid team count", async () => {
        const league = { subscription: { paymentMethod: "paid", status: "active", teamCount: 2 } };
        let existingTeams = 1;
        transaction.get.mockImplementation(async (ref) => "collection" in ref
          ? { size: existingTeams }
          : ref.path === "league_private/league-1"
            ? { exists: true, data: () => ({ adminEmails: ["coach@example.com"] }) }
            : ref.path === "leagues/league-1"
              ? { exists: true, data: () => league, get: (field: string) => (league as Record<string, unknown>)[field] }
              : { exists: false, data: () => undefined });
        expect((await POST(request({ entity: "team", data: { name: "Hawks", leagueId: "league-1" } }))).status).toBe(201);
        existingTeams = 2;
        expect((await POST(request({ entity: "team", data: { name: "Owls", leagueId: "league-1" } }))).status).toBe(409);
      });
    });

    it("never lets a league admin rewrite a paid subscription or payment method", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, uid: "coach-1", email: "coach@example.com" });
      const league = { subscription: { paymentMethod: "paid", status: "past_due", teamCount: 4 } };
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : ref.path === "league_private/league-1"
          ? { exists: true, data: () => ({ adminEmails: ["coach@example.com"] }) }
          : ref.path === "leagues/league-1"
            ? { exists: true, data: () => league, get: (field: string) => (league as Record<string, unknown>)[field] }
            : { exists: false, data: () => undefined });
      const response = await POST(request({ entity: "league_update", data: {
        leagueId: "league-1", leagueName: "Renamed",
        subscription: { teamCount: 64, status: "active", paymentMethod: "complimentary" },
      } }));
      expect(response.status).toBe(201);
      const write = transaction.set.mock.calls.find(([ref]) => ref.path === "leagues/league-1");
      expect(write?.[1]).toMatchObject({ leagueName: "Renamed" });
      expect(write?.[1]).not.toHaveProperty("subscription");
    });

    it("lets the platform owner create a paid independent team with private staff emails", async () => {
      const response = await POST(request({ entity: "team", data: independentTeam }));
      expect(response.status).toBe(201);
      const publicCreate = transaction.create.mock.calls.find(([ref]) => ref.id === "created-record-id");
      expect(publicCreate?.[1]).toMatchObject({
        name: "Waterloo Wolves", leagueId: "", isStandalone: true, visibility: "public",
        subscription: { status: "active" },
      });
      expect(publicCreate?.[1]).not.toHaveProperty("adminEmails");
      expect(transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ path: "team_private/created-record-id" }),
        expect.objectContaining({ leagueId: "", adminEmails: [validToken.email] }),
      );
    });

    it("lets the platform owner delete an independent team and purge its data", async () => {
      queryResults.set("players", { docs: [{ id: "p1", ref: { path: "players/p1" } }] });
      queryResults.set("team_stat_game_summaries", { docs: [{ id: "wolves__m1", ref: { path: "team_stat_game_summaries/wolves__m1" } }] });
      queryResults.set("matches", { docs: [
        { id: "m1", ref: { path: "matches/m1" }, get: (field: string) => field === "isStandalone" },
        { id: "m2", ref: { path: "matches/m2" }, get: (field: string) => field === "leagueId" ? "league-1" : false },
      ] });
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : ref.path === "teams/wolves"
          ? { exists: true, data: () => ({ name: "Wolves", leagueId: "" }) }
          : { exists: false, data: () => undefined });
      try {
        const response = await POST(request({ entity: "delete_team", data: { teamId: "wolves", purge: true } }));
        expect(response.status).toBe(201);
        expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "teams/wolves" }));
        const purged = batchMock.delete.mock.calls.map(([ref]) => ref.path);
        expect(purged).toEqual(expect.arrayContaining([
          "team_depth_charts/wolves", "players/p1", "player_private/p1", "matches/m1", "team_stat_game_summaries/wolves__m1",
        ]));
        expect(purged).not.toContain("matches/m2");
        expect(batchMock.commit).toHaveBeenCalled();
      } finally {
        queryResults.clear();
      }
    });

    it("refuses purge requests from non-owners", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "commissioner@example.com" });
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : ref.path === "teams/wolves"
          ? { exists: true, data: () => ({ name: "Wolves", leagueId: "" }) }
          : { exists: false, data: () => undefined });
      const response = await POST(request({ entity: "delete_team", data: { teamId: "wolves", purge: true } }));
      expect(response.status).toBe(403);
      expect(transaction.delete).not.toHaveBeenCalled();
      expect(batchMock.delete).not.toHaveBeenCalled();
    });

    it("refuses an independent team delete by a non-owner with 403 instead of failing", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "stranger@example.com" });
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : ref.path === "teams/wolves"
          ? { exists: true, data: () => ({ name: "Wolves", leagueId: "" }) }
          : { exists: false, data: () => undefined });
      const response = await POST(request({ entity: "delete_team", data: { teamId: "wolves" } }));
      expect(response.status).toBe(403);
      expect(transaction.delete).not.toHaveBeenCalled();
    });
  });

  it("answers an invalid or expired ID token with 401", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("auth/argument-error"));
    const response = await POST(request({ entity: "league", data: validLeague }));
    expect(response.status).toBe(401);
    expect(transaction.create).not.toHaveBeenCalled();
  });

  describe("league deletion", () => {
    beforeEach(() => {
      queryResults.clear();
      batchMock.commit.mockResolvedValue(undefined);
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 1, docs: [{ id: "kept", ref: { path: "teams/kept" } }] }
        : { exists: false, data: () => undefined });
    });

    it("deletes games and both play collections while retaining independent teams", async () => {
      queryResults.set("matches", { docs: [{ id: "m1", ref: { path: "matches/m1" } }] });
      queryResults.set("plays", { docs: [{ ref: { path: "plays/p1" } }] });
      queryResults.set("red_plays", { docs: [{ ref: { path: "red_plays/r1" } }] });
      try {
        const response = await POST(request({ entity: "delete_league", data: { leagueId: "league-1", deleteTeams: false } }));
        expect(response.status).toBe(201);
        expect(transaction.update).toHaveBeenCalledWith({ path: "teams/kept" }, { leagueId: "" });
        expect(batchMock.delete.mock.calls.map(([ref]) => ref.path)).toEqual([
          "plays/p1", "red_plays/r1", "matches/m1",
        ]);
        expect(transaction.delete.mock.calls.map(([ref]) => ref.path)).not.toContain("teams/kept");
      } finally {
        queryResults.clear();
      }
    });

    it("batches large cleanups and supports retry after a failed play batch", async () => {
      queryResults.set("matches", { docs: [{ id: "m1", ref: { path: "matches/m1" } }] });
      queryResults.set("plays", { docs: Array.from({ length: 805 }, (_, i) => ({ ref: { path: `plays/p${i}` } })) });
      batchMock.commit.mockRejectedValueOnce(new Error("Firestore unavailable"));
      try {
        const payload = { entity: "delete_league", data: { leagueId: "league-1", deleteTeams: false } };
        expect((await POST(request(payload))).status).toBe(500);
        expect(batchMock.delete.mock.calls.map(([ref]) => ref.path)).not.toContain("matches/m1");
        vi.clearAllMocks();
        expect((await POST(request(payload))).status).toBe(201);
        expect(batchMock.commit).toHaveBeenCalledTimes(4);
        expect(batchMock.delete).toHaveBeenCalledTimes(806);
        expect(batchMock.commit.mock.invocationCallOrder.map((commitOrder) =>
          batchMock.delete.mock.invocationCallOrder.filter((deleteOrder) => deleteOrder < commitOrder).length,
        )).toEqual([400, 800, 805, 806]);
        expect(batchMock.delete.mock.calls.at(-1)?.[0]).toEqual({ path: "matches/m1" });
      } finally {
        queryResults.clear();
      }
    });

    it("rejects league deletion by ordinary customer admins", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "coach@example.com" });
      expect((await POST(request({ entity: "delete_league", data: { leagueId: "league-1" } }))).status).toBe(403);
      expect(batchMock.delete).not.toHaveBeenCalled();
    });

    it.each([undefined, "yes", 1])("requires an explicit team deletion choice: %s", async (deleteTeams) => {
      expect((await POST(request({ entity: "delete_league", data: { leagueId: "league-1", deleteTeams } }))).status).toBe(400);
      expect(batchMock.delete).not.toHaveBeenCalled();
    });

    it("purges member teams and their data instead of detaching them", async () => {
      queryResults.set("teams", { docs: [{ id: "kept", ref: { path: "teams/kept" } }] });
      queryResults.set("players", { docs: [{ id: "p1", ref: { path: "players/p1" } }] });
      queryResults.set("teams/kept/meta", { docs: [{ ref: { path: "teams/kept/meta/playbooks" } }] });
      try {
        const response = await POST(request({ entity: "delete_league", data: { leagueId: "league-1", deleteTeams: true } }));
        expect(response.status).toBe(201);
        expect(transaction.update).not.toHaveBeenCalled();
        expect(batchMock.delete.mock.calls.map(([ref]) => ref.path)).toEqual(expect.arrayContaining([
          "teams/kept", "team_private/kept", "team_depth_charts/kept", "players/p1",
          "player_private/p1", "teams/kept/meta/playbooks",
        ]));
        expect(batchMock.delete.mock.calls.slice(-2).map(([ref]) => ref.path)).toEqual(["teams/kept", "team_private/kept"]);
      } finally {
        queryResults.clear();
      }
    });

    it("retains the team's league link when a purge fails so the request can be retried", async () => {
      queryResults.set("teams", { docs: [{ id: "kept", ref: { path: "teams/kept" } }] });
      batchMock.commit.mockRejectedValueOnce(new Error("Firestore unavailable"));
      try {
        const payload = { entity: "delete_league", data: { leagueId: "league-1", deleteTeams: true } };
        expect((await POST(request(payload))).status).toBe(500);
        expect(transaction.update).not.toHaveBeenCalled();
        expect(batchMock.delete.mock.calls.map(([ref]) => ref.path)).not.toContain("teams/kept");
        expect((await POST(request(payload))).status).toBe(201);
        expect(batchMock.delete.mock.calls.map(([ref]) => ref.path)).toContain("teams/kept");
      } finally {
        queryResults.clear();
      }
    });
  });

  describe("independent team matches", () => {
    const exhibition = {
      managingTeamId: "falcons", homeTeamId: "falcons",
      awayTeamId: "opponent_waterloo", awayTeamName: "Waterloo",
      isStandalone: true, leagueId: "caller-supplied-league",
    };

    beforeEach(() => {
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : { exists: false, data: () => undefined });
    });

    it.each(TEAM_ADMIN_EMAILS)("allows verified independent team staff %s from stored private admin emails", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      const response = await POST(request({ entity: "match", data: exhibition }));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: "created-record-id" });
      expect(transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: "created-record-id" }),
        expect.objectContaining({ ...exhibition, leagueId: "", isHidden: false }),
      );
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.stringMatching(/^write_counters\/match-team_/) }),
        expect.objectContaining({ createdCount: 1, limit: 512 }),
      );
    });

    it("rejects a missing managing team even for a known coach", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[1] });
      const response = await POST(request({ entity: "match", data: { ...exhibition, managingTeamId: "missing", homeTeamId: "missing" } }));
      expect(response.status).toBe(404);
    });

    it("uses the stored manager league instead of the requested league", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "coach@example.com" });
      transaction.get.mockImplementation(async (ref) => {
        if ("collection" in ref) return { size: 0 };
        return {
          exists: ref.path === "teams/independent",
          data: () => ref.path === "teams/independent"
            ? { leagueId: "real-league", adminEmails: ["coach@example.com"], isStandalone: true }
            : undefined,
        };
      });
      const response = await POST(request({
        entity: "match",
        data: { ...exhibition, managingTeamId: "independent", homeTeamId: "independent" },
      }));
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: "created-record-id" });
      expect(transaction.create).toHaveBeenCalledWith(expect.objectContaining({ id: "created-record-id" }),
        expect.objectContaining({ leagueId: "real-league" }));
    });

    it.each([
      { awayTeamName: "" },
      { awayTeamId: "unregistered-team" },
      { homeTeamId: "opponent_other", homeTeamName: "Other" },
    ])("rejects invalid independent participants %j", async (change) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "assistant@falcons.com" });
      const response = await POST(request({ entity: "match", data: { ...exhibition, ...change } }));
      expect(response.status).toBe(400);
      expect(transaction.create).not.toHaveBeenCalled();
    });

    it("does not let an unlisted user create an independent team's match", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "spectator@example.com" });
      const response = await POST(request({ entity: "match", data: exhibition }));
      expect(response.status).toBe(403);
      expect(transaction.create).not.toHaveBeenCalled();
    });

    it("does not grant independent team staff access to other managing teams", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "assistant@falcons.com" });
      transaction.get.mockImplementation(async (ref) => ({
        exists: ref.path === "teams/another",
        data: () => ref.path === "teams/another" ? { leagueId: "" } : undefined,
      }));
      const response = await POST(request({
        entity: "match", data: { ...exhibition, managingTeamId: "another", homeTeamId: "another" },
      }));
      expect(response.status).toBe(403);
      expect(transaction.create).not.toHaveBeenCalled();
    });

    it("does not allow an unverified requested coach", async () => {
      verifyIdTokenMock.mockResolvedValue({
        ...validToken, email: "assistant@falcons.com", email_verified: false,
      });
      const response = await POST(request({ entity: "match", data: exhibition }));
      expect(response.status).toBe(403);
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("does not mark hidden matches public", async () => {
      const response = await POST(request({
        entity: "match", data: { ...exhibition, isHidden: true },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(expect.anything(),
        expect.objectContaining({ isHidden: true }));
    });

    it.each(["play", "play_batch"])("derives %s visibility and league from the stored match", async (entity) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "coordinator@falcons.com" });
      transaction.get.mockImplementation(async (ref) => {
        if ("collection" in ref) return { size: 0 };
        return {
          exists: ref.path === "matches/exhibition",
          data: () => ref.path === "matches/exhibition"
            ? { ...exhibition, leagueId: "", isHidden: false } : undefined,
        };
      });
      const response = await POST(request({
        entity,
        data: {
          matchId: "exhibition", leagueId: "spoofed", isHidden: true,
          ...(entity === "play_batch" ? { plays: [{ type: "Run", isHidden: true, leagueId: "spoofed" }] } : { type: "Run" }),
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(expect.anything(),
        expect.objectContaining({ matchId: "exhibition", leagueId: "", isHidden: false }));
    });

    it.each(TEAM_ADMIN_EMAILS)("restricts roster deletion to the independent team head coach: %s", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      transaction.get.mockImplementation(async (ref) => ({
        exists: ref.path === "players/player-1",
        data: () => ref.path === "players/player-1" ? { teamId: "falcons", leagueId: "" } : undefined,
      }));
      const response = await POST(request({ entity: "delete_player", data: { playerId: "player-1" } }));
      expect(response.status).toBe(PRIMARY_ADMIN_EMAILS.includes(email) ? 201 : 403);
      expect(transaction.delete).toHaveBeenCalledTimes(PRIMARY_ADMIN_EMAILS.includes(email) ? 2 : 0);
    });

    it("allows a requested coach to add a league-less independent team roster player", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "coordinator@falcons.com" });
      const response = await POST(request({
        entity: "player", data: { teamId: "falcons", playerName: "New Player" },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(
        expect.anything(), expect.objectContaining({ teamId: "falcons", leagueId: "" }),
      );
    });

    it.each(["head@falcons.com", "assistant@falcons.com"])(
      "restricts removal of persisted independent-team playbooks: %s", async (email) => {
        verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
        transaction.get.mockImplementation(async (ref) => ({
          exists: ref.path === "teams/falcons/meta/playbook",
          data: () => ref.path === "teams/falcons/meta/playbook"
            ? { playbooks: [{ id: "book-1", formations: [], plays: [] }] } : undefined,
        }));
        const response = await POST(request({
          entity: "playbook", data: { teamId: "falcons", playbooks: [] },
        }));
        expect(response.status).toBe(PRIMARY_ADMIN_EMAILS.includes(email) ? 201 : 403);
      },
    );

    it("updates league settings for authorized league admin", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      transaction.get.mockImplementation(async (ref) => ({
        exists: ref.path === "leagues/league_apex" || ref.path === "league_private/league_apex",
        data: () => ({
          ...validLeague,
          ownerUid: validToken.uid,
          adminEmails: [validToken.email],
        }),
        get: (field: string) => (field === "subscription" ? { status: "active" } : undefined),
      }));

      const response = await POST(request({
        entity: "league_update",
        data: {
          leagueId: "league_apex",
          leagueName: "Renamed Apex",
          visibility: "private",
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "leagues/league_apex" }),
        expect.objectContaining({ leagueName: "Renamed Apex", visibility: "private" }),
        { merge: true },
      );
    });

    it("updates team private details for authorized team admin", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[0] });
      const response = await POST(request({
        entity: "team_private_update",
        data: {
          teamId: "falcons",
          adminEmails: [TEAM_ADMIN_EMAILS[0], "newcoach@falcons.com"],
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "team_private/falcons" }),
        expect.objectContaining({ adminEmails: [TEAM_ADMIN_EMAILS[0], "newcoach@falcons.com"] }),
        { merge: true },
      );
    });

    it("deletes a team and its private document", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      const response = await POST(request({
        entity: "delete_team",
        data: { teamId: "falcons" },
      }));
      expect(response.status).toBe(201);
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "teams/falcons" }));
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "team_private/falcons" }));
    });

    it("deletes a league and its private document", async () => {

      verifyIdTokenMock.mockResolvedValue(validToken);
      transaction.get.mockImplementation(async (ref) => {
        if ("collection" in ref) return { docs: [] };
        return {
          exists: true,
          data: () => ({
            ...validLeague,
            ownerUid: validToken.uid,
            adminEmails: [validToken.email],
          }),
        };
      });
      const response = await POST(request({
        entity: "delete_league",
        data: { leagueId: "league_apex", deleteTeams: false },
      }));
      expect(response.status).toBe(201);
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "leagues/league_apex" }));
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "league_private/league_apex" }));
    });

    it("updates player public info and private contact details", async () => {

      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[0] });
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "players/p_test") {
          return { exists: true, data: () => ({ teamId: "falcons", depthChartPositions: ["QB"] }) };
        }
        if (ref.path === "teams/falcons" || ref.path === "team_private/falcons") {
          return storedTeamSnapshot(ref.path);
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "player_update",
        data: {
          playerId: "p_test",
          playerName: "Updated Vance",
          number: "12",
          positions: ["QB", "WR"],
          email: "vance@falcons.com",
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "players/p_test" }),
        expect.objectContaining({ playerName: "Updated Vance", number: "12" }),
      );

      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "player_private/p_test" }),
        expect.objectContaining({ email: "vance@falcons.com" }),
        { merge: true },
      );
    });

    it("updates player private contact info directly", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[0] });
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "players/p_test") {
          return { exists: true, data: () => ({ teamId: "falcons" }) };
        }
        if (ref.path === "teams/falcons" || ref.path === "team_private/falcons") {
          return storedTeamSnapshot(ref.path);
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "player_private_update",
        data: {
          playerId: "p_test",
          email: "newemail@falcons.com",
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "player_private/p_test" }),
        expect.objectContaining({ email: "newemail@falcons.com" }),
        { merge: true },
      );
    });

    it("deletes a player and player_private documents", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: TEAM_ADMIN_EMAILS[0] });
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "players/p_test") {
          return { exists: true, data: () => ({ teamId: "falcons" }) };
        }
        if (ref.path === "teams/falcons" || ref.path === "team_private/falcons") {
          return storedTeamSnapshot(ref.path);
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "delete_player",
        data: { playerId: "p_test" },
      }));
      expect(response.status).toBe(201);
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "players/p_test" }));
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "player_private/p_test" }));
    });

    it("updates match teams and manual matchup for scheduled games", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "matches/m_sched") {
          return {
            exists: true,
            data: () => ({ leagueId: "league_apex", status: "scheduled", seasonId: "season-1" }),
            get: (f: string) => (f === "leagueId" ? "league_apex" : f === "status" ? "scheduled" : undefined),
          };
        }
        if (ref.path === "teams/t1" || ref.path === "teams/t2") {
          return {
            exists: true,
            data: () => ({ leagueId: "league_apex" }),
            get: (f: string) => (f === "leagueId" ? "league_apex" : undefined),
          };
        }
        if (ref.path === "leagues/league_apex" || ref.path === "league_private/league_apex") {
          return {
            exists: true,
            data: () => ({ ...validLeague, ownerUid: validToken.uid, adminEmails: [validToken.email] }),
            get: () => undefined,
          };
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "match_update",
        data: {
          matchId: "m_sched",
          homeTeamId: "t1",
          awayTeamId: "t2",
          homeTeamName: "Titans",
          awayTeamName: "Warriors",
          manualMatchup: true,
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "matches/m_sched" }),
        expect.objectContaining({ homeTeamId: "t1", awayTeamId: "t2", manualMatchup: true }),
      );
    });

    it("updates league private contact email and admin emails", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "leagues/league_apex" || ref.path === "league_private/league_apex") {
          return {
            exists: true,
            data: () => ({ ...validLeague, ownerUid: validToken.uid, adminEmails: [validToken.email] }),
            get: () => undefined,
          };
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "league_private_update",
        data: {
          leagueId: "league_apex",
          contactEmail: "commissioner@league.com",
          adminEmails: [validToken.email, "assistant@league.com"],
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "league_private/league_apex" }),
        expect.objectContaining({ contactEmail: "commissioner@league.com" }),
        { merge: true },
      );
    });

    it("replaces a pending touchdown play when PAT play is recorded", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      transaction.get.mockImplementation(async (ref) => {
        if (ref.path === "matches/m_live") {
          return {
            exists: true,
            data: () => ({ leagueId: "league_apex", status: "in_progress", seasonId: "season-1" }),
            get: () => undefined,
          };
        }
        if (ref.path === "plays/play_td_1") {
          return {
            exists: true,
            data: () => ({ matchId: "m_live", conversionPending: true }),
            get: (f: string) => (f === "matchId" ? "m_live" : f === "conversionPending" ? true : undefined),
          };
        }
        if (ref.path === "leagues/league_apex" || ref.path === "league_private/league_apex") {
          return {
            exists: true,
            data: () => ({ ...validLeague, ownerUid: validToken.uid, adminEmails: [validToken.email] }),
            get: () => undefined,
          };
        }
        return { exists: false, data: () => undefined, get: () => undefined };
      });

      const response = await POST(request({
        entity: "play",
        data: {
          matchId: "m_live",
          replacesPlayId: "play_td_1",
          playType: "Pass",
          passOutcome: "Complete",
          qbPlayerId: "Marcus Vance",
          receiverPlayerId: "Leo Sterling",
          isTouchdown: true,
          patPoints: 1,
          patSuccess: true,
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.delete).toHaveBeenCalledWith(expect.objectContaining({ path: "plays/play_td_1" }));
    });
  });

  describe("multi-season support", () => {
    beforeEach(() => {
      runTransactionMock.mockImplementation(async (callback) => callback(transaction));
    });

    it("rejects start_season with invalid fields or mode", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      const res = await POST(request({
        entity: "start_season",
        data: { leagueId: "league_apex", title: "Season 2", teamSelectionMode: "invalid_mode" },
      }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Invalid team selection mode");
    });

    it("rejects start_team_season with invalid roster selection mode", async () => {
      verifyIdTokenMock.mockResolvedValue(validToken);
      const res = await POST(request({
        entity: "start_team_season",
        data: { teamId: "falcons", title: "Season 2", rosterSelectionMode: "invalid_roster_mode" },
      }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("Invalid roster selection mode");
    });
  });
});

