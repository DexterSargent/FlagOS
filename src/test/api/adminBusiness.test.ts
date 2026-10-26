import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/business/route";

const { verifyIdTokenMock, addMock, docMock, listUsersMock, getUserMock, updateUserMock, revokeMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  addMock: vi.fn(),
  docMock: vi.fn(),
  listUsersMock: vi.fn(),
  getUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: {
    verifyIdToken: verifyIdTokenMock,
    listUsers: listUsersMock,
    getUser: getUserMock,
    updateUser: updateUserMock,
    revokeRefreshTokens: revokeMock,
  },
  adminDb: {
    collection: vi.fn(() => ({
      add: addMock,
      orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
      select: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
      count: () => ({ get: async () => ({ data: () => ({ count: 3 }) }) }),
    })),
    doc: docMock,
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

vi.mock("@/lib/platformHealth", () => ({
  computePlatformHealth: vi.fn(async () => ({ generatedAt: "now", issues: [] })),
}));

const owner = { uid: "owner", email: "dextersargent@flagos.ca", email_verified: true };

function request(body: unknown) {
  return new Request("http://localhost/api/admin/business", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin business API", () => {
  const customerSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue(owner);
    addMock.mockResolvedValue({ id: "entry-1" });
    listUsersMock.mockResolvedValue({ users: [], pageToken: undefined });
    docMock.mockImplementation((path: string) => ({
      path,
      get: async () => ({
        exists: true,
        get: (field: string) => (field === "subscription" ? { renewsAt: "2020-01-01T00:00:00Z" } : field === "leagueId" ? "" : field === "name" ? "Solo" : undefined),
      }),
      set: customerSet,
      delete: vi.fn(),
    }));
  });

  it("rejects anyone who is not the platform administrator", async () => {
    verifyIdTokenMock.mockResolvedValue({ uid: "x", email: "coach@example.com", email_verified: true });
    const response = await POST(request({ action: "load" }));
    expect(response.status).toBe(403);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("loads the business snapshot", async () => {
    const response = await POST(request({ action: "load" }));
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({ ledger: [], audit: [], users: [], counts: { leagues: 3, plays: 3 }, warnings: [] });
  });

  it("validates ledger entries", async () => {
    const response = await POST(request({ action: "ledger_add", data: { type: "income", amount: -5, date: "2026-05-01", category: "Subscription" } }));
    expect(response.status).toBe(400);
    const badCategory = await POST(request({ action: "ledger_add", data: { type: "expense", amount: 5, date: "2026-05-01", category: "Subscription" } }));
    expect(badCategory.status).toBe(400);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("records a payment, marks the customer paid, extends renewal, and audits it", async () => {
    const response = await POST(request({
      action: "ledger_add",
      data: { type: "income", amount: 40, date: "2026-05-01", category: "Subscription", customerId: "t1", customerKind: "team", customerName: "Solo", advanceRenewal: true },
    }));
    expect(response.status).toBe(200);
    expect(addMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: "income", amount: 40, customerId: "t1", createdBy: owner.email }));
    expect(docMock).toHaveBeenCalledWith("teams/t1");
    const update = customerSet.mock.calls[0][0];
    expect(update.subscription).toMatchObject({ paymentMethod: "paid", lastPaymentAt: "2026-05-01" });
    expect(Date.parse(update.subscription.renewsAt)).toBeGreaterThan(Date.now());
    expect(addMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: "ledger_income" }));
  });

  it("updates league billing and recomputes the total", async () => {
    const response = await POST(request({
      action: "subscription_update",
      data: { kind: "league", id: "l1", status: "active", paymentMethod: "paid", baseMonthlyFee: 40, perTeamMonthlyFee: 20, teamCount: 6, renewsAt: "2026-06-01" },
    }));
    expect(response.status).toBe(200);
    expect(customerSet).toHaveBeenCalledWith(
      expect.objectContaining({ subscription: expect.objectContaining({ totalMonthlyFee: 160, paymentMethod: "paid", renewsAt: "2026-06-01T12:00:00.000Z" }) }),
      { merge: true },
    );
  });

  it("refuses to disable platform administrators or yourself", async () => {
    expect((await POST(request({ action: "user_set_disabled", data: { uid: "owner", disabled: true } }))).status).toBe(400);
    getUserMock.mockResolvedValue({ uid: "u2", email: "dextersargent@flagos.ca" });
    expect((await POST(request({ action: "user_set_disabled", data: { uid: "u2", disabled: true } }))).status).toBe(400);
    getUserMock.mockResolvedValue({ uid: "u3", email: "spam@example.com" });
    expect((await POST(request({ action: "user_set_disabled", data: { uid: "u3", disabled: true } }))).status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledWith("u3", { disabled: true });
    expect(revokeMock).toHaveBeenCalledWith("u3");
  });

  it("rejects unknown actions and extra fields", async () => {
    expect((await POST(request({ action: "drop_tables" }))).status).toBe(400);
    expect((await POST(request({ action: "ledger_delete", data: { id: "x", extra: 1 } }))).status).toBe(400);
  });
});
