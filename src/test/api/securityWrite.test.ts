import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/write/route";

const { verifyIdTokenMock, runTransactionMock, transaction } = vi.hoisted(() => {
  const transaction = {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    create: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue(validToken);
    runTransactionMock.mockImplementation(async (callback) => callback(transaction));
    transaction.get.mockResolvedValue({ exists: false });
    transaction.getAll.mockResolvedValue([
      { exists: false, data: () => undefined },
      { exists: false, get: () => undefined },
    ]);
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
});
