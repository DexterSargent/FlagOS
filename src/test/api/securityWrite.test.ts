import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/write/route";
import { YORK_ADMIN_EMAILS, YORK_HEAD_COACH_EMAILS, YORK_TEAM_ALIASES } from "@/lib/yorkStaff";
import { createYorkOffensivePlaybook } from "@/lib/yorkOffensivePlaybook";
import { createDefaultPlaybooks } from "@/lib/playbookTypes";

const { verifyIdTokenMock, runTransactionMock, transaction } = vi.hoisted(() => {
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
  };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyIdTokenMock },
  adminDb: {
    doc: vi.fn((path: string) => ({ path, id: path.split("/").pop() })),
    collection: vi.fn((name: string) => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ collection: name })),
      })),
      doc: vi.fn(() => ({ id: "created-record-id" })),
    })),
    runTransaction: runTransactionMock,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

const validToken = {
  uid: "owner-1",
  email: "dextersargent@gmail.com",
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

function request(body: unknown, token = "valid-token") {
  return new Request("http://localhost/api/security/write", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("secure data write API", () => {
  describe("private depth charts", () => {
    const payload = { teamId: "york_lions", visibleToPlayers: false, charts: [
      { id: "chart", name: "Offense", formationKey: "default:offense", assignments: { QB: ["p1", "p2"] } },
    ] };
    it("saves coach-authored assignments outside public team documents", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: YORK_ADMIN_EMAILS[2] });
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 2, docs: [{ id: "p1" }, { id: "p2" }] }
        : { exists: false, data: () => undefined });
      const response = await POST(request({ entity: "depth_chart", data: payload }));
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "team_depth_charts/york_lions" }),
        expect.objectContaining({ charts: payload.charts, visibleToPlayers: false }),
      );
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
    runTransactionMock.mockImplementation(async (callback) => callback(transaction));
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

    function yorkPlaybooks() {
      return [
        createYorkOffensivePlaybook("york_lions"),
        ...createDefaultPlaybooks("york_lions").filter((book) => book.type === "defense"),
      ];
    }

    it.each(YORK_ADMIN_EMAILS)("saves the full York playbooks with route and motion coordinates for coach %s", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      const playbooks = yorkPlaybooks();
      playbooks[0].plays[0].players[0].motionPath = [{ x: 40, y: 50 }, { x: 50, y: 50 }];
      const response = await POST(request({
        entity: "playbook", data: { teamId: "york_lions", playbooks },
      }));

      expect(await response.json()).toEqual({ id: "playbook" });
      expect(response.status).toBe(201);
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: "teams/york_lions/meta/playbook" }),
        expect.objectContaining({ playbooks }),
      );
    });

    it("rejects excessively nested route coordinates before starting a transaction", async () => {
      const playbooks = yorkPlaybooks();
      const player = playbooks[0].plays[0].players[0];
      player.route = [{ x: { nested: 50 } as unknown as number, y: 50 }];
      const response = await POST(request({
        entity: "playbook", data: { teamId: "york_lions", playbooks },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payload nesting is too deep." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it.each(["route", "motionPath"] as const)("still rejects more than 50 %s points", async (field) => {
      const playbooks = yorkPlaybooks();
      playbooks[0].plays[0].players[0][field] = Array.from({ length: 51 }, () => ({ x: 50, y: 50 }));
      const response = await POST(request({
        entity: "playbook", data: { teamId: "york_lions", playbooks },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "A player route may contain at most 50 points." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("preserves the original nesting limit for other record types", async () => {
      const response = await POST(request({
        entity: "team", data: { teamId: "york_lions", playbooks: yorkPlaybooks() },
      }));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payload nesting is too deep." });
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("still rejects playbook saves by non-coaches", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "player@example.com" });
      const response = await POST(request({
        entity: "playbook", data: { teamId: "york_lions", playbooks: yorkPlaybooks() },
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

  describe("independent team matches", () => {
    const exhibition = {
      managingTeamId: "york_lions", homeTeamId: "york_lions",
      awayTeamId: "opponent_waterloo", awayTeamName: "Waterloo",
      isStandalone: true, leagueId: "caller-supplied-league",
    };

    beforeEach(() => {
      transaction.get.mockImplementation(async (ref) => "collection" in ref
        ? { size: 0 }
        : { exists: false, data: () => undefined });
    });

    it.each(YORK_ADMIN_EMAILS)("allows verified York staff %s without a remote team", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      const response = await POST(request({ entity: "match", data: exhibition }));

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ id: "match_york_created-record-id" });
      expect(transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ path: "matches/match_york_created-record-id" }),
        expect.objectContaining({ ...exhibition, leagueId: "", isHidden: false, isPublicYork: true }),
      );
      expect(transaction.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.stringMatching(/^write_counters\/match-team_/) }),
        expect.objectContaining({ createdCount: 1, limit: 512 }),
      );
    });

    it.each(YORK_TEAM_ALIASES)("recognizes York alias %s", async (teamId) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "tbrown99@my.yorku.ca" });
      const response = await POST(request({
        entity: "match", data: { ...exhibition, managingTeamId: teamId, homeTeamId: teamId },
      }));
      expect(response.status).toBe(201);
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
        expect.objectContaining({ leagueId: "real-league", isPublicYork: false }));
    });

    it.each([
      { awayTeamName: "" },
      { awayTeamId: "unregistered-team" },
      { homeTeamId: "opponent_other", homeTeamName: "Other" },
    ])("rejects invalid independent participants %j", async (change) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "tbrown99@my.yorku.ca" });
      const response = await POST(request({ entity: "match", data: { ...exhibition, ...change } }));
      expect(response.status).toBe(400);
      expect(transaction.create).not.toHaveBeenCalled();
    });

    it("does not grant York staff access to other managing teams", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "tbrown99@my.yorku.ca" });
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
        ...validToken, email: "theobrown24@icloud.com", email_verified: false,
      });
      const response = await POST(request({ entity: "match", data: exhibition }));
      expect(response.status).toBe(403);
      expect(runTransactionMock).not.toHaveBeenCalled();
    });

    it("does not mark hidden matches public", async () => {
      const response = await POST(request({
        entity: "match", data: { ...exhibition, isHidden: true, isPublicYork: true },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(expect.anything(),
        expect.objectContaining({ isHidden: true, isPublicYork: false }));
    });

    it.each(["play", "play_batch"])("derives %s visibility and league from the stored match", async (entity) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "justinfawcett93@gmail.com" });
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
          matchId: "exhibition", leagueId: "spoofed", isHidden: true, isPublicYork: false,
          ...(entity === "play_batch" ? { plays: [{ type: "Run", isHidden: true, leagueId: "spoofed" }] } : { type: "Run" }),
        },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(expect.anything(),
        expect.objectContaining({ matchId: "exhibition", leagueId: "", isHidden: false, isPublicYork: true }));
    });

    it.each(YORK_ADMIN_EMAILS)("restricts roster deletion to the York head coach: %s", async (email) => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
      transaction.get.mockImplementation(async (ref) => ({
        exists: ref.path === "players/player-1",
        data: () => ref.path === "players/player-1" ? { teamId: "york_lions", leagueId: "" } : undefined,
      }));
      const response = await POST(request({ entity: "delete_player", data: { playerId: "player-1" } }));
      expect(response.status).toBe(YORK_HEAD_COACH_EMAILS.includes(email) ? 201 : 403);
      expect(transaction.delete).toHaveBeenCalledTimes(YORK_HEAD_COACH_EMAILS.includes(email) ? 2 : 0);
    });

    it("allows a requested coach to add a league-less York roster player", async () => {
      verifyIdTokenMock.mockResolvedValue({ ...validToken, email: "fawcett1@my.yorku.ca" });
      const response = await POST(request({
        entity: "player", data: { teamId: "york_lions", playerName: "New Player" },
      }));
      expect(response.status).toBe(201);
      expect(transaction.create).toHaveBeenCalledWith(
        expect.anything(), expect.objectContaining({ teamId: "york_lions", leagueId: "" }),
      );
    });

    it.each(["dexters4@my.yorku.ca", "tbrown99@my.yorku.ca"])(
      "restricts removal of persisted York playbooks: %s", async (email) => {
        verifyIdTokenMock.mockResolvedValue({ ...validToken, email });
        transaction.get.mockImplementation(async (ref) => ({
          exists: ref.path === "teams/york_lions/meta/playbook",
          data: () => ref.path === "teams/york_lions/meta/playbook"
            ? { playbooks: [{ id: "book-1", formations: [], plays: [] }] } : undefined,
        }));
        const response = await POST(request({
          entity: "playbook", data: { teamId: "york_lions", playbooks: [] },
        }));
        expect(response.status).toBe(YORK_HEAD_COACH_EMAILS.includes(email) ? 201 : 403);
      },
    );
  });
});
