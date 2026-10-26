"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Download,
  Edit3,
  LoaderCircle,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PERIOD_LABELS,
  entriesInPeriod,
  formatDate,
  formatMoney,
  isGrandfathered,
  isRecurring,
  profitAndLoss,
  toCsv,
  type BillingRecord,
  type LedgerEntry,
  type LedgerType,
  type PeriodKey,
} from "@/lib/adminMetrics";
import { usePageGuide } from "@/lib/pageGuide";
import { ADMIN_LEDGER_GUIDE, ADMIN_BILLING_GUIDE } from "@/lib/walkthroughs/admin";
import type { LedgerDraft, SubscriptionDraft } from "@/lib/adminBusiness";
import {
  EmptyState,
  Modal,
  Panel,
  StatCard,
  StatusBadge,
  downloadCsv,
  ghostButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./AdminUi";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateInput(value: number | null): string {
  if (value === null) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CategoryBreakdown({ title, rows, tone }: { title: string; rows: Array<{ category: string; amount: number }>; tone: string }) {
  const max = Math.max(1, ...rows.map((row) => row.amount));
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-neutral-600">Nothing recorded.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.category} className="text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate text-neutral-300">{row.category}</span>
                <span className="font-bold tabular-nums">{formatMoney(row.amount, { cents: true })}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${(row.amount / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminFinance({
  records,
  ledger,
  onAddEntry,
  onEditBilling,
  onDeleteEntry,
}: {
  records: BillingRecord[];
  ledger: LedgerEntry[];
  onAddEntry: (prefill?: Partial<LedgerDraft>) => void;
  onEditBilling: (record: BillingRecord) => void;
  onDeleteEntry: (entry: LedgerEntry) => Promise<void>;
}) {
  const [period, setPeriod] = useState<PeriodKey>("ytd");
  const [typeFilter, setTypeFilter] = useState<"all" | LedgerType>("all");
  const [billingFilter, setBillingFilter] = useState<"all" | "paid" | "complimentary" | "inactive">("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const periodEntries = useMemo(() => entriesInPeriod(ledger, period), [ledger, period]);
  const pnl = useMemo(() => profitAndLoss(periodEntries), [periodEntries]);
  const visibleEntries = useMemo(() => {
    const term = ledgerSearch.trim().toLowerCase();
    return periodEntries
      .filter((entry) => typeFilter === "all" || entry.type === typeFilter)
      .filter((entry) => !term || [entry.category, entry.description, entry.customerName, entry.date].some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [periodEntries, typeFilter, ledgerSearch]);
  const billingRows = useMemo(
    () =>
      records
        .filter((record) =>
          billingFilter === "all" ||
          (billingFilter === "inactive" ? !isRecurring(record) : isRecurring(record) && record.paymentMethod === billingFilter))
        .sort((a, b) => b.monthlyFee - a.monthlyFee || a.name.localeCompare(b.name)),
    [records, billingFilter],
  );

  const exportLedger = () => {
    downloadCsv(
      `flagos-ledger-${period}-${today()}.csv`,
      toCsv(
        ["Date", "Type", "Category", "Description", "Customer", "Amount (CAD)", "Signed amount (CAD)"],
        visibleEntries.map((entry) => [
          entry.date,
          entry.type,
          entry.category,
          entry.description,
          entry.customerName || "",
          entry.amount,
          entry.type === "expense" || entry.category === "Refund" ? -entry.amount : entry.amount,
        ]),
      ),
    );
  };
  const exportSubscriptions = () => {
    downloadCsv(
      `flagos-subscriptions-${today()}.csv`,
      toCsv(
        ["Customer", "Type", "ID", "Status", "Billing", "Monthly fee (CAD)", "Teams", "Renews", "Admins"],
        billingRows.map((record) => [
          record.name,
          record.kind,
          record.id,
          record.status,
          record.paymentMethod,
          record.monthlyFee,
          record.kind === "league" ? record.teamCount ?? "" : "",
          record.renewsAt ? dateInput(record.renewsAt) : "",
          record.adminEmails.join("; "),
        ]),
      ),
    );
  };

  const handleDelete = async (entry: LedgerEntry) => {
    setDeletingId(entry.id);
    try {
      await onDeleteEntry(entry);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div data-tour="admin-finance-period" className="flex flex-wrap items-center gap-2">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-neutral-900 p-1" role="tablist" aria-label="Reporting period">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${period === key ? "bg-white text-neutral-950" : "text-neutral-400 hover:text-white"}`}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" className={ghostButtonClass} onClick={exportLedger}>
            <Download className="h-3.5 w-3.5" /> Ledger CSV
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => onAddEntry()}>
            <Plus className="h-4 w-4" /> Add entry
          </button>
        </div>
      </div>

      <div data-tour="admin-finance-kpis" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Net revenue" value={formatMoney(pnl.netRevenue, { cents: true })} hint={pnl.refunds ? `${formatMoney(pnl.refunds, { cents: true })} refunds` : PERIOD_LABELS[period]} icon={Wallet} tone="emerald" />
        <StatCard label="Expenses" value={formatMoney(pnl.expenses, { cents: true })} hint={PERIOD_LABELS[period]} icon={Receipt} tone="rose" />
        <StatCard
          label="Profit"
          value={<span className={pnl.profit < 0 ? "text-rose-300" : ""}>{formatMoney(pnl.profit, { cents: true })}</span>}
          hint={pnl.margin === null ? "No revenue in period" : `${Math.round(pnl.margin * 100)}% margin`}
          icon={BadgeDollarSign}
          tone="violet"
        />
        <StatCard label="Entries" value={periodEntries.length} hint={`${periodEntries.filter((entry) => entry.type === "income").length} income · ${periodEntries.filter((entry) => entry.type === "expense").length} expense`} icon={Receipt} />
      </div>

      <Panel tour="admin-finance-pnl" title={`Profit & loss · ${PERIOD_LABELS[period]}`} icon={BadgeDollarSign}>
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryBreakdown title="Income by category" rows={pnl.incomeByCategory} tone="bg-emerald-400/80" />
          <CategoryBreakdown title="Expenses by category" rows={pnl.expensesByCategory} tone="bg-rose-400/70" />
        </div>
      </Panel>

      <Panel
        tour="admin-finance-subscriptions"
        title="Subscriptions & billing"
        icon={Wallet}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter subscriptions"
              value={billingFilter}
              onChange={(event) => setBillingFilter(event.target.value as typeof billingFilter)}
              className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs font-bold text-neutral-200"
            >
              <option value="all">All customers</option>
              <option value="paid">Paid</option>
              <option value="complimentary">Complimentary</option>
              <option value="inactive">Inactive / trial</option>
            </select>
            <button type="button" className={ghostButtonClass} onClick={exportSubscriptions}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        }
      >
        {billingRows.length === 0 ? (
          <EmptyState>No customers match this filter.</EmptyState>
        ) : (
          <div className="-mx-4 sm:-mx-5 sm:overflow-x-auto">
            <table className="block w-full text-left text-sm sm:table sm:min-w-[640px]">
              <thead className="hidden text-[11px] uppercase tracking-wide text-neutral-500 sm:table-header-group">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 font-bold sm:px-5">Customer</th>
                  <th className="px-2 py-2 font-bold">Status</th>
                  <th className="px-2 py-2 text-right font-bold">Monthly</th>
                  <th className="px-2 py-2 font-bold">Renews</th>
                  <th className="px-4 py-2 text-right font-bold sm:px-5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="block sm:table-row-group">
                {billingRows.map((record) => (
                  <tr key={`${record.kind}-${record.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-white/5 px-4 py-3 last:border-0 sm:table-row sm:p-0">
                    <td className="col-start-1 row-start-1 min-w-0 sm:max-w-[16rem] sm:px-5 sm:py-2.5">
                      <div className="truncate font-bold">{record.name}</div>
                      <div className="truncate text-xs text-neutral-500">
                        {record.kind === "league"
                          ? `League · ${record.teamCount ?? 0} teams · ${formatMoney(record.baseMonthlyFee ?? 0)} + ${formatMoney(record.perTeamMonthlyFee ?? 0)}/team`
                          : "Independent team plan"}
                      </div>
                    </td>
                    <td className="col-start-1 row-start-2 sm:px-2 sm:py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={record.status} />
                        <StatusBadge status={record.paymentMethod} />
                        {isGrandfathered(record) && (
                          <span title="Priced below today's list rate" className="rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-300">
                            Grandfathered
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-start-2 row-start-1 text-right font-black tabular-nums sm:px-2 sm:py-2.5">{formatMoney(record.monthlyFee, { cents: record.monthlyFee % 1 !== 0 })}</td>
                    <td className={`col-start-2 row-start-2 whitespace-nowrap text-right text-xs sm:px-2 sm:py-2.5 sm:text-left ${record.renewsAt !== null && record.renewsAt < Date.now() && isRecurring(record) ? "text-amber-300" : "text-neutral-400"}`}>
                      <span className="sm:hidden">Renews </span>{formatDate(record.renewsAt)}
                    </td>
                    <td className="col-span-2 row-start-3 sm:px-5 sm:py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={ghostButtonClass}
                          onClick={() =>
                            onAddEntry({
                              type: "income",
                              category: "Subscription",
                              amount: record.monthlyFee,
                              customerId: record.id,
                              customerKind: record.kind,
                              customerName: record.name,
                              description: `Monthly subscription`,
                              advanceRenewal: true,
                            })}
                        >
                          <Plus className="h-3.5 w-3.5" /> Payment
                        </button>
                        <button type="button" className={ghostButtonClass} aria-label={`Edit billing for ${record.name}`} onClick={() => onEditBilling(record)}>
                          <Edit3 className="h-3.5 w-3.5" /> Billing
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        tour="admin-finance-ledger"
        title="Ledger"
        icon={Receipt}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <input
                value={ledgerSearch}
                onChange={(event) => setLedgerSearch(event.target.value)}
                placeholder="Search entries"
                aria-label="Search ledger"
                className="w-32 bg-transparent text-xs outline-none placeholder:text-neutral-600 sm:w-44"
              />
            </label>
            <select
              aria-label="Filter entry type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
              className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs font-bold text-neutral-200"
            >
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>
        }
      >
        {visibleEntries.length === 0 ? (
          <EmptyState>
            No ledger entries for {PERIOD_LABELS[period].toLowerCase()}. Record payments you receive and business expenses (hosting, domains, marketing) to track profit.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {visibleEntries.map((entry) => {
              const negative = entry.type === "expense" || entry.category === "Refund";
              return (
                <li key={entry.id} className="flex items-center gap-3 py-2.5">
                  <div className={`h-8 w-1 shrink-0 rounded-full ${entry.type === "expense" ? "bg-rose-400/70" : entry.category === "Refund" ? "bg-amber-400/70" : "bg-emerald-400/80"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate text-sm font-bold">{entry.description || entry.category}</span>
                      {entry.customerName && <span className="truncate text-xs text-cyan-300">{entry.customerName}</span>}
                    </div>
                    <div className="text-xs text-neutral-500">{entry.date} · {entry.category}</div>
                  </div>
                  <span className={`shrink-0 text-sm font-black tabular-nums ${negative ? "text-rose-300" : "text-emerald-300"}`}>
                    {negative ? "−" : "+"}{formatMoney(entry.amount, { cents: true })}
                  </span>
                  {confirmDeleteId === entry.id ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry)}
                      disabled={deletingId === entry.id}
                      className="shrink-0 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-xs font-bold text-rose-200"
                    >
                      {deletingId === entry.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : "Delete?"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete entry ${entry.description || entry.category}`}
                      onClick={() => setConfirmDeleteId(entry.id)}
                      className="shrink-0 rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function LedgerEntryModal({
  prefill,
  records,
  onClose,
  onSave,
}: {
  prefill?: Partial<LedgerDraft>;
  records: BillingRecord[];
  onClose: () => void;
  onSave: (draft: LedgerDraft) => Promise<void>;
}) {
  usePageGuide(ADMIN_LEDGER_GUIDE, 2);
  const [type, setType] = useState<LedgerType>(prefill?.type ?? "income");
  const [amount, setAmount] = useState(prefill?.amount !== undefined ? String(prefill.amount) : "");
  const [date, setDate] = useState(prefill?.date ?? today());
  const [category, setCategory] = useState(prefill?.category ?? "Subscription");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [customerKey, setCustomerKey] = useState(prefill?.customerId ? `${prefill.customerKind}:${prefill.customerId}` : "");
  const [advanceRenewal, setAdvanceRenewal] = useState(prefill?.advanceRenewal ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const categories: readonly string[] = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const customer = records.find((record) => `${record.kind}:${record.id}` === customerKey);

  const switchType = (next: LedgerType) => {
    setType(next);
    setCategory(next === "income" ? "Subscription" : "Hosting & infrastructure");
    if (next === "expense") {
      setCustomerKey("");
      setAdvanceRenewal(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        type,
        amount: Math.round(value * 100) / 100,
        date,
        category,
        description: description.trim(),
        ...(customer ? { customerId: customer.id, customerKind: customer.kind, customerName: customer.name } : {}),
        advanceRenewal: Boolean(customer && advanceRenewal && type === "income" && category === "Subscription"),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the entry.");
      setSaving(false);
    }
  };

  return (
    <Modal title={type === "income" ? "Record income" : "Record expense"} onClose={onClose} labelId="ledger-entry-title">
      <form data-tour="admin-ledger-fields" onSubmit={(event) => void submit(event)} className="space-y-4">
        <div data-tour="admin-ledger-type" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-neutral-950 p-1" role="radiogroup" aria-label="Entry type">
          {(["income", "expense"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => switchType(option)}
              className={`rounded-lg py-2 text-sm font-bold capitalize ${type === option ? (option === "income" ? "bg-emerald-400 text-neutral-950" : "bg-rose-400 text-neutral-950") : "text-neutral-400"}`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Amount (CAD)</span>
            <input className={inputClass} inputMode="decimal" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" />
          </label>
          <label className="block">
            <span className={labelClass}>Date</span>
            <input className={inputClass} type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Category</span>
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        {type === "income" && (
          <label className="block">
            <span className={labelClass}>Customer (optional)</span>
            <select className={inputClass} value={customerKey} onChange={(event) => setCustomerKey(event.target.value)}>
              <option value="">No customer</option>
              {records.map((record) => (
                <option key={`${record.kind}:${record.id}`} value={`${record.kind}:${record.id}`}>
                  {record.name} ({record.kind === "league" ? "league" : "team"})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className={labelClass}>Description</span>
          <input className={inputClass} maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={type === "income" ? "e.g. May subscription (e-transfer)" : "e.g. Firebase invoice"} />
        </label>
        {type === "income" && customer && category === "Subscription" && (
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan-400" checked={advanceRenewal} onChange={(event) => setAdvanceRenewal(event.target.checked)} />
            <span>
              <span className="font-bold">Mark paid and extend renewal by one month</span>
              <span className="block text-xs text-neutral-500">Sets {customer.name} to paid billing. Currently renews {formatDate(customer.renewsAt)}.</span>
            </span>
          </label>
        )}
        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        <div data-tour="admin-ledger-save" className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button type="button" className={ghostButtonClass} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save entry
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function BillingModal({
  record,
  onClose,
  onSave,
}: {
  record: BillingRecord;
  onClose: () => void;
  onSave: (draft: SubscriptionDraft) => Promise<void>;
}) {
  usePageGuide(ADMIN_BILLING_GUIDE, 2);
  const [status, setStatus] = useState(record.status === "unknown" ? "active" : record.status);
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod);
  const [monthlyFee, setMonthlyFee] = useState(String(record.monthlyFee));
  const [baseFee, setBaseFee] = useState(String(record.baseMonthlyFee ?? 40));
  const [perTeamFee, setPerTeamFee] = useState(String(record.perTeamMonthlyFee ?? 20));
  const [teamCount, setTeamCount] = useState(String(record.teamCount ?? 0));
  const [renewsAt, setRenewsAt] = useState(dateInput(record.renewsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const leagueTotal = (Number(baseFee) || 0) + (Number(perTeamFee) || 0) * (Number(teamCount) || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        kind: record.kind,
        id: record.id,
        status,
        paymentMethod,
        renewsAt,
        ...(record.kind === "league"
          ? { baseMonthlyFee: Number(baseFee) || 0, perTeamMonthlyFee: Number(perTeamFee) || 0, teamCount: Math.max(0, Math.round(Number(teamCount) || 0)) }
          : { monthlyFee: Number(monthlyFee) || 0 }),
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save billing.");
      setSaving(false);
    }
  };

  return (
    <Modal title={`Billing · ${record.name}`} onClose={onClose} labelId="billing-title">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div data-tour="admin-billing-status" className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>Status</span>
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past due</option>
              <option value="canceled">Canceled</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Billing</span>
            <select className={inputClass} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}>
              <option value="paid">Paid</option>
              <option value="complimentary">Complimentary</option>
            </select>
          </label>
        </div>
        {record.kind === "league" ? (
          <div data-tour="admin-billing-fees" className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={labelClass}>Base / mo</span>
              <input className={inputClass} type="number" min="0" step="0.01" value={baseFee} onChange={(event) => setBaseFee(event.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Per team</span>
              <input className={inputClass} type="number" min="0" step="0.01" value={perTeamFee} onChange={(event) => setPerTeamFee(event.target.value)} />
            </label>
            <label className="block">
              <span className={labelClass}>Teams</span>
              <input className={inputClass} type="number" min="0" max="256" step="1" value={teamCount} onChange={(event) => setTeamCount(event.target.value)} />
            </label>
            <p className="col-span-3 -mt-1 text-xs text-neutral-400">
              Total <strong className="text-white">{formatMoney(leagueTotal, { cents: leagueTotal % 1 !== 0 })}/mo</strong>
            </p>
          </div>
        ) : (
          <label data-tour="admin-billing-fees" className="block">
            <span className={labelClass}>Monthly fee (CAD)</span>
            <input className={inputClass} type="number" min="0" step="0.01" value={monthlyFee} onChange={(event) => setMonthlyFee(event.target.value)} />
          </label>
        )}
        <label className="block">
          <span className={labelClass}>Next renewal</span>
          <input className={inputClass} type="date" value={renewsAt} onChange={(event) => setRenewsAt(event.target.value)} />
        </label>
        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        <div data-tour="admin-billing-save" className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <button type="button" className={ghostButtonClass} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save billing
          </button>
        </div>
      </form>
    </Modal>
  );
}
