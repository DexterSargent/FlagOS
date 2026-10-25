"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  Database,
  Gift,
  PiggyBank,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  computeKpis,
  entriesInPeriod,
  formatDate,
  formatMoney,
  monthlySeries,
  profitAndLoss,
  upcomingRenewals,
  type BillingRecord,
} from "@/lib/adminMetrics";
import type { BusinessSnapshot } from "@/lib/adminBusiness";
import { EmptyState, MonthlyBars, Panel, SplitBar, StatCard, StatusBadge, TrendLine, ghostButtonClass } from "./AdminUi";

export type ConsoleTab = "overview" | "customers" | "finance" | "users" | "activity" | "free-agents";

export default function AdminOverview({
  records,
  snapshot,
  onNavigate,
  onRecordPayment,
}: {
  records: BillingRecord[];
  snapshot: BusinessSnapshot | null;
  onNavigate: (tab: ConsoleTab) => void;
  onRecordPayment: (record: BillingRecord) => void;
}) {
  const ledger = useMemo(() => snapshot?.ledger ?? [], [snapshot]);
  const users = useMemo(() => snapshot?.users ?? [], [snapshot]);
  const kpis = useMemo(() => computeKpis(records), [records]);
  const series = useMemo(() => monthlySeries(records, ledger, 12), [records, ledger]);
  const month = useMemo(() => profitAndLoss(entriesInPeriod(ledger, "this_month")), [ledger]);
  const ytd = useMemo(() => profitAndLoss(entriesInPeriod(ledger, "ytd")), [ledger]);
  const renewals = useMemo(() => upcomingRenewals(records.filter((record) => record.paymentMethod === "paid"), 30), [records]);
  const pastDue = records.filter((record) => record.status === "past_due");
  const monthAgo = Date.now() - 30 * 86_400_000;
  const newUsers = users.filter((user) => (user.createdAt ?? 0) >= monthAgo);
  const activeUsers = users.filter((user) => (user.lastSignInAt ?? 0) >= monthAgo);
  const recentSignups = [...users].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 6);
  const counts = snapshot?.counts;
  const money = (value: number) => formatMoney(value);

  return (
    <div className="space-y-5">
      <div data-tour="admin-overview-kpis" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="MRR (billed)"
          value={money(kpis.billedMrr)}
          hint={`${money(kpis.listMrr)} list incl. comp`}
          icon={BadgeDollarSign}
          tone="emerald"
        />
        <StatCard label="ARR run-rate" value={money(kpis.arr)} hint={`ARPA ${money(kpis.arpa)}/mo`} icon={TrendingUp} tone="cyan" />
        <StatCard
          label="Profit this month"
          value={<span className={month.profit < 0 ? "text-rose-300" : ""}>{money(month.profit)}</span>}
          hint={`${money(month.netRevenue)} in · ${money(month.expenses)} out`}
          icon={PiggyBank}
          tone={month.profit < 0 ? "rose" : "violet"}
        />
        <StatCard
          label="Active customers"
          value={kpis.activeCustomers}
          hint={`${kpis.paidCustomers} paid · ${kpis.complimentaryCustomers} comp`}
          icon={Users}
          tone="amber"
        />
        <StatCard label="Revenue YTD" value={money(ytd.netRevenue)} hint={ytd.refunds ? `${money(ytd.refunds)} refunded` : "From ledger"} icon={Wallet} />
        <StatCard label="Expenses YTD" value={money(ytd.expenses)} hint={ytd.expensesByCategory[0] ? `Top: ${ytd.expensesByCategory[0].category}` : "From ledger"} icon={Receipt} />
        <StatCard
          label="Profit YTD"
          value={<span className={ytd.profit < 0 ? "text-rose-300" : ""}>{money(ytd.profit)}</span>}
          hint={ytd.margin === null ? "No revenue yet" : `${Math.round(ytd.margin * 100)}% margin`}
          icon={PiggyBank}
        />
        <StatCard label="User accounts" value={users.length} hint={`${newUsers.length} new · ${activeUsers.length} active (30d)`} icon={UserPlus} />
      </div>

      {kpis.complimentaryCustomers > 0 && (
        <div data-tour="admin-overview-comp" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-sm">
          <Gift className="h-4 w-4 shrink-0 text-violet-300" />
          <span className="min-w-0 flex-1 text-violet-100">
            {kpis.complimentaryCustomers} complimentary {kpis.complimentaryCustomers === 1 ? "subscription is" : "subscriptions are"} worth{" "}
            <strong>{money(kpis.complimentaryMrr)}/mo</strong> at list price. Mark customers as paid in Finance once they are billed.
          </span>
          <button type="button" className={ghostButtonClass} onClick={() => onNavigate("finance")}>Open billing</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel tour="admin-overview-charts" title="Revenue vs expenses" icon={BadgeDollarSign} className="lg:col-span-2" action={<span className="text-xs text-neutral-500">Last 12 months · ledger</span>}>
          <MonthlyBars points={series} format={money} />
        </Panel>
        <Panel title="Customer mix" icon={Users}>
          <SplitBar
            segments={[
              { label: "Paid", value: kpis.paidCustomers, color: "bg-emerald-400" },
              { label: "Complimentary", value: kpis.complimentaryCustomers, color: "bg-violet-400" },
              { label: "Trial", value: kpis.trialCustomers, color: "bg-cyan-400" },
              { label: "Churned / archived", value: kpis.churnedCustomers, color: "bg-neutral-600" },
            ]}
          />
          <div className="mt-5 border-t border-white/10 pt-4">
            <SplitBar
              segments={[
                { label: "League plans", value: kpis.leagueCustomers, color: "bg-cyan-400" },
                { label: "Independent team plans", value: kpis.teamCustomers, color: "bg-amber-400" },
              ]}
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel tour="admin-overview-trends" title="Customer growth" icon={TrendingUp} action={<span className="text-xs text-neutral-500">Total customers</span>}>
          <TrendLine id="trend-customers" values={series.map((point) => point.totalCustomers)} labels={series.map((point) => point.label)} format={(value) => String(value)} />
        </Panel>
        <Panel title="Billed MRR trend" icon={BadgeDollarSign} action={<span className="text-xs text-neutral-500">Paid subscriptions</span>}>
          <TrendLine id="trend-mrr" values={series.map((point) => point.projectedMrr)} labels={series.map((point) => point.label)} format={money} />
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel tour="admin-overview-renewals" title="Renewals due (30 days)" icon={CalendarClock}>
          {renewals.length === 0 && pastDue.length === 0 ? (
            <EmptyState>No paid renewals due in the next 30 days.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {[...pastDue.filter((record) => !renewals.includes(record)), ...renewals].slice(0, 8).map((record) => {
                const overdue = record.status === "past_due" || (record.renewsAt ?? 0) < Date.now();
                return (
                  <li key={`${record.kind}-${record.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{record.name}</div>
                      <div className={`text-xs ${overdue ? "text-amber-300" : "text-neutral-500"}`}>
                        {overdue && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                        {formatDate(record.renewsAt)} · {money(record.monthlyFee)}
                      </div>
                    </div>
                    <button type="button" className={ghostButtonClass} onClick={() => onRecordPayment(record)}>Record payment</button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel tour="admin-overview-signups" title="Recent signups" icon={UserPlus} action={<button type="button" className="text-xs font-bold text-cyan-400 hover:text-cyan-300" onClick={() => onNavigate("users")}>All users</button>}>
          {recentSignups.length === 0 ? (
            <EmptyState>No accounts loaded.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {recentSignups.map((user) => (
                <li key={user.uid} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{user.email || user.displayName || user.uid}</span>
                  <span className="shrink-0 text-xs text-neutral-500">{formatDate(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel tour="admin-overview-health" title="Platform health" icon={Database} action={<button type="button" className="text-xs font-bold text-cyan-400 hover:text-cyan-300" onClick={() => onNavigate("activity")}>Activity</button>}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {([
              ["Leagues", counts?.leagues],
              ["Teams", counts?.teams],
              ["Players", counts?.players],
              ["Games", counts?.matches],
              ["Logged plays", counts?.plays],
              ["Accounts", users.length],
            ] as Array<[string, number | null | undefined]>).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</dt>
                <dd className="text-lg font-black tabular-nums">{value === null || value === undefined ? "—" : value.toLocaleString("en-CA")}</dd>
              </div>
            ))}
          </dl>
          {snapshot?.audit[0] && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-500">
              <Activity className="mt-0.5 h-3 w-3 shrink-0" /> Last change: {snapshot.audit[0].summary}
            </p>
          )}
        </Panel>
      </div>

      {records.length > 0 && (
        <Panel tour="admin-overview-top" title="Top accounts by value" icon={BadgeDollarSign}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[...records].sort((a, b) => b.monthlyFee - a.monthlyFee).slice(0, 6).map((record) => (
              <div key={`${record.kind}-${record.id}`} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{record.name}</div>
                  <div className="text-xs capitalize text-neutral-500">{record.kind === "league" ? `League · ${record.teamCount ?? 0} teams` : "Team plan"}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-black tabular-nums">{money(record.monthlyFee)}</span>
                  <StatusBadge status={record.paymentMethod} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
