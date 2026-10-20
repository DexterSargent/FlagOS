import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/private/route";
import { YORK_ADMIN_EMAILS, YORK_TEAM_ALIASES, YORK_TEAM_ID } from "@/lib/yorkStaff";

const {
  verifyIdTokenMock,
  runTransactionMock,
  collectionMock,
  documentGetMock,
  getAllMock,
  transaction,
} = vi.hoisted(() => {
  const transaction = {
    get: vi.fn(),
    set: vi.fn(),
  };
  return {
    verifyIdTokenMock: vi.fn(),
    runTransactionMock: vi.fn(),
    collectionMock: vi.fn(),
    documentGetMock: vi.fn(),
    getAllMock: vi.fn(),
    transaction,
  };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyIdTokenMock },
  adminDb: {
    doc: vi.fn((path: string) => ({
      path,
      get: () => documentGetMock(path),
    })),
    collection: collectionMock,
    getAll: getAllMock,
    runTransaction: runTransactionMock,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

const token = {
  uid: "user-1",
  email: "user@example.com",
  email_verified: true,
};

function request(body: unknown, bearer = "Bearer valid-token") {
  return new Request("http://localhost/api/security/private", {
    method: "POST",
    headers: { authorization: bearer, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private-data API", () => {
  describe("depth chart publication", () => {
    const chart = { id: "chart", name: "Private starters", formationKey: "default:offense", assignments: { QB: ["p1"] } };
    function setupDepth(published: boolean) {
      documentGetMock.mockImplementation(async (path: string) => ({
        exists: true,
        data: () => path === "team_depth_charts/team-1"
          ? { visibleToPlayers: published, charts: [chart] }
          : path === "teams/team-1" ? { name: "Team", leagueId: "league" }
          : path === "team_private/team-1" ? { adminEmails: ["coach@example.com"] } : {},
      }));
    }
    it("returns no assignments or playbook formations when player view is disabled", async () => {
      setupDepth(false);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { charts: [], formations: [], visibleToPlayers: false, canEdit: false } });
    });
    it("lets coaches see hidden charts and edit them", async () => {
      setupDepth(false);
      verifyIdTokenMock.mockResolvedValue({ ...token, email: "coach@example.com" });
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({ charts: [chart], canEdit: true, visibleToPlayers: false });
    });
    it("does not reveal published charts to outsiders", async () => {
      setupDepth(true);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(403);
    });
    it.each(["team-1", "another-team"])("checks actual roster membership for %s", async (playerTeamId) => {
      setupDepth(true);
      collectionMock.mockImplementation((name: string) => ({
        where: () => ({ limit: () => ({ get: async () => ({ docs: name === "player_private" ? [{ id: "p1", data: () => ({ email: token.email }) }] : [] }) }) }),
      }));
      getAllMock.mockResolvedValue([{ id: "p1", exists: true, data: () => ({ playerName: "Player", teamId: playerTeamId }), get: (field: string) => field === "teamId" ? playerTeamId : undefined }]);
      const response = await POST(request({ action: "depth_chart", data: { teamId: "team-1" } }));
      expect(response.status).toBe(playerTeamId === "team-1" ? 200 : 403);
      if (playerTeamId === "team-1") expect((await response.json()).data).toMatchObject({ charts: [chart], canEdit: false });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue(token);
    runTransactionMock.mockImplementation((callback) => callback(transaction));
    transaction.get.mockResolvedValue({
      exists: false,
      get: () => undefined,
    });
    documentGetMock.mockImplementation(async (path: string) => {
      if (path === "teams/team-1") {
        return {
          exists: true,
          data: () => ({ leagueId: "league-1", name: "Team One" }),
        };
      }
      if (path === "team_private/team-1") {
        return {
          exists: true,
          data: () => ({ adminEmails: ["another@example.com"] }),
        };
      }
      return { exists: false, data: () => undefined };
    });
    collectionMock.mockReturnValue({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) })),
      })),
      limit: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) })),
    });
    getAllMock.mockResolvedValue([]);
  });

  it("requires a verified identity", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email_verified: false });
    const response = await POST(request({ action: "lookup", data: {} }));

    expect(response.status).toBe(403);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("does not return team contacts to a non-admin", async () => {
    const response = await POST(request({
      action: "team",
      data: { teamId: "team-1" },
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "You do not have permission to access this team's private data.",
    });
  });

  it("rejects platform-wide contact listings for ordinary users", async () => {
    const response = await POST(request({ action: "admin_overview", data: {} }));

    expect(response.status).toBe(403);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied filters for account email lookup", async () => {
    const response = await POST(request({
      action: "lookup",
      data: { email: "victim@example.com" },
    }));

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("applies weighted read limits before running expensive actions", async () => {
    verifyIdTokenMock.mockResolvedValue({
      ...token,
      email: "coach@example.com",
    });
    transaction.get.mockResolvedValue({
      exists: true,
      get: (field: string) => field === "minuteStart" ? Date.now() : 1_900,
    });

    const response = await POST(request({ action: "lookup", data: {} }));

    expect(response.status).toBe(429);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("does not throttle the platform admin overview", async () => {
    verifyIdTokenMock.mockResolvedValue({
      ...token,
      email: "dextersargent@gmail.com",
    });
    transaction.get.mockResolvedValue({
      exists: true,
      get: (field: string) => field === "minuteStart" ? Date.now() : 1_900,
    });

    const response = await POST(request({ action: "admin_overview", data: {} }));

    expect(response.status).not.toBe(429);
  });

  it.each(YORK_ADMIN_EMAILS)("discovers York for requested coach %s without legacy email fields", async (email) => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email });
    const response = await POST(request({ action: "lookup", data: {} }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { teams: [{ id: YORK_TEAM_ID, name: "York Lions Women's Flag Football" }] },
    });
    expect(getAllMock).toHaveBeenCalledWith(
      ...YORK_TEAM_ALIASES.map((id) => expect.objectContaining({ path: `teams/${id}` })),
    );
  });

  it.each(YORK_TEAM_ALIASES)("allows requested coaches to read private York alias %s without a team document", async (teamId) => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: " THEOBROWN24@ICLOUD.COM " });
    const response = await POST(request({ action: "team", data: { teamId } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { team: { adminEmails: YORK_ADMIN_EMAILS } } });
  });

  it("accepts a lookup request without a data object", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "tbrown99@my.yorku.ca" });
    const response = await POST(request({ action: "lookup" }));
    expect(response.status).toBe(200);
  });

  it("still requires team lookup data", async () => {
    const response = await POST(request({ action: "team" }));
    expect(response.status).toBe(400);
  });

  it("does not grant a requested coach platform administration", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "dexters4@my.yorku.ca" });
    const response = await POST(request({ action: "admin_overview", data: {} }));
    expect(response.status).toBe(403);
  });

  it("does not grant a requested coach another team's private data", async () => {
    verifyIdTokenMock.mockResolvedValue({ ...token, email: "fawcett1@my.yorku.ca" });
    const response = await POST(request({ action: "team", data: { teamId: "team-1" } }));
    expect(response.status).toBe(403);
  });
});
