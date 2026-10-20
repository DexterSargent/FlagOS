import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/security/private/route";

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
});
