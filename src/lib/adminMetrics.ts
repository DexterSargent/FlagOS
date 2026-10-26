/**
 * Pure business-metric helpers for the platform admin console. Revenue figures are
 * derived from the subscription records on league/team documents plus the manual
 * payments/expenses ledger; no payment processor is involved.
 */

export const TEAM_PLAN_MONTHLY_FEE = 40;
export const LEAGUE_BASE_MONTHLY_FEE = 40;
export const LEAGUE_PER_TEAM_MONTHLY_FEE = 20;

export type CustomerKind = "league" | "team";
export type PaymentMethod = "paid" | "complimentary";
export type BillingStatus = "active" | "trial" | "past_due" | "canceled" | "archived" | "unknown";

export interface BillingRecord {
  id: string;
  kind: CustomerKind;
  name: string;
  status: BillingStatus;
  paymentMethod: PaymentMethod;
  /** List-price monthly fee for the subscription, regardless of whether it is charged. */
  monthlyFee: number;
  baseMonthlyFee?: number;
  perTeamMonthlyFee?: number;
  teamCount?: number;
  createdAt: number | null;
  renewsAt: number | null;
  adminEmails: string[];
}

export type LedgerType = "income" | "expense";

export const INCOME_CATEGORIES = ["Subscription", "Setup fee", "Sponsorship", "Refund", "Other income"] as const;
export const EXPENSE_CATEGORIES = [
  "Hosting & infrastructure",
  "Software & tools",
  "Domain & email",
  "Marketing",
  "Payment fees",
  "Contractors",
  "Equipment",
  "Taxes & fees",
  "Other expense",
] as const;

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  /** Always positive; `type` decides the sign. Refunds are income entries with a negative effect. */
  amount: number;
  date: string;
  category: string;
  description: string;
  customerId?: string;
  customerKind?: CustomerKind;
  customerName?: string;
  createdAt?: number | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  summary: string;
  actorEmail: string;
  targetId?: string;
  targetKind?: string;
  leagueId?: string;
  teamId?: string;
  actorIsPlatformAdmin?: boolean;
  createdAt: number | null;
}

export interface PlatformUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: number | null;
  lastSignInAt: number | null;
  providers: string[];
}

type RawRecord = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

/** Accepts ISO strings, epoch millis, Firestore Timestamps, and serialized `{_seconds}` objects. */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.toMillis === "function") return (record.toMillis as () => number)();
    const seconds = toNumber(record.seconds ?? record._seconds);
    if (seconds !== null) return seconds * 1000;
  }
  return null;
}

function normalizeStatus(value: unknown, archived: boolean): BillingStatus {
  if (archived) return "archived";
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (status === "cancelled") return "canceled";
  if (["active", "trial", "past_due", "canceled", "archived"].includes(status)) return status as BillingStatus;
  return status ? "unknown" : "active";
}

function emails(record: RawRecord): string[] {
  return Array.isArray(record.adminEmails)
    ? record.adminEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean)
    : [];
}

/**
 * Leagues pay the league plan; only independent teams carry their own team plan. Teams
 * that belong to a league are covered by that league and are not separate customers.
 */
export function toBillingRecords(leagues: RawRecord[], teams: RawRecord[]): BillingRecord[] {
  const records: BillingRecord[] = [];
  for (const league of leagues) {
    const subscription = (league.subscription && typeof league.subscription === "object" ? league.subscription : {}) as RawRecord;
    const base = toNumber(subscription.baseMonthlyFee) ?? LEAGUE_BASE_MONTHLY_FEE;
    const perTeam = toNumber(subscription.perTeamMonthlyFee) ?? LEAGUE_PER_TEAM_MONTHLY_FEE;
    const teamCount = toNumber(subscription.teamCount) ?? toNumber(league.teamCount) ?? 0;
    const total = toNumber(subscription.totalMonthlyFee) ?? base + perTeam * teamCount;
    records.push({
      id: String(league.id),
      kind: "league",
      name: String(league.name || league.leagueName || "Untitled league"),
      status: normalizeStatus(subscription.status, league.isArchived === true || league.seasonStatus === "archived"),
      paymentMethod: subscription.paymentMethod === "paid" ? "paid" : "complimentary",
      monthlyFee: Math.max(0, total),
      baseMonthlyFee: base,
      perTeamMonthlyFee: perTeam,
      teamCount,
      createdAt: toMillis(league.createdAt),
      renewsAt: toMillis(subscription.renewsAt),
      adminEmails: emails(league),
    });
  }
  for (const team of teams) {
    if (typeof team.leagueId === "string" && team.leagueId.trim()) continue;
    const subscription = (team.subscription && typeof team.subscription === "object" ? team.subscription : {}) as RawRecord;
    const fee = toNumber(subscription.monthlyFee) ?? toNumber(subscription.totalMonthlyFee) ?? TEAM_PLAN_MONTHLY_FEE;
    records.push({
      id: String(team.id),
      kind: "team",
      name: String(team.name || team.teamName || "Untitled team"),
      status: normalizeStatus(subscription.status, team.isArchived === true || team.seasonStatus === "archived"),
      paymentMethod: subscription.paymentMethod === "paid" ? "paid" : "complimentary",
      monthlyFee: Math.max(0, fee),
      createdAt: toMillis(team.createdAt),
      renewsAt: toMillis(subscription.renewsAt),
      adminEmails: emails(team),
    });
  }
  return records;
}

/** A paid plan priced below today's list price keeps its original (grandfathered) rate. */
export function isGrandfathered(record: BillingRecord): boolean {
  if (record.paymentMethod !== "paid") return false;
  if (record.kind === "team") return record.monthlyFee < TEAM_PLAN_MONTHLY_FEE;
  return (record.perTeamMonthlyFee ?? LEAGUE_PER_TEAM_MONTHLY_FEE) < LEAGUE_PER_TEAM_MONTHLY_FEE ||
    (record.baseMonthlyFee ?? LEAGUE_BASE_MONTHLY_FEE) < LEAGUE_BASE_MONTHLY_FEE;
}

/** A subscription contributes recurring revenue while it is active or past due. */
export function isRecurring(record: BillingRecord): boolean {
  return record.status === "active" || record.status === "past_due";
}

export interface BusinessKpis {
  billedMrr: number;
  listMrr: number;
  complimentaryMrr: number;
  arr: number;
  customers: number;
  activeCustomers: number;
  paidCustomers: number;
  complimentaryCustomers: number;
  trialCustomers: number;
  pastDueCustomers: number;
  churnedCustomers: number;
  leagueCustomers: number;
  teamCustomers: number;
  arpa: number;
}

export function computeKpis(records: BillingRecord[]): BusinessKpis {
  const recurring = records.filter(isRecurring);
  const paid = recurring.filter((record) => record.paymentMethod === "paid");
  const billedMrr = sum(paid.map((record) => record.monthlyFee));
  const listMrr = sum(recurring.map((record) => record.monthlyFee));
  return {
    billedMrr,
    listMrr,
    complimentaryMrr: listMrr - billedMrr,
    arr: billedMrr * 12,
    customers: records.length,
    activeCustomers: recurring.length,
    paidCustomers: paid.length,
    complimentaryCustomers: recurring.length - paid.length,
    trialCustomers: records.filter((record) => record.status === "trial").length,
    pastDueCustomers: records.filter((record) => record.status === "past_due").length,
    churnedCustomers: records.filter((record) => record.status === "canceled" || record.status === "archived").length,
    leagueCustomers: records.filter((record) => record.kind === "league").length,
    teamCustomers: records.filter((record) => record.kind === "team").length,
    arpa: paid.length ? billedMrr / paid.length : 0,
  };
}

export function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}

/** Signed effect of a ledger entry on profit. Refunds reduce income. */
export function signedAmount(entry: LedgerEntry): number {
  if (entry.type === "expense") return -entry.amount;
  return entry.category === "Refund" ? -entry.amount : entry.amount;
}

export type PeriodKey = "this_month" | "last_month" | "last_90" | "ytd" | "last_year" | "all";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_90: "Last 90 days",
  ytd: "Year to date",
  last_year: "Last year",
  all: "All time",
};

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Inclusive YYYY-MM-DD bounds for a reporting period in local time. */
export function periodRange(period: PeriodKey, now = new Date()): { start: string; end: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (period) {
    case "this_month":
      return { start: isoDate(new Date(year, month, 1)), end: isoDate(new Date(year, month + 1, 0)) };
    case "last_month":
      return { start: isoDate(new Date(year, month - 1, 1)), end: isoDate(new Date(year, month, 0)) };
    case "last_90":
      return { start: isoDate(new Date(year, month, now.getDate() - 89)), end: isoDate(now) };
    case "ytd":
      return { start: `${year}-01-01`, end: isoDate(now) };
    case "last_year":
      return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` };
    case "all":
      return { start: "0000-01-01", end: "9999-12-31" };
  }
}

export function entriesInPeriod(entries: LedgerEntry[], period: PeriodKey, now = new Date()): LedgerEntry[] {
  const { start, end } = periodRange(period, now);
  return entries.filter((entry) => entry.date >= start && entry.date <= end);
}

export interface ProfitAndLoss {
  income: number;
  refunds: number;
  netRevenue: number;
  expenses: number;
  profit: number;
  margin: number | null;
  incomeByCategory: Array<{ category: string; amount: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
}

function groupByCategory(entries: LedgerEntry[]): Array<{ category: string; amount: number }> {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

export function profitAndLoss(entries: LedgerEntry[]): ProfitAndLoss {
  const incomeEntries = entries.filter((entry) => entry.type === "income" && entry.category !== "Refund");
  const refundEntries = entries.filter((entry) => entry.type === "income" && entry.category === "Refund");
  const expenseEntries = entries.filter((entry) => entry.type === "expense");
  const income = sum(incomeEntries.map((entry) => entry.amount));
  const refunds = sum(refundEntries.map((entry) => entry.amount));
  const expenses = sum(expenseEntries.map((entry) => entry.amount));
  const netRevenue = sum([income, -refunds]);
  const profit = sum([netRevenue, -expenses]);
  return {
    income,
    refunds,
    netRevenue,
    expenses,
    profit,
    margin: netRevenue > 0 ? profit / netRevenue : null,
    incomeByCategory: groupByCategory([...incomeEntries, ...refundEntries]),
    expensesByCategory: groupByCategory(expenseEntries),
  };
}

export interface MonthPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  newCustomers: number;
  totalCustomers: number;
  projectedMrr: number;
}

/**
 * Trailing monthly series ending with the current month. Projected MRR counts paid,
 * currently recurring subscriptions that existed by the end of each month.
 */
export function monthlySeries(records: BillingRecord[], entries: LedgerEntry[], months = 12, now = new Date()): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const monthEntries = entries.filter((entry) => entry.date.startsWith(key));
    const revenue = sum(monthEntries.filter((entry) => entry.type === "income").map(signedAmount));
    const expenses = sum(monthEntries.filter((entry) => entry.type === "expense").map((entry) => entry.amount));
    const existing = records.filter((record) => record.createdAt === null || record.createdAt < end.getTime());
    points.push({
      key,
      label: start.toLocaleDateString("en-CA", { month: "short", ...(start.getMonth() === 0 || offset === months - 1 ? { year: "2-digit" } : {}) }),
      revenue,
      expenses,
      profit: sum([revenue, -expenses]),
      newCustomers: records.filter((record) =>
        record.createdAt !== null && record.createdAt >= start.getTime() && record.createdAt < end.getTime()).length,
      totalCustomers: existing.length,
      projectedMrr: sum(existing.filter((record) => isRecurring(record) && record.paymentMethod === "paid").map((record) => record.monthlyFee)),
    });
  }
  return points;
}

/** Paid subscriptions whose renewal date falls within the window, plus any already overdue. */
export function upcomingRenewals(records: BillingRecord[], days = 30, now = Date.now()): BillingRecord[] {
  const horizon = now + days * 86_400_000;
  return records
    .filter((record) => isRecurring(record) && record.renewsAt !== null && record.renewsAt <= horizon)
    .sort((a, b) => (a.renewsAt ?? 0) - (b.renewsAt ?? 0));
}

export function formatMoney(value: number, options: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.cents ? 2 : 0,
    maximumFractionDigits: options.cents ? 2 : 0,
  }).format(value);
}

export function formatDate(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralize spreadsheet formula injection from user-supplied names/descriptions.
  const safe = typeof value !== "number" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
