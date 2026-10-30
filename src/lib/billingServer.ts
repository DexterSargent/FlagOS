import "server-only";
import Stripe from "stripe";
import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { listHasAccountEmail, loadAccountEmails, matchesAccountEmail } from "@/lib/accountEmailsServer";

/*
 * Stripe subscription billing (Phase 1). Every route is inert unless BILLING_CHECKOUT_ENABLED is
 * "true" and the key, webhook secret and price IDs are configured. Billing records are server-only
 * (Firestore rules deny every path that is not explicitly matched).
 */

export type BillingKind = "team" | "league";
export type AppSubscriptionStatus = "active" | "past_due" | "canceled";

export const BILLING_REQUESTS = "billing_requests";
export const BILLING_ACCOUNTS = "billing_accounts";
export const BILLING_EVENTS = "billing_events";
export const BILLING_CUSTOMERS = "billing_customers";

export const CURRENCY = "cad";
export const TEAM_MONTHLY_CENTS = 4000;
export const LEAGUE_BASE_MONTHLY_CENTS = 4000;
export const LEAGUE_SEAT_MONTHLY_CENTS = 2000;
export const MIN_LEAGUE_TEAMS = 2;
export const MAX_LEAGUE_TEAMS = 64;
const CHECKOUT_LIFETIME_SECONDS = 60 * 60;
// Stripe recommends tagging Checkout flows with a label ending in eight random letters.
const INTEGRATION_SUFFIX = "qmvbtrkz";

export class BillingError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

type BillingConfig = {
  secretKey: string;
  webhookSecret: string;
  teamPrice: string;
  leagueBasePrice: string;
  leagueSeatPrice: string;
  automaticTax: boolean;
};

function readConfig(): BillingConfig | null {
  const value = (name: string) => process.env[name]?.trim() || "";
  const config = {
    secretKey: value("STRIPE_SECRET_KEY"),
    webhookSecret: value("STRIPE_WEBHOOK_SECRET"),
    teamPrice: value("STRIPE_PRICE_TEAM"),
    leagueBasePrice: value("STRIPE_PRICE_LEAGUE_BASE"),
    leagueSeatPrice: value("STRIPE_PRICE_LEAGUE_SEAT"),
    automaticTax: value("STRIPE_AUTOMATIC_TAX") === "true",
  };
  if (!config.secretKey || !config.webhookSecret || !config.teamPrice ||
    !config.leagueBasePrice || !config.leagueSeatPrice) {
    return null;
  }
  return config;
}

/** Paid checkout is available only when explicitly enabled and fully configured. */
export function isBillingEnabled(): boolean {
  return process.env.BILLING_CHECKOUT_ENABLED?.trim() === "true" && readConfig() !== null;
}

function requireConfig(): BillingConfig {
  const config = readConfig();
  if (process.env.BILLING_CHECKOUT_ENABLED?.trim() !== "true" || !config) {
    throw new BillingError("Online subscriptions are not available yet.", 503);
  }
  return config;
}

/** Webhooks stay verifiable even while new checkouts are switched off. */
function requireWebhookConfig(): BillingConfig {
  const config = readConfig();
  if (!config) throw new BillingError("Billing webhooks are not configured.", 503);
  return config;
}

let stripeClient: Stripe | null = null;
let stripeClientKey = "";

export function getStripe(): Stripe {
  const { secretKey } = requireWebhookConfig();
  if (!stripeClient || stripeClientKey !== secretKey) {
    stripeClient = new Stripe(secretKey, { maxNetworkRetries: 2, appInfo: { name: "FlagOS" } });
    stripeClientKey = secretKey;
  }
  return stripeClient;
}

/** Test hook: inject a mocked Stripe client. */
export function setStripeClientForTests(client: Stripe | null): void {
  stripeClient = client;
  stripeClientKey = client ? requireWebhookConfig().secretKey : "";
}

export function leagueMonthlyCents(teamCount: number): number {
  return LEAGUE_BASE_MONTHLY_CENTS + teamCount * LEAGUE_SEAT_MONTHLY_CENTS;
}

export function validateLeagueTeamCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) ||
    value < MIN_LEAGUE_TEAMS || value > MAX_LEAGUE_TEAMS) {
    throw new BillingError(`Choose between ${MIN_LEAGUE_TEAMS} and ${MAX_LEAGUE_TEAMS} teams.`);
  }
  return value;
}

export function toAppStatus(status: Stripe.Subscription.Status): AppSubscriptionStatus {
  if (status === "active" || status === "trialing") return "active";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "past_due";
}

function idOf(value: string | { id: string } | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const ends = subscription.items.data.map((item) => item.current_period_end).filter((end) => end > 0);
  return ends.length ? new Date(Math.max(...ends) * 1000).toISOString() : null;
}

function seatQuantity(subscription: Stripe.Subscription, seatPrice: string): number | null {
  const item = subscription.items.data.find((entry) => entry.price.id === seatPrice);
  return item?.quantity ?? null;
}

export function billingAccountId(kind: BillingKind, entityId: string): string {
  return `${kind}_${entityId}`;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function createCheckoutSession(input: {
  uid: string;
  email: string;
  kind: BillingKind;
  teamCount?: unknown;
  origin: string;
}): Promise<{ url: string; requestId: string }> {
  const config = requireConfig();
  const teamCount = input.kind === "league" ? validateLeagueTeamCount(input.teamCount) : 1;
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Reuse an open session for the same purchase so double-clicks and retries never open a second one.
  const pending = await adminDb.collection(BILLING_REQUESTS)
    .where("uid", "==", input.uid)
    .where("status", "==", "pending")
    .limit(20)
    .get();
  for (const doc of pending.docs) {
    const data = doc.data();
    if (data.kind === input.kind && data.teamCount === teamCount && typeof data.sessionUrl === "string" &&
      typeof data.sessionExpiresAt === "number" && data.sessionExpiresAt > nowSeconds + 120) {
      return { url: data.sessionUrl, requestId: doc.id };
    }
  }

  const requestRef = adminDb.collection(BILLING_REQUESTS).doc();
  await requestRef.set({
    uid: input.uid,
    email: input.email,
    kind: input.kind,
    teamCount,
    currency: CURRENCY,
    monthlyAmountCents: input.kind === "league" ? leagueMonthlyCents(teamCount) : TEAM_MONTHLY_CENTS,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
  });

  const customer = await adminDb.doc(`${BILLING_CUSTOMERS}/${input.uid}`).get();
  const customerId = typeof customer.get("customerId") === "string" ? String(customer.get("customerId")) : "";
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.kind === "league"
    ? [{ price: config.leagueBasePrice, quantity: 1 }, { price: config.leagueSeatPrice, quantity: teamCount }]
    : [{ price: config.teamPrice, quantity: 1 }];
  const metadata = { billingRequestId: requestRef.id, kind: input.kind, uid: input.uid };
  const expiresAt = nowSeconds + CHECKOUT_LIFETIME_SECONDS;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    ...(customerId ? { customer: customerId } : { customer_email: input.email }),
    client_reference_id: requestRef.id,
    metadata,
    subscription_data: { metadata },
    success_url: `${input.origin}/pricing?checkout=success&request=${requestRef.id}`,
    cancel_url: `${input.origin}/pricing?checkout=canceled&request=${requestRef.id}`,
    expires_at: expiresAt,
    integration_identifier: `flagos-${input.kind}-checkout-${INTEGRATION_SUFFIX}`,
    ...(config.automaticTax
      ? {
        automatic_tax: { enabled: true },
        billing_address_collection: "required" as const,
        ...(customerId ? { customer_update: { address: "auto" as const, name: "auto" as const } } : {}),
      }
      : {}),
  }, { idempotencyKey: `flagos-checkout-${requestRef.id}` });

  if (!session.url) throw new BillingError("Stripe did not return a checkout link.", 502);
  await requestRef.update({
    sessionId: session.id,
    sessionUrl: session.url,
    sessionExpiresAt: session.expires_at || expiresAt,
    livemode: session.livemode,
  });
  return { url: session.url, requestId: requestRef.id };
}

/** Records a completed Checkout Session against the request that created it. */
async function markCheckoutPaid(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || session.status !== "complete" ||
    (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")) {
    return;
  }
  // Resolve through the session ID we stored; the reference ID only locates the candidate record.
  const requestId = session.client_reference_id || "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) return;
  const requestRef = adminDb.doc(`${BILLING_REQUESTS}/${requestId}`);
  const customerId = idOf(session.customer);
  const subscriptionId = idOf(session.subscription);
  await adminDb.runTransaction(async (transaction) => {
    const request = await transaction.get(requestRef);
    if (!request.exists || request.get("sessionId") !== session.id) return;
    if (request.get("status") !== "pending" && request.get("status") !== "expired") return;
    transaction.update(requestRef, {
      status: "paid",
      customerId,
      subscriptionId,
      subscriptionStatus: "active",
      paidAt: FieldValue.serverTimestamp(),
    });
    if (customerId) {
      transaction.set(adminDb.doc(`${BILLING_CUSTOMERS}/${request.get("uid")}`), {
        customerId,
        email: request.get("email") || "",
        livemode: session.livemode,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  });
}

export type BillingRequestView = {
  requestId: string;
  status: string;
  kind: BillingKind;
  teamCount: number;
  createdEntityId: string;
};

/** Confirms a checkout directly with Stripe; the success redirect alone never grants access. */
export async function getBillingRequestForUser(requestId: unknown, uid: string): Promise<BillingRequestView> {
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
    throw new BillingError("A valid checkout reference is required.");
  }
  const ref = adminDb.doc(`${BILLING_REQUESTS}/${requestId}`);
  let snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get("uid") !== uid) throw new BillingError("Checkout not found.", 404);
  const sessionId = snapshot.get("sessionId");
  if (snapshot.get("status") === "pending" && typeof sessionId === "string" && isBillingEnabled()) {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.status === "complete") {
      await markCheckoutPaid(session);
    } else if (session.status === "expired") {
      await ref.update({ status: "expired" });
    }
    snapshot = await ref.get();
  }
  return {
    requestId,
    status: String(snapshot.get("status")),
    kind: snapshot.get("kind") === "league" ? "league" : "team",
    teamCount: Number(snapshot.get("teamCount")) || 1,
    createdEntityId: typeof snapshot.get("createdEntityId") === "string" ? snapshot.get("createdEntityId") : "",
  };
}

/** Lists purchases that were paid but not yet turned into a league or team. */
export async function listUnusedPurchases(uid: string): Promise<BillingRequestView[]> {
  const paid = await adminDb.collection(BILLING_REQUESTS)
    .where("uid", "==", uid)
    .where("status", "==", "paid")
    .limit(10)
    .get();
  return paid.docs.map((doc) => ({
    requestId: doc.id,
    status: "paid",
    kind: doc.get("kind") === "league" ? "league" : "team",
    teamCount: Number(doc.get("teamCount")) || 1,
    createdEntityId: "",
  }));
}

// ---------------------------------------------------------------------------
// Creation (called from the secure write route inside its transaction)
// ---------------------------------------------------------------------------

export type BillingClaim = {
  ref: DocumentReference;
  kind: BillingKind;
  uid: string;
  teamCount: number;
  customerId: string;
  subscriptionId: string;
  subscriptionStatus: AppSubscriptionStatus;
  livemode: boolean;
};

/** Reads and validates a paid, unused purchase. Must run before any transaction write. */
export async function readBillingClaim(
  transaction: Transaction,
  requestId: unknown,
  uid: string,
  kind: BillingKind,
): Promise<BillingClaim> {
  if (!isBillingEnabled()) throw new BillingError("Online subscriptions are not available yet.", 403);
  if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) {
    throw new BillingError(kind === "league"
      ? "Subscribe on the pricing page to create a league."
      : "Subscribe on the pricing page to create a team.", 403);
  }
  const ref = adminDb.doc(`${BILLING_REQUESTS}/${requestId}`);
  const request = await transaction.get(ref);
  if (!request.exists || request.get("uid") !== uid || request.get("kind") !== kind) {
    throw new BillingError("This purchase does not belong to your account.", 403);
  }
  if (request.get("status") === "consumed") throw new BillingError("This purchase has already been used.", 409);
  if (request.get("status") !== "paid") throw new BillingError("Payment has not been confirmed yet.", 402);
  const status = request.get("subscriptionStatus");
  return {
    ref,
    kind,
    uid,
    teamCount: Number(request.get("teamCount")) || 1,
    customerId: String(request.get("customerId") || ""),
    subscriptionId: String(request.get("subscriptionId") || ""),
    subscriptionStatus: status === "past_due" || status === "canceled" ? status : "active",
    livemode: request.get("livemode") === true,
  };
}

/** Server-owned subscription details written onto the new league or team. */
export function paidSubscriptionRecord(claim: BillingClaim): Record<string, unknown> {
  const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  if (claim.kind === "league") {
    return {
      plan: "league",
      status: claim.subscriptionStatus,
      baseMonthlyFee: LEAGUE_BASE_MONTHLY_CENTS / 100,
      perTeamMonthlyFee: LEAGUE_SEAT_MONTHLY_CENTS / 100,
      teamCount: claim.teamCount,
      totalMonthlyFee: leagueMonthlyCents(claim.teamCount) / 100,
      billingCycle: "monthly",
      paymentMethod: "paid",
      renewsAt,
    };
  }
  return {
    plan: "team",
    status: claim.subscriptionStatus,
    monthlyFee: TEAM_MONTHLY_CENTS / 100,
    billingCycle: "monthly",
    paymentMethod: "paid",
    renewsAt,
  };
}

/** Marks the purchase used and links the Stripe subscription to the created entity. */
export function consumeBillingClaim(transaction: Transaction, claim: BillingClaim, entityId: string): void {
  transaction.update(claim.ref, {
    status: "consumed",
    createdEntityId: entityId,
    consumedAt: FieldValue.serverTimestamp(),
  });
  transaction.set(adminDb.doc(`${BILLING_ACCOUNTS}/${billingAccountId(claim.kind, entityId)}`), {
    entityKind: claim.kind,
    entityId,
    ownerUid: claim.uid,
    billingRequestId: claim.ref.id,
    customerId: claim.customerId,
    subscriptionId: claim.subscriptionId,
    status: claim.subscriptionStatus,
    teamCount: claim.teamCount,
    currency: CURRENCY,
    livemode: claim.livemode,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Subscription state sync
// ---------------------------------------------------------------------------

/** Mirrors Stripe's subscription state onto the billing account and the league/team it pays for. */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const config = requireWebhookConfig();
  const status = toAppStatus(subscription.status);
  const renewsAt = periodEndIso(subscription);
  const seats = seatQuantity(subscription, config.leagueSeatPrice);

  const requests = await adminDb.collection(BILLING_REQUESTS)
    .where("subscriptionId", "==", subscription.id)
    .limit(5)
    .get();
  for (const request of requests.docs) {
    if (request.get("status") === "paid") await request.ref.update({ subscriptionStatus: status });
  }

  const accounts = await adminDb.collection(BILLING_ACCOUNTS)
    .where("subscriptionId", "==", subscription.id)
    .limit(5)
    .get();
  for (const account of accounts.docs) {
    const kind = account.get("entityKind") === "league" ? "league" : "team";
    const entityId = String(account.get("entityId") || "");
    const accountUpdate: Record<string, unknown> = {
      status,
      stripeStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      renewsAt,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (kind === "league" && seats !== null) accountUpdate.teamCount = seats;
    await account.ref.set(accountUpdate, { merge: true });

    if (!/^[A-Za-z0-9_-]{1,128}$/.test(entityId)) continue;
    const entityRef = adminDb.doc(`${kind === "league" ? "leagues" : "teams"}/${entityId}`);
    const entity = await entityRef.get();
    if (!entity.exists) continue;
    const entityUpdate: Record<string, unknown> = {
      "subscription.status": status,
      "subscription.paymentMethod": "paid",
      "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
    };
    if (renewsAt) entityUpdate["subscription.renewsAt"] = renewsAt;
    if (kind === "league" && seats !== null) {
      entityUpdate["subscription.teamCount"] = seats;
      entityUpdate["subscription.totalMonthlyFee"] = leagueMonthlyCents(seats) / 100;
    }
    await entityRef.update(entityUpdate);
  }
}

async function subscriptionForPaymentIntent(paymentIntentId: string): Promise<string> {
  if (!paymentIntentId) return "";
  const payments = await getStripe().invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    limit: 1,
    expand: ["data.invoice"],
  });
  const invoice = payments.data[0]?.invoice;
  if (!invoice || typeof invoice === "string" || invoice.deleted) return "";
  return idOf(invoice.parent?.subscription_details?.subscription);
}

/** Refunds, disputes and fraud warnings are flagged for the platform admin; nothing is changed automatically. */
async function flagRiskEvent(event: Stripe.Event, paymentIntentId: string, summary: string): Promise<void> {
  const subscriptionId = await subscriptionForPaymentIntent(paymentIntentId);
  if (!subscriptionId) return;
  const accounts = await adminDb.collection(BILLING_ACCOUNTS)
    .where("subscriptionId", "==", subscriptionId)
    .limit(5)
    .get();
  for (const account of accounts.docs) {
    await account.ref.set({
      needsReview: true,
      lastRiskEvent: { type: event.type, eventId: event.id, summary, at: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

async function processEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markCheckoutPaid(event.data.object);
      return;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const requestId = session.client_reference_id || "";
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) return;
      const ref = adminDb.doc(`${BILLING_REQUESTS}/${requestId}`);
      await adminDb.runTransaction(async (transaction) => {
        const request = await transaction.get(ref);
        if (request.exists && request.get("sessionId") === session.id && request.get("status") === "pending") {
          transaction.update(ref, { status: event.type === "checkout.session.expired" ? "expired" : "failed" });
        }
      });
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object);
      return;
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = idOf((invoice as any).parent?.subscription_details?.subscription) || idOf((invoice as any).subscription);
      let sub: Stripe.Subscription | null = null;
      if (subscriptionId) {
        sub = await getStripe().subscriptions.retrieve(subscriptionId);
        await syncSubscription(sub);
      }

      // Zero-Touch Financial Ledger Automation: Record subscription income
      const amountPaid = (invoice.amount_paid ?? 0) / 100;
      if (amountPaid > 0) {
        const entityKind = (sub?.metadata?.kind as "league" | "team") || "league";
        const entityId = sub?.metadata?.entityId || "";
        const entityName = sub?.metadata?.entityName || invoice.customer_name || "Customer";
        const invoiceDate = new Date((invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString().split("T")[0];

        try {
          const existingLedger = await adminDb.collection("platform_ledger")
            .where("stripeInvoiceId", "==", invoice.id)
            .limit(1)
            .get();

          if (existingLedger.empty) {
            await adminDb.collection("platform_ledger").add({
              type: "income",
              amount: Math.round(amountPaid * 100) / 100,
              date: invoiceDate,
              category: "Subscription",
              description: `Stripe automated invoice #${invoice.number || invoice.id.slice(-6)}`,
              customerId: entityId,
              customerKind: entityKind,
              customerName: entityName,
              stripeInvoiceId: invoice.id,
              createdBy: "stripe_webhook",
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (ledgerErr) {
          console.error("Failed to auto-record income ledger entry for invoice:", invoice.id, ledgerErr);
        }
      }
      return;
    }
    case "invoice.payment_failed": {
      // Fetch current state rather than inferring it from the invoice alone.
      const subscriptionId = idOf((event.data.object as any).parent?.subscription_details?.subscription) || idOf((event.data.object as any).subscription);
      if (subscriptionId) await syncSubscription(await getStripe().subscriptions.retrieve(subscriptionId));
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await flagRiskEvent(event, idOf(charge.payment_intent), "Charge refunded");

      // Zero-Touch Financial Ledger Automation: Record refund expense
      const amountRefunded = (charge.amount_refunded ?? 0) / 100;
      if (amountRefunded > 0) {
        const refundDate = new Date((charge.created || Math.floor(Date.now() / 1000)) * 1000).toISOString().split("T")[0];
        try {
          const existingRefund = await adminDb.collection("platform_ledger")
            .where("stripeChargeId", "==", charge.id)
            .limit(1)
            .get();

          if (existingRefund.empty) {
            await adminDb.collection("platform_ledger").add({
              type: "expense",
              amount: Math.round(amountRefunded * 100) / 100,
              date: refundDate,
              category: "Refund",
              description: `Stripe charge refund (${charge.id.slice(-6)})`,
              customerId: "",
              customerKind: "",
              customerName: charge.billing_details?.name || "Customer",
              stripeChargeId: charge.id,
              createdBy: "stripe_webhook",
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        } catch (refundErr) {
          console.error("Failed to auto-record refund ledger entry for charge:", charge.id, refundErr);
        }
      }
      return;
    }
    case "charge.dispute.created":
      await flagRiskEvent(event, idOf(event.data.object.payment_intent), `Dispute opened: ${event.data.object.reason}`);
      return;
    case "radar.early_fraud_warning.created":
      await flagRiskEvent(event, idOf(event.data.object.payment_intent), "Early fraud warning");
      return;
    default:
      return;
  }
}

/** Verifies, de-duplicates and applies a Stripe webhook delivery. */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<{ received: true; duplicate?: true }> {
  const config = requireWebhookConfig();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch {
    throw new BillingError("Invalid webhook signature.", 400);
  }

  const eventRef = adminDb.doc(`${BILLING_EVENTS}/${event.id}`);
  const claimed = await adminDb.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    const state = existing.get("state");
    const startedAt = Number(existing.get("startedAtMs") || 0);
    if (state === "processed" || (state === "processing" && Date.now() - startedAt < 5 * 60_000)) return false;
    transaction.set(eventRef, {
      type: event.type,
      livemode: event.livemode,
      created: event.created,
      state: "processing",
      startedAtMs: Date.now(),
      attempts: FieldValue.increment(1),
      receivedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  if (!claimed) return { received: true, duplicate: true };

  try {
    await processEvent(event);
    await eventRef.set({ state: "processed", processedAt: FieldValue.serverTimestamp(), lastError: FieldValue.delete() }, { merge: true });
  } catch (error) {
    await eventRef.set({
      state: "failed",
      lastError: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    }, { merge: true });
    throw error;
  }
  return { received: true };
}

// ---------------------------------------------------------------------------
// Customer Portal and seat changes
// ---------------------------------------------------------------------------

async function canManageEntity(token: DecodedIdToken, kind: BillingKind, entityId: string): Promise<boolean> {
  if (isPlatformAdminEmail(token.email)) return true;
  if (kind === "league") {
    const [privateDoc, publicDoc] = await Promise.all([
      adminDb.doc(`league_private/${entityId}`).get(),
      adminDb.doc(`leagues/${entityId}`).get(),
    ]);
    return [privateDoc.data(), publicDoc.data()].some((data) => !!data && (
      data.ownerUid === token.uid ||
      listHasAccountEmail(token, data.adminEmails) ||
      listHasAccountEmail(token, data.subscriptionAdminEmails)));
  }
  const [privateDoc, publicDoc] = await Promise.all([
    adminDb.doc(`team_private/${entityId}`).get(),
    adminDb.doc(`teams/${entityId}`).get(),
  ]);
  return [privateDoc.data(), publicDoc.data()].some((data) => !!data && (
    listHasAccountEmail(token, data.adminEmails) ||
    matchesAccountEmail(token, data.coachEmail) ||
    matchesAccountEmail(token, data.adminEmail)));
}

async function loadManagedAccount(token: DecodedIdToken, kind: unknown, entityId: unknown) {
  if ((kind !== "league" && kind !== "team") ||
    typeof entityId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(entityId)) {
    throw new BillingError("A valid league or team is required.");
  }
  if (!(await canManageEntity(token, kind, entityId))) {
    throw new BillingError("Only this account's administrators can manage its billing.", 403);
  }
  const account = await adminDb.doc(`${BILLING_ACCOUNTS}/${billingAccountId(kind, entityId)}`).get();
  if (!account.exists || !account.get("customerId")) {
    throw new BillingError("This account has no online subscription to manage.", 404);
  }
  return { kind: kind as BillingKind, entityId, account };
}

export async function createPortalSession(token: DecodedIdToken, kind: unknown, entityId: unknown, returnUrl: string): Promise<string> {
  requireConfig();
  const { account } = await loadManagedAccount(token, kind, entityId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: String(account.get("customerId")),
    return_url: returnUrl,
  });
  return session.url;
}

export type SeatChangePreview = {
  currentTeamCount: number;
  teamCount: number;
  currency: string;
  amountDueNowCents: number;
  newMonthlyCents: number;
  prorationDate: number;
  takesEffect: "after_payment" | "next_renewal";
};

async function loadSeatChange(token: DecodedIdToken, leagueId: unknown, requested: unknown) {
  const config = requireConfig();
  const teamCount = validateLeagueTeamCount(requested);
  const { entityId, account } = await loadManagedAccount(token, "league", leagueId);
  const teams = await adminDb.collection("teams").where("leagueId", "==", entityId).count().get();
  const existingTeams = teams.data().count;
  if (teamCount < existingTeams) {
    throw new BillingError(`This league has ${existingTeams} teams. Remove teams before lowering the plan below that.`, 409);
  }
  const subscription = await getStripe().subscriptions.retrieve(String(account.get("subscriptionId")));
  const seatItem = subscription.items.data.find((item) => item.price.id === config.leagueSeatPrice);
  if (!seatItem) throw new BillingError("This subscription has no team seats to change.", 409);
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    throw new BillingError("Update the payment method before changing the plan.", 409);
  }
  return { entityId, subscription, seatItem, teamCount, currentTeamCount: seatItem.quantity ?? 0 };
}

export async function previewSeatChange(token: DecodedIdToken, leagueId: unknown, requested: unknown): Promise<SeatChangePreview> {
  const { subscription, seatItem, teamCount, currentTeamCount } = await loadSeatChange(token, leagueId, requested);
  const increase = teamCount > currentTeamCount;
  const prorationDate = Math.floor(Date.now() / 1000);
  let amountDueNowCents = 0;
  if (increase) {
    const invoice = await getStripe().invoices.createPreview({
      customer: idOf(subscription.customer),
      subscription: subscription.id,
      subscription_details: {
        items: [{ id: seatItem.id, quantity: teamCount }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
      },
    });
    amountDueNowCents = invoice.amount_due;
  }
  return {
    currentTeamCount,
    teamCount,
    currency: CURRENCY,
    amountDueNowCents,
    newMonthlyCents: leagueMonthlyCents(teamCount),
    prorationDate,
    takesEffect: increase ? "after_payment" : "next_renewal",
  };
}

/**
 * Additions are invoiced immediately and only apply once paid; reductions bill from the next
 * renewal without a credit. Neither can go below the league's existing teams.
 */
export async function applySeatChange(
  token: DecodedIdToken,
  leagueId: unknown,
  requested: unknown,
  prorationDate: unknown,
): Promise<{ status: "applied" | "payment_required"; teamCount: number }> {
  const { subscription, seatItem, teamCount, currentTeamCount } = await loadSeatChange(token, leagueId, requested);
  if (teamCount === currentTeamCount) return { status: "applied", teamCount };
  const increase = teamCount > currentTeamCount;
  const date = typeof prorationDate === "number" && Number.isInteger(prorationDate) &&
    Math.abs(Date.now() / 1000 - prorationDate) < 3600 ? prorationDate : undefined;
  const updated = await getStripe().subscriptions.update(subscription.id, {
    items: [{ id: seatItem.id, quantity: teamCount }],
    ...(increase
      ? { proration_behavior: "always_invoice" as const, payment_behavior: "pending_if_incomplete" as const, ...(date ? { proration_date: date } : {}) }
      : { proration_behavior: "none" as const }),
  }, { idempotencyKey: `flagos-seats-${subscription.id}-${currentTeamCount}-${teamCount}-${date ?? "renewal"}` });
  await syncSubscription(updated);
  if (updated.pending_update) return { status: "payment_required", teamCount: currentTeamCount };
  return { status: "applied", teamCount };
}

/**
 * Called after a league/team is deleted. Stops future renewals (no automatic refund) and flags the
 * billing account so the platform admin can decide on any refund in Stripe.
 */
export async function handleBilledEntityDeleted(kind: BillingKind, entityId: string): Promise<void> {
  const ref = adminDb.doc(`${BILLING_ACCOUNTS}/${billingAccountId(kind, entityId)}`);
  const account = await ref.get();
  if (!account.exists) return;
  const subscriptionId = String(account.get("subscriptionId") || "");
  let cancelError = "";
  if (subscriptionId && readConfig() && account.get("stripeStatus") !== "canceled") {
    try {
      await getStripe().subscriptions.update(subscriptionId, { cancel_at_period_end: true }, {
        idempotencyKey: `flagos-entity-deleted-${subscriptionId}`,
      });
    } catch (error) {
      cancelError = error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
      console.error("Could not cancel the subscription for a deleted entity:", cancelError);
    }
  }
  await ref.set({
    entityDeleted: true,
    entityDeletedAt: FieldValue.serverTimestamp(),
    needsReview: true,
    ...(cancelError ? { cancelError } : { cancelAtPeriodEnd: true }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

/** Verifies the caller's Firebase ID token and requires a verified email. */
export async function authenticateBillingRequest(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization") || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!idToken) throw new BillingError("Sign in to continue.", 401);
  let token: DecodedIdToken;
  try {
    token = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    throw new BillingError("Your session has expired. Sign in again.", 401);
  }
  if (token.email_verified !== true || typeof token.email !== "string") {
    throw new BillingError("Verify your email before subscribing.", 403);
  }
  await loadAccountEmails(token);
  return token;
}

/** Shared JSON error handling for billing routes; never exposes Stripe internals. */
export function billingErrorResponse(error: unknown, context: string): Response {
  if (error instanceof BillingError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Stripe.errors.StripeError) {
    console.error(`${context} failed (Stripe ${error.type}${error.code ? `/${error.code}` : ""}):`, error.message);
    return Response.json({ error: "The payment service could not complete this request. Try again shortly." }, { status: 502 });
  }
  console.error(`${context} failed:`, error);
  return Response.json({ error: "Billing is temporarily unavailable." }, { status: 500 });
}

/** Billing URLs always point at the configured public site, never a client-supplied host. */
export function appOrigin(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "production" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
    return url.origin;
  }
  return "https://flagos.ca";
}
