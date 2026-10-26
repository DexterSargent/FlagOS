import { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { readLimitedRequestBody, RequestBodyTooLargeError } from "@/lib/limitedRequestBody";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, toMillis } from "@/lib/adminMetrics";
import { computePlatformHealth } from "@/lib/platformHealth";
import { enqueueNotification, loadNotificationSnapshot, notificationConfiguration, processNotificationQueue } from "@/lib/notificationsServer";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 8_000;
const LEDGER_COLLECTION = "platform_ledger";
const AUDIT_COLLECTION = "platform_audit";
const MAX_USERS = 5_000;
const ACTIONS = ["load", "health", "notifications", "notification_test", "notification_process", "ledger_add", "ledger_delete", "subscription_update", "user_set_disabled"] as const;
type Action = (typeof ACTIONS)[number];
const STATUSES = ["active", "trial", "past_due", "canceled", "archived"];
const DOCUMENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fail(message: string, status = 400): never {
  throw new RequestError(message, status);
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined || value === null || value === "") {
    if (required) fail(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") fail(`${field} must be text.`);
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${field} is required.`);
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer.`);
  return trimmed;
}

function money(value: unknown, field: string, { allowZero = false } = {}): number {
  const amount = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0) || amount > 10_000_000) {
    fail(`${field} must be a valid amount.`);
  }
  return Math.round(amount * 100) / 100;
}

function isoDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(`${field} must be a YYYY-MM-DD date.`);
  }
  return value;
}

function onlyKeys(data: Record<string, unknown>, allowed: string[]) {
  const extra = Object.keys(data).filter((key) => !allowed.includes(key));
  if (extra.length) fail(`Unsupported fields: ${extra.join(", ")}.`);
}

async function audit(token: DecodedIdToken, action: string, summary: string, target: { id?: string; kind?: string } = {}) {
  try {
    await adminDb.collection(AUDIT_COLLECTION).add({
      action,
      summary: summary.slice(0, 300),
      actorEmail: String(token.email || "").toLowerCase(),
      actorUid: token.uid,
      targetId: target.id || "",
      targetKind: target.kind || "",
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

async function countOf(collection: string): Promise<number> {
  const snapshot = await adminDb.collection(collection).count().get();
  return snapshot.data().count;
}

async function listAllUsers() {
  const users: Array<Record<string, unknown>> = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      users.push({
        uid: user.uid,
        email: (user.email || "").toLowerCase(),
        displayName: user.displayName || "",
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        createdAt: toMillis(user.metadata.creationTime),
        lastSignInAt: toMillis(user.metadata.lastRefreshTime || user.metadata.lastSignInTime),
        providers: user.providerData.map((provider) => provider.providerId),
      });
    }
    pageToken = page.pageToken;
  } while (pageToken && users.length < MAX_USERS);
  return users;
}

async function load() {
  const [ledger, auditLog, users, leagues, teams, players, matches, plays, playerPrivate, auditCount] = await Promise.allSettled([
    adminDb.collection(LEDGER_COLLECTION).orderBy("date", "desc").limit(2_000).get(),
    adminDb.collection(AUDIT_COLLECTION).orderBy("createdAt", "desc").limit(1_000).get(),
    listAllUsers(),
    countOf("leagues"),
    countOf("teams"),
    countOf("players"),
    countOf("matches"),
    countOf("plays"),
    adminDb.collection("player_private").select("email", "emails", "teamId").limit(5_000).get(),
    countOf(AUDIT_COLLECTION),
  ]);
  const warnings: string[] = [];
  function settledValue<T>(result: PromiseSettledResult<T>, label: string, fallback: T): T {
    if (result.status === "fulfilled") return result.value;
    console.error(`Business console ${label} failed:`, result.reason);
    warnings.push(`${label} could not be loaded.`);
    return fallback;
  }
  const ledgerDocs = settledValue(ledger, "Ledger", null)?.docs || [];
  const auditDocs = settledValue(auditLog, "Activity log", null)?.docs || [];
  const playerLinks: Array<{ email: string; teamId: string }> = [];
  for (const snapshot of settledValue(playerPrivate, "Player accounts", null)?.docs || []) {
    const data = snapshot.data();
    const teamId = String(data.teamId || "");
    if (!teamId) continue;
    const emails = new Set<string>();
    if (typeof data.email === "string") emails.add(data.email.trim().toLowerCase());
    if (Array.isArray(data.emails)) data.emails.forEach((email: unknown) => typeof email === "string" && emails.add(email.trim().toLowerCase()));
    emails.forEach((email) => email && playerLinks.push({ email, teamId }));
  }
  return {
    ledger: ledgerDocs.map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        type: data.type === "expense" ? "expense" : "income",
        amount: Number(data.amount) || 0,
        date: String(data.date || ""),
        category: String(data.category || ""),
        description: String(data.description || ""),
        customerId: String(data.customerId || ""),
        customerKind: data.customerKind === "team" ? "team" : data.customerKind === "league" ? "league" : undefined,
        customerName: String(data.customerName || ""),
        createdAt: toMillis(data.createdAt),
      };
    }),
    audit: auditDocs.map((snapshot) => {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        action: String(data.action || ""),
        summary: String(data.summary || ""),
        actorEmail: String(data.actorEmail || ""),
        targetId: String(data.targetId || ""),
        targetKind: String(data.targetKind || ""),
        leagueId: String(data.leagueId || ""),
        teamId: String(data.teamId || ""),
        actorIsPlatformAdmin: data.actorIsPlatformAdmin === true || isPlatformAdminEmail(String(data.actorEmail || "")),
        createdAt: toMillis(data.createdAt),
      };
    }),
    playerLinks,
    users: settledValue(users, "User accounts", []),
    counts: {
      leagues: settledValue<number | null>(leagues, "League count", null),
      teams: settledValue<number | null>(teams, "Team count", null),
      players: settledValue<number | null>(players, "Player count", null),
      matches: settledValue<number | null>(matches, "Game count", null),
      plays: settledValue<number | null>(plays, "Play count", null),
      audit: settledValue<number | null>(auditCount, "Activity count", null),
    },
    warnings,
    generatedAt: Date.now(),
  };
}

function addMonth(isoValue: unknown): string {
  const parsed = typeof isoValue === "string" ? Date.parse(isoValue) : Number.NaN;
  const next = new Date(Math.max(Number.isNaN(parsed) ? 0 : parsed, Date.now()));
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

async function ledgerAdd(data: Record<string, unknown>, token: DecodedIdToken) {
  onlyKeys(data, ["type", "amount", "date", "category", "description", "customerId", "customerKind", "customerName", "advanceRenewal"]);
  if (data.type !== "income" && data.type !== "expense") fail("Entry type must be income or expense.");
  const categories: readonly string[] = data.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const category = text(data.category, "Category", 60, true);
  if (!categories.includes(category)) fail("Choose a valid category.");
  const customerId = text(data.customerId, "Customer", 128);
  if (customerId && !DOCUMENT_ID.test(customerId)) fail("Customer is invalid.");
  const customerKind = customerId ? data.customerKind : "";
  if (customerId && customerKind !== "league" && customerKind !== "team") fail("Customer type is invalid.");
  if (data.advanceRenewal !== undefined && typeof data.advanceRenewal !== "boolean") fail("Renewal flag is invalid.");
  const entry = {
    type: data.type,
    amount: money(data.amount, "Amount"),
    date: isoDate(data.date, "Date"),
    category,
    description: text(data.description, "Description", 200),
    customerId,
    customerKind,
    customerName: customerId ? text(data.customerName, "Customer name", 120) : "",
    createdBy: String(token.email || "").toLowerCase(),
    createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await adminDb.collection(LEDGER_COLLECTION).add(entry);
  let renewsAt: string | undefined;
  if (data.advanceRenewal === true && customerId && data.type === "income") {
    const customerRef = adminDb.doc(`${customerKind === "league" ? "leagues" : "teams"}/${customerId}`);
    const snapshot = await customerRef.get();
    if (snapshot.exists) {
      renewsAt = addMonth(snapshot.get("subscription")?.renewsAt);
      await customerRef.set({
        subscription: { renewsAt, lastPaymentAt: entry.date, paymentMethod: "paid" },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
  const label = `${entry.type === "income" ? "Recorded income" : "Recorded expense"} $${entry.amount.toFixed(2)} (${category})`;
  await audit(
    token,
    `ledger_${entry.type}`,
    `${label}${entry.customerName ? ` for ${entry.customerName}` : ""}${entry.description ? ` — ${entry.description}` : ""}`,
    { id: ref.id, kind: "ledger" },
  );
  return { id: ref.id, renewsAt };
}

async function ledgerDelete(data: Record<string, unknown>, token: DecodedIdToken) {
  onlyKeys(data, ["id"]);
  const id = text(data.id, "Entry", 128, true);
  if (!DOCUMENT_ID.test(id)) fail("Entry is invalid.");
  const ref = adminDb.doc(`${LEDGER_COLLECTION}/${id}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) fail("That ledger entry no longer exists.", 404);
  await ref.delete();
  await audit(
    token,
    "ledger_delete",
    `Deleted ${snapshot.get("type")} entry $${Number(snapshot.get("amount") || 0).toFixed(2)} (${snapshot.get("category")}) dated ${snapshot.get("date")}`,
    { id, kind: "ledger" },
  );
  return { id };
}

async function subscriptionUpdate(data: Record<string, unknown>, token: DecodedIdToken) {
  onlyKeys(data, ["kind", "id", "status", "paymentMethod", "monthlyFee", "baseMonthlyFee", "perTeamMonthlyFee", "teamCount", "renewsAt"]);
  if (data.kind !== "league" && data.kind !== "team") fail("Customer type is invalid.");
  const id = text(data.id, "Customer", 128, true);
  if (!DOCUMENT_ID.test(id)) fail("Customer is invalid.");
  if (typeof data.status !== "string" || !STATUSES.includes(data.status)) fail("Choose a valid status.");
  if (data.paymentMethod !== "paid" && data.paymentMethod !== "complimentary") fail("Choose paid or complimentary.");
  const renewsAt = data.renewsAt === "" || data.renewsAt === undefined
    ? null
    : new Date(`${isoDate(data.renewsAt, "Renewal date")}T12:00:00Z`).toISOString();
  const ref = adminDb.doc(`${data.kind === "league" ? "leagues" : "teams"}/${id}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) fail("That customer no longer exists.", 404);
  const subscription: Record<string, unknown> = {
    status: data.status,
    paymentMethod: data.paymentMethod,
    renewsAt,
    billingCycle: "monthly",
  };
  let feeSummary: string;
  if (data.kind === "league") {
    const base = money(data.baseMonthlyFee, "Base fee", { allowZero: true });
    const perTeam = money(data.perTeamMonthlyFee, "Per-team fee", { allowZero: true });
    const teamCount = typeof data.teamCount === "number" && Number.isInteger(data.teamCount) && data.teamCount >= 0 && data.teamCount <= 256
      ? data.teamCount
      : fail("Team count must be a whole number between 0 and 256.");
    const total = Math.round((base + perTeam * teamCount) * 100) / 100;
    Object.assign(subscription, {
      plan: "league",
      baseMonthlyFee: base,
      perTeamMonthlyFee: perTeam,
      teamCount,
      totalMonthlyFee: total,
    });
    feeSummary = `$${total.toFixed(2)}/mo ($${base} + ${teamCount} × $${perTeam})`;
  } else {
    if (snapshot.get("leagueId")) fail("League member teams are billed through their league.");
    const fee = money(data.monthlyFee, "Monthly fee", { allowZero: true });
    Object.assign(subscription, { plan: "team", monthlyFee: fee });
    feeSummary = `$${fee.toFixed(2)}/mo`;
  }
  await ref.set({ subscription, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const name = String(snapshot.get("leagueName") || snapshot.get("name") || id);
  await audit(token, "subscription_update", `Set ${name} billing to ${data.status}, ${data.paymentMethod}, ${feeSummary}`, { id, kind: data.kind });
  return { id, subscription };
}

async function userSetDisabled(data: Record<string, unknown>, token: DecodedIdToken) {
  onlyKeys(data, ["uid", "disabled"]);
  const uid = text(data.uid, "User", 128, true);
  if (typeof data.disabled !== "boolean") fail("Disabled flag is invalid.");
  if (uid === token.uid) fail("You cannot disable your own account.");
  const user = await adminAuth.getUser(uid);
  if (isPlatformAdminEmail(user.email)) fail("Platform administrator accounts cannot be disabled here.");
  await adminAuth.updateUser(uid, { disabled: data.disabled });
  if (data.disabled) await adminAuth.revokeRefreshTokens(uid);
  await audit(
    token,
    data.disabled ? "user_disable" : "user_enable",
    `${data.disabled ? "Disabled" : "Re-enabled"} account ${user.email || uid}`,
    { id: uid, kind: "user" },
  );
  return { uid, disabled: data.disabled };
}

export async function POST(request: Request) {
  try {
    const rawBody = await readLimitedRequestBody(request, MAX_REQUEST_BYTES);
    const authorization = request.headers.get("authorization") || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!idToken) return Response.json({ error: "Authentication is required." }, { status: 401 });
    let token: DecodedIdToken;
    try {
      token = await adminAuth.verifyIdToken(idToken, true);
    } catch (authError) {
      console.error("ID token verification failed:", authError);
      return Response.json({ error: "Your session could not be verified. Sign in again." }, { status: 401 });
    }
    if (token.email_verified !== true || !isPlatformAdminEmail(token.email)) {
      return Response.json({ error: "Platform administrator access is required." }, { status: 403 });
    }
    const body = JSON.parse(rawBody) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Invalid request.");
    const { action, data = {} } = body as { action?: unknown; data?: unknown };
    if (!ACTIONS.includes(action as Action)) fail("Unsupported admin action.");
    if (!data || typeof data !== "object" || Array.isArray(data)) fail("Request data is invalid.");
    const payload = data as Record<string, unknown>;
    let result: unknown;
    switch (action as Action) {
      case "load":
        result = await load();
        break;
      case "health":
        result = await computePlatformHealth();
        break;
      case "notifications":
        onlyKeys(payload, []);
        result = await loadNotificationSnapshot();
        break;
      case "notification_test": {
        onlyKeys(payload, []);
        const config = notificationConfiguration();
        if (!config.enabled) fail(config.configurationIssues.join(" "), 503);
        const ids = await enqueueNotification(`test/${token.uid}/${Math.floor(Date.now() / 600_000)}`, "service_test", [token.email!], {
          subject: "Your FlagOS email service test",
          title: "Your FlagOS email is connected",
          preheader: "A test from the FlagOS admin portal.",
          paragraphs: ["You requested this test from the admin portal. No customer emails or billing records were changed.", "If you received this message, the sender is connected. The Health tab shows provider acceptance and delivery updates separately."],
          action: { label: "Check notification status", path: "/admin#health" },
        });
        await audit(token, "notification_test", "Queued a branded email test to the signed-in platform administrator.");
        result = { ids };
        break;
      }
      case "notification_process":
        onlyKeys(payload, []);
        if (!notificationConfiguration().enabled) fail("Complete notification configuration before processing emails.", 503);
        await audit(token, "notification_process", "Requested processing of pending operational emails.");
        result = await processNotificationQueue();
        break;
      case "ledger_add":
        result = await ledgerAdd(payload, token);
        break;
      case "ledger_delete":
        result = await ledgerDelete(payload, token);
        break;
      case "subscription_update":
        result = await subscriptionUpdate(payload, token);
        break;
      case "user_set_disabled":
        result = await userSetDisabled(payload, token);
        break;
    }
    return Response.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return Response.json({ error: "Request exceeds the maximum allowed size." }, { status: 413 });
    }
    if (error instanceof RequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    console.error("Business console request failed:", error);
    return Response.json({ error: "The admin request could not be completed." }, { status: 500 });
  }
}
