import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Minimal in-memory Firestore: enough for the billing module's reads, writes and simple equality queries.
const { store, fakeDb } = vi.hoisted(() => {
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
  return { store, fakeDb };
});

vi.mock("@/lib/firebaseAdmin", () => ({ adminAuth: {}, adminDb: fakeDb }));
vi.mock("@/lib/accountEmailsServer", () => ({ loadAccountEmails: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "ts", increment: (n: number) => n, delete: () => undefined },
}));

import {
  createCheckoutSession, handleStripeWebhook, setStripeClientForTests, syncSubscription, toAppStatus,
  validateLeagueTeamCount, leagueMonthlyCents, getBillingRequestForUser,
} from "@/lib/billingServer";

const env = {
  BILLING_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "rk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x",
  STRIPE_PRICE_TEAM: "price_team", STRIPE_PRICE_LEAGUE_BASE: "price_base", STRIPE_PRICE_LEAGUE_SEAT: "price_seat",
};

const stripe = {
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn() } },
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn() },
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
});
