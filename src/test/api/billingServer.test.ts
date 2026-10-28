import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Minimal in-memory Firestore: enough for the billing module's reads, writes and simple equality queries.
const { store, fakeDb, fakeAuth } = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  let nextId = 0;
  const applyUpdate = (target: Record<string, unknown>, update: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(update)) {
      const parts = key.split(".");
      let node = target;
      for (const part of parts.slice(0, -1)) {
        node[part] = { ...((node[part] as Record<string, unknown>) || {}) };
        node = node[part] as Record<string, unknown>;
      }
      node[parts[parts.length - 1]] = value;
    }
  };
  const snapshot = (path: string) => {
    const data = store.get(path);
    return {
      id: path.split("/").pop(),
      exists: data !== undefined,
      ref: docRef(path),
      data: () => data,
      get: (field: string) => data?.[field],
    };
  };
  function docRef(path: string) {
    return {
      path,
      id: path.split("/").pop() as string,
      get: async () => snapshot(path),
      set: async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
        store.set(path, options?.merge ? { ...(store.get(path) || {}), ...data } : { ...data });
      },
      update: async (data: Record<string, unknown>) => {
        const current = { ...(store.get(path) || {}) };
        applyUpdate(current, data);
        store.set(path, current);
      },
    };
  }
  const query = (name: string, filters: Array<[string, unknown]>) => ({
    where: (field: string, _op: string, value: unknown) => query(name, [...filters, [field, value]]),
    limit: () => query(name, filters),
    count: () => ({
      get: async () => {
        const docs = [...store.keys()]
          .filter((path) => path.startsWith(`${name}/`) && path.split("/").length === 2)
          .filter((path) => filters.every(([field, value]) => store.get(path)?.[field] === value));
        return { data: () => ({ count: docs.length }) };
      },
    }),
    get: async () => ({
      docs: [...store.keys()]
        .filter((path) => path.startsWith(`${name}/`) && path.split("/").length === 2)
        .filter((path) => filters.every(([field, value]) => store.get(path)?.[field] === value))
        .map(snapshot),
    }),
  });
  const fakeDb = {
    doc: (path: string) => docRef(path),
    collection: (name: string) => ({
      ...query(name, []),
      doc: () => docRef(`${name}/req_${++nextId}`),
    }),
    runTransaction: async <T>(fn: (transaction: unknown) => Promise<T>) => fn({
      get: async (ref: { path: string }) => snapshot(ref.path),
      set: (ref: { set: (data: unknown, options?: unknown) => Promise<void> }, data: unknown, options?: unknown) => { void ref.set(data, options); },
      update: (ref: { update: (data: unknown) => Promise<void> }, data: unknown) => { void ref.update(data); },
    }),
  };
  const fakeAuth = {
    verifyIdToken: vi.fn(),
  };
  return { store, fakeDb, fakeAuth };
});

vi.mock("@/lib/firebaseAdmin", () => ({ adminAuth: fakeAuth, adminDb: fakeDb }));
vi.mock("@/lib/accountEmailsServer", () => ({
  loadAccountEmails: vi.fn().mockResolvedValue(undefined),
  listHasAccountEmail: vi.fn((token: any, list: any) => Array.isArray(list) && list.includes(token?.email)),
  matchesAccountEmail: vi.fn((token: any, email: any) => token?.email === email),
}));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "ts", increment: (n: number) => n, delete: () => undefined },
}));

import {
  createCheckoutSession, handleStripeWebhook, setStripeClientForTests, syncSubscription, toAppStatus,
  validateLeagueTeamCount, leagueMonthlyCents, getBillingRequestForUser, listUnusedPurchases,
  readBillingClaim, paidSubscriptionRecord, consumeBillingClaim,
  createPortalSession, previewSeatChange, applySeatChange, handleBilledEntityDeleted,
  authenticateBillingRequest, billingErrorResponse, appOrigin, BillingError, isBillingEnabled,
} from "@/lib/billingServer";
import StripeClass from "stripe";

const env = {
  BILLING_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "rk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  STRIPE_PRICE_TEAM: "price_team", STRIPE_PRICE_LEAGUE_BASE: "price_base", STRIPE_PRICE_LEAGUE_SEAT: "price_seat",
};

const stripe = {
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  billingPortal: { sessions: { create: vi.fn() } },
  invoices: { createPreview: vi.fn() },
  invoicePayments: { list: vi.fn() },
};

function subscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    status: "active",
    cancel_at_period_end: false,
    items: { data: [
      { price: { id: "price_base" }, quantity: 1, current_period_end: 1_900_000_000 },
      { price: { id: "price_seat" }, quantity: 6, current_period_end: 1_900_000_000 },
    ] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("billing server", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    setStripeClientForTests(stripe as unknown as Stripe);
    stripe.checkout.sessions.create.mockResolvedValue({
      id: "cs_1", url: "https://checkout.stripe.com/c/cs_1", expires_at: Math.floor(Date.now() / 1000) + 3600, livemode: false,
    });
  });
  afterEach(() => {
    setStripeClientForTests(null);
    vi.unstubAllEnvs();
  });

  it("maps Stripe statuses to app access and validates league sizes", () => {
    expect(toAppStatus("active")).toBe("active");
    expect(toAppStatus("trialing")).toBe("active");
    expect(toAppStatus("past_due")).toBe("past_due");
    expect(toAppStatus("unpaid")).toBe("past_due");
    expect(toAppStatus("canceled")).toBe("canceled");
    expect(toAppStatus("incomplete_expired")).toBe("canceled");
    expect(leagueMonthlyCents(10)).toBe(24_000);
    expect(() => validateLeagueTeamCount(1)).toThrow();
    expect(() => validateLeagueTeamCount(65)).toThrow();
    expect(() => validateLeagueTeamCount(4.5)).toThrow();
    expect(validateLeagueTeamCount(12)).toBe(12);
  });

  it("creates a league checkout with server prices and reuses the open session on retry", async () => {
    const first = await createCheckoutSession({ uid: "u1", email: "c@x.ca", kind: "league", teamCount: 6, origin: "https://flagos.ca" });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const [params, options] = stripe.checkout.sessions.create.mock.calls[0];
    expect(params).toMatchObject({
      mode: "subscription",
      customer_email: "c@x.ca",
      client_reference_id: first.requestId,
      line_items: [{ price: "price_base", quantity: 1 }, { price: "price_seat", quantity: 6 }],
      success_url: `https://flagos.ca/pricing?checkout=success&request=${first.requestId}`,
    });
    expect(params).not.toHaveProperty("payment_method_types");
    expect(params).not.toHaveProperty("automatic_tax");
    expect(options).toEqual({ idempotencyKey: `flagos-checkout-${first.requestId}` });
    expect(store.get(`billing_requests/${first.requestId}`)).toMatchObject({ status: "pending", monthlyAmountCents: 16_000 });

    const again = await createCheckoutSession({ uid: "u1", email: "c@x.ca", kind: "league", teamCount: 6, origin: "https://flagos.ca" });
    expect(again).toEqual(first);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it("refuses checkout while the launch flag is off", async () => {
    vi.stubEnv("BILLING_CHECKOUT_ENABLED", "false");
    await expect(createCheckoutSession({ uid: "u1", email: "c@x.ca", kind: "team", origin: "https://flagos.ca" }))
      .rejects.toMatchObject({ status: 503 });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("marks a purchase paid only when the completed session matches the stored one, and ignores duplicate events", async () => {
    store.set("billing_requests/req_a", { uid: "u1", email: "c@x.ca", kind: "team", teamCount: 1, status: "pending", sessionId: "cs_real" });
    const completed = (sessionId: string, eventId: string) => ({
      id: eventId,
      type: "checkout.session.completed",
      livemode: false,
      created: 1,
      data: { object: {
        id: sessionId, mode: "subscription", status: "complete", payment_status: "paid",
        client_reference_id: "req_a", customer: "cus_1", subscription: "sub_1", livemode: false,
      } },
    });

    stripe.webhooks.constructEvent.mockReturnValueOnce(completed("cs_forged", "evt_1"));
    await handleStripeWebhook("{}", "sig");
    expect(store.get("billing_requests/req_a")?.status).toBe("pending");

    stripe.webhooks.constructEvent.mockReturnValueOnce(completed("cs_real", "evt_2"));
    await expect(handleStripeWebhook("{}", "sig")).resolves.toEqual({ received: true });
    expect(store.get("billing_requests/req_a")).toMatchObject({ status: "paid", customerId: "cus_1", subscriptionId: "sub_1" });
    expect(store.get("billing_customers/u1")).toMatchObject({ customerId: "cus_1" });
    expect(store.get("billing_events/evt_2")).toMatchObject({ state: "processed" });

    stripe.webhooks.constructEvent.mockReturnValueOnce(completed("cs_real", "evt_2"));
    await expect(handleStripeWebhook("{}", "sig")).resolves.toEqual({ received: true, duplicate: true });
  });

  it("rejects webhooks with a bad signature", async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => { throw new Error("bad"); });
    await expect(handleStripeWebhook("{}", "sig")).rejects.toMatchObject({ status: 400 });
  });

  it("syncs subscription status, renewal and seat count onto the league", async () => {
    store.set("billing_accounts/league_L1", { entityKind: "league", entityId: "L1", subscriptionId: "sub_1" });
    store.set("leagues/L1", { leagueName: "L", subscription: { paymentMethod: "paid", status: "active", teamCount: 4, plan: "league" } });

    await syncSubscription(subscription({ status: "past_due" }));

    expect(store.get("leagues/L1")?.subscription).toMatchObject({
      plan: "league", status: "past_due", paymentMethod: "paid", teamCount: 6, totalMonthlyFee: 160,
      renewsAt: new Date(1_900_000_000 * 1000).toISOString(),
    });
    expect(store.get("billing_accounts/league_L1")).toMatchObject({ status: "past_due", stripeStatus: "past_due", teamCount: 6 });
  });

  it("confirms a returning buyer's checkout with Stripe instead of trusting the redirect", async () => {
    store.set("billing_requests/req_b", { uid: "u1", email: "c@x.ca", kind: "team", teamCount: 1, status: "pending", sessionId: "cs_b" });
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: "cs_b", mode: "subscription", status: "complete", payment_status: "paid",
      client_reference_id: "req_b", customer: "cus_2", subscription: "sub_2", livemode: false,
    });
    await expect(getBillingRequestForUser("req_b", "someone-else")).rejects.toMatchObject({ status: 404 });
    await expect(getBillingRequestForUser("req_b", "u1")).resolves.toMatchObject({ status: "paid", kind: "team" });
  });

  it("lists unused paid purchases for a user", async () => {
    store.set("billing_requests/req_paid1", { uid: "user_buyer", status: "paid", kind: "team", teamCount: 1 });
    store.set("billing_requests/req_used", { uid: "user_buyer", status: "consumed", kind: "team", teamCount: 1 });
    store.set("billing_requests/req_paid2", { uid: "user_buyer", status: "paid", kind: "league", teamCount: 8 });

    const unused = await listUnusedPurchases("user_buyer");
    expect(unused).toHaveLength(2);
    expect(unused.some((u) => u.requestId === "req_paid1")).toBe(true);
    expect(unused.some((u) => u.requestId === "req_paid2")).toBe(true);
  });

  it("reads and consumes billing claim in a transaction", async () => {
    store.set("billing_requests/req_claim", {
      uid: "user_buyer",
      status: "paid",
      kind: "league",
      teamCount: 6,
      customerId: "cus_claim",
      subscriptionId: "sub_claim",
      livemode: false,
    });

    const mockTransaction = {
      get: async (ref: any) => ref.get(),
      update: vi.fn(),
      set: vi.fn(),
    };

    const claim = await readBillingClaim(mockTransaction as any, "req_claim", "user_buyer", "league");
    expect(claim).toMatchObject({
      kind: "league",
      uid: "user_buyer",
      teamCount: 6,
      customerId: "cus_claim",
      subscriptionId: "sub_claim",
    });

    const subRecord = paidSubscriptionRecord(claim);
    expect(subRecord).toMatchObject({
      plan: "league",
      teamCount: 6,
      status: "active",
      paymentMethod: "paid",
    });

    consumeBillingClaim(mockTransaction as any, claim, "league_created");
    expect(mockTransaction.update).toHaveBeenCalledWith(
      claim.ref,
      expect.objectContaining({ status: "consumed", createdEntityId: "league_created" })
    );
    expect(mockTransaction.set).toHaveBeenCalled();
  });

  it("handles portal session creation for authorized admins", async () => {
    store.set("billing_accounts/league_L_portal", {
      entityKind: "league",
      entityId: "L_portal",
      customerId: "cus_portal_123",
      subscriptionId: "sub_portal_123",
    });
    store.set("leagues/L_portal", {
      leagueName: "Portal League",
      ownerUid: "u_owner",
      adminEmails: ["admin@portal.ca"],
    });

    stripe.billingPortal.sessions.create.mockResolvedValue({
      url: "https://billing.stripe.com/portal_session_abc",
    });

    const token = { uid: "u_owner", email: "admin@portal.ca", email_verified: true } as any;
    const url = await createPortalSession(token, "league", "L_portal", "https://flagos.ca/leagues");
    expect(url).toBe("https://billing.stripe.com/portal_session_abc");
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_portal_123",
      return_url: "https://flagos.ca/leagues",
    });

    // Unauthorized user
    const badToken = { uid: "u_other", email: "stranger@other.com", email_verified: true } as any;
    await expect(createPortalSession(badToken, "league", "L_portal", "https://flagos.ca"))
      .rejects.toThrow("Only this account's administrators can manage its billing.");
  });

  it("previews and applies team seat adjustments", async () => {
    store.set("billing_accounts/league_L_seats", {
      entityKind: "league",
      entityId: "L_seats",
      customerId: "cus_seats_123",
      subscriptionId: "sub_seats_123",
    });
    store.set("leagues/L_seats", {
      leagueName: "Seats League",
      ownerUid: "u_seats",
      adminEmails: ["admin@seats.ca"],
    });
    // Add 4 existing teams in this league
    for (let i = 1; i <= 4; i++) {
      store.set(`teams/team_${i}`, { leagueId: "L_seats", teamName: `Team ${i}` });
    }

    const currentSub = subscription({
      id: "sub_seats_123",
      customer: "cus_seats_123" as any,
      items: {
        data: [
          { id: "si_base", price: { id: "price_base" }, quantity: 1, current_period_end: 1_900_000_000 },
          { id: "si_seat", price: { id: "price_seat" }, quantity: 6, current_period_end: 1_900_000_000 },
        ],
      } as any,
    });
    stripe.subscriptions.retrieve.mockResolvedValue(currentSub);
    stripe.invoices.createPreview.mockResolvedValue({ amount_due: 4000 });

    const token = { uid: "u_seats", email: "admin@seats.ca", email_verified: true } as any;

    // Disallow lowering below existing teams count (4 teams)
    await expect(previewSeatChange(token, "L_seats", 3))
      .rejects.toThrow(/This league has 4 teams/);

    // Preview seat increase (6 -> 8 teams)
    const previewIncrease = await previewSeatChange(token, "L_seats", 8);
    expect(previewIncrease.currentTeamCount).toBe(6);
    expect(previewIncrease.teamCount).toBe(8);
    expect(previewIncrease.takesEffect).toBe("after_payment");
    expect(previewIncrease.amountDueNowCents).toBe(4000);
    expect(stripe.invoices.createPreview).toHaveBeenCalled();

    // Preview seat decrease (6 -> 4 teams)
    const previewDecrease = await previewSeatChange(token, "L_seats", 4);
    expect(previewDecrease.takesEffect).toBe("next_renewal");
    expect(previewDecrease.amountDueNowCents).toBe(0);

    // Apply seat change: same count returns immediately without stripe call
    const sameResult = await applySeatChange(token, "L_seats", 6, undefined);
    expect(sameResult).toEqual({ status: "applied", teamCount: 6 });

    // Apply seat increase
    stripe.subscriptions.update.mockResolvedValue({
      ...currentSub,
      pending_update: null,
      items: {
        data: [
          { id: "si_base", price: { id: "price_base" }, quantity: 1, current_period_end: 1_900_000_000 },
          { id: "si_seat", price: { id: "price_seat" }, quantity: 8, current_period_end: 1_900_000_000 },
        ],
      },
    });
    const applyIncrease = await applySeatChange(token, "L_seats", 8, undefined);
    expect(applyIncrease).toEqual({ status: "applied", teamCount: 8 });
    expect(stripe.subscriptions.update).toHaveBeenCalled();
  });

  it("handles entity deletion by setting cancel_at_period_end and flagging billing account", async () => {
    store.set("billing_accounts/league_L_del", {
      entityKind: "league",
      entityId: "L_del",
      subscriptionId: "sub_del_999",
      stripeStatus: "active",
    });

    stripe.subscriptions.update.mockResolvedValue({});

    await handleBilledEntityDeleted("league", "L_del");
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_del_999",
      { cancel_at_period_end: true },
      expect.objectContaining({ idempotencyKey: expect.stringContaining("flagos-entity-deleted") })
    );
    expect(store.get("billing_accounts/league_L_del")).toMatchObject({
      entityDeleted: true,
      needsReview: true,
      cancelAtPeriodEnd: true,
    });
  });

  it("authenticates billing request and validates verified email", async () => {
    // Missing auth header
    const reqNoAuth = new Request("https://flagos.ca/api/billing");
    await expect(authenticateBillingRequest(reqNoAuth)).rejects.toMatchObject({ status: 401 });

    // Expired or bad token
    fakeAuth.verifyIdToken.mockRejectedValueOnce(new Error("Token expired"));
    const reqBadAuth = new Request("https://flagos.ca/api/billing", {
      headers: { authorization: "Bearer bad_token" },
    });
    await expect(authenticateBillingRequest(reqBadAuth)).rejects.toMatchObject({ status: 401 });

    // Unverified email
    fakeAuth.verifyIdToken.mockResolvedValueOnce({ uid: "u_unverified", email: "unverified@x.ca", email_verified: false });
    const reqUnverified = new Request("https://flagos.ca/api/billing", {
      headers: { authorization: "Bearer unverified_token" },
    });
    await expect(authenticateBillingRequest(reqUnverified)).rejects.toMatchObject({ status: 403 });

    // Valid token with verified email
    fakeAuth.verifyIdToken.mockResolvedValueOnce({ uid: "u_valid", email: "valid@x.ca", email_verified: true });
    const reqValid = new Request("https://flagos.ca/api/billing", {
      headers: { authorization: "Bearer valid_token" },
    });
    const verified = await authenticateBillingRequest(reqValid);
    expect(verified.uid).toBe("u_valid");
    expect(verified.email).toBe("valid@x.ca");
  });

  it("formats billing error responses appropriately", () => {
    const customError = new BillingError("Quota exceeded", 409);
    const resCustom = billingErrorResponse(customError, "test");
    expect(resCustom.status).toBe(409);

    const genericError = new Error("Something broke");
    const resGeneric = billingErrorResponse(genericError, "test");
    expect(resGeneric.status).toBe(500);
  });

  it("determines application origin based on environment or request", () => {
    // Configured via APP_BASE_URL
    vi.stubEnv("APP_BASE_URL", "https://staging.flagos.ca/");
    expect(appOrigin(new Request("https://other.com/api"))).toBe("https://staging.flagos.ca");

    vi.stubEnv("APP_BASE_URL", "");
    // Default fallback
    expect(appOrigin(new Request("https://custom-domain.com/api"))).toBe("https://flagos.ca");
    // Localhost in non-prod
    vi.stubEnv("NODE_ENV", "development");
    expect(appOrigin(new Request("http://localhost:3000/api"))).toBe("http://localhost:3000");
  });

  it("processes various webhook lifecycle events", async () => {
    // 1. checkout.session.expired
    store.set("billing_requests/req_expired", {
      uid: "u1", sessionId: "cs_expired", status: "pending",
    });
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: "evt_exp",
      type: "checkout.session.expired",
      livemode: false,
      created: 100,
      data: { object: { id: "cs_expired", client_reference_id: "req_expired" } },
    });
    await handleStripeWebhook("{}", "sig");
    expect(store.get("billing_requests/req_expired")?.status).toBe("expired");

    // 2. invoice.paid
    stripe.subscriptions.retrieve.mockResolvedValueOnce(subscription({ status: "active" }));
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: "evt_inv_paid",
      type: "invoice.paid",
      livemode: false,
      created: 101,
      data: {
        object: {
          id: "in_1",
          parent: { subscription_details: { subscription: "sub_1" } },
        },
      },
    });
    await handleStripeWebhook("{}", "sig");
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_1");

    // 3. charge.refunded
    stripe.invoicePayments.list.mockResolvedValueOnce({
      data: [{ invoice: { parent: { subscription_details: { subscription: "sub_1" } } } }],
    });
    store.set("billing_accounts/league_L1", { subscriptionId: "sub_1" });
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      id: "evt_ref",
      type: "charge.refunded",
      livemode: false,
      created: 102,
      data: { object: { payment_intent: "pi_1" } },
    });
    await handleStripeWebhook("{}", "sig");
    expect(store.get("billing_accounts/league_L1")?.needsReview).toBe(true);
  });
});

