import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/account/emails/route";

const { records, verifyToken, getUser, createToken, revokeTokens, setClaims, transaction } = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>();
  const snapshot = (path: string) => ({
    exists: records.has(path),
    get: (key: string) => records.get(path)?.[key],
    data: () => records.get(path),
  });
  const transaction = {
    get: vi.fn(async (ref: { path: string }) => snapshot(ref.path)),
    getAll: vi.fn(async (...refs: { path: string }[]) => refs.map((ref) => snapshot(ref.path))),
    set: vi.fn((ref: { path: string }, data: Record<string, unknown>) => records.set(ref.path, data)),
    delete: vi.fn((ref: { path: string }) => records.delete(ref.path)),
  };
  return { records, transaction, verifyToken: vi.fn(), getUser: vi.fn(), createToken: vi.fn(), revokeTokens: vi.fn(), setClaims: vi.fn() };
});

vi.mock("@/lib/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken: verifyToken, getUser, createCustomToken: createToken, revokeRefreshTokens: revokeTokens, setCustomUserClaims: setClaims },
  adminDb: {
    doc: (path: string) => ({ path, get: () => transaction.get({ path }) }),
    runTransaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
  },
}));

const primary = { uid: "primary", email: "primary@example.com", email_verified: true, auth_time: Math.floor(Date.now() / 1000) };
const secondary = { uid: "secondary", email: "secondary@example.com", email_verified: true, auth_time: Math.floor(Date.now() / 1000) };
const request = (action: string, data = {}, token = "primary-token") => new Request("http://localhost/api/account/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ action, ...data }),
});

describe("verified account email connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    records.clear();
    verifyToken.mockImplementation(async (value) => {
      if (value === "primary-token") return primary;
      if (value === "secondary-token") return secondary;
      throw new Error("Invalid token");
    });
    getUser.mockImplementation(async (uid: string) => ({
      uid, email: uid === "primary" ? primary.email : secondary.email, emailVerified: true, disabled: false,
    }));
    createToken.mockResolvedValue("canonical-custom-token");
    revokeTokens.mockResolvedValue(undefined);
    setClaims.mockResolvedValue(undefined);
  });

  it("lists the current identity without exposing another user's connections", async () => {
    const response = await POST(request("list", { uid: "another-account" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { accountUid: "primary", emails: [{ uid: "primary", email: primary.email }] } });
  });

  it("requires authentication and does not accept an email address as ownership proof", async () => {
    expect((await POST(new Request("http://localhost", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await POST(request("connect", { email: secondary.email }))).status).toBe(400);
    expect((await POST(request("connect", { proofToken: "forged" }))).status).toBe(401);
    expect(records.has("account_email_connections/primary")).toBe(false);
  });

  it.each(["primary-token", "secondary-token"])("rejects unverified ownership proof for %s", async (unverifiedToken) => {
    verifyToken.mockImplementation(async (value) => ({
      ...(value === "primary-token" ? primary : secondary), email_verified: value !== unverifiedToken,
    }));
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(403);
  });

  it("requires recent sign-in for both accounts", async () => {
    verifyToken.mockImplementation(async (value) => value === "primary-token" ? primary : { ...secondary, auth_time: 1 });
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(401);
  });

  it("rejects disabled or email-changed identities even with a previously verified token", async () => {
    getUser.mockResolvedValue({ uid: "secondary", email: "changed@example.com", emailVerified: true });
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(401);
  });

  it("connects two proven identities, then resolves the alias to the original UID", async () => {
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(200);
    expect(records.get("account_email_connections/primary")?.emails).toEqual([
      { uid: primary.uid, email: primary.email }, { uid: secondary.uid, email: secondary.email },
    ]);
    const response = await POST(request("resolve", {}, "secondary-token"));
    expect(await response.json()).toEqual({ data: { customToken: "canonical-custom-token" } });
    expect(createToken).toHaveBeenCalledWith(primary.uid, { linkedEmails: [secondary.email] });
    expect(setClaims).toHaveBeenCalledWith(primary.uid, { linkedEmails: [secondary.email] });
    expect(verifyToken).toHaveBeenCalledWith("secondary-token", true);
  });

  it("does not mint a token for unconnected identities or accept a caller-chosen target UID", async () => {
    const response = await POST(request("resolve", { uid: "platform-owner" }, "secondary-token"));
    expect(await response.json()).toEqual({ data: { customToken: null } });
    expect(createToken).not.toHaveBeenCalled();
  });

  it("rejects chains, duplicate connections, and self-connections", async () => {
    expect((await POST(request("connect", { proofToken: "primary-token" }))).status).toBe(409);
    await POST(request("connect", { proofToken: "secondary-token" }));
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(409);
    expect((await POST(request("connect", { proofToken: "primary-token" }, "secondary-token"))).status).toBe(409);
  });

  it("requires membership when resolving an alias and refuses a disabled primary", async () => {
    records.set("account_email_members/secondary", { accountUid: "primary" });
    expect((await POST(request("resolve", {}, "secondary-token"))).status).toBe(409);
    await POST(request("connect", { proofToken: "secondary-token" }));
    records.set("account_email_connections/primary", { emails: [{ uid: secondary.uid, email: secondary.email }] });
    expect((await POST(request("resolve", {}, "secondary-token"))).status).toBe(409);
    expect(createToken).not.toHaveBeenCalled();
  });

  it("disconnects only a member, removes mappings, and revokes primary refresh sessions", async () => {
    await POST(request("connect", { proofToken: "secondary-token" }));
    expect((await POST(request("disconnect", { uid: "unrelated" }))).status).toBe(404);
    expect((await POST(request("disconnect", { uid: primary.uid }))).status).toBe(400);
    expect((await POST(request("disconnect", { uid: secondary.uid }))).status).toBe(200);
    expect(records.has("account_email_members/secondary")).toBe(false);
    expect(records.has("account_email_connections/primary")).toBe(false);
    expect(revokeTokens).toHaveBeenCalledWith(primary.uid);
    const result = await POST(request("resolve", {}, "secondary-token"));
    expect(await result.json()).toEqual({ data: { customToken: null } });
  });

  it("caps connected identities and rate limits account operations", async () => {
    records.set("account_email_connections/primary", { emails: [
      { uid: primary.uid, email: primary.email },
      ...Array.from({ length: 9 }, (_, index) => ({ uid: `other-${index}`, email: `other-${index}@example.com` })),
    ] });
    expect((await POST(request("connect", { proofToken: "secondary-token" }))).status).toBe(400);
    records.set("account_email_limits/primary", { start: Date.now(), count: 30 });
    expect((await POST(request("list"))).status).toBe(429);
  });
});
