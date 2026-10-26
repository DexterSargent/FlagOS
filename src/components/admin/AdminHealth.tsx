"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, HeartPulse, LoaderCircle, MailWarning, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { PlatformHealthReport } from "@/lib/platformHealth";
import { formatDate } from "@/lib/adminMetrics";
import { EmptyState, Panel, StatCard, ghostButtonClass } from "./AdminUi";

function ReviewButton({ id, onReview }: { id: string; onReview: (id: string) => void }) {
  return (
    <button type="button" className={ghostButtonClass} onClick={() => onReview(id)}>
      Review
    </button>
  );
}

export default function AdminHealth({
  report,
  loading,
  error,
  onRefresh,
  onReview,
}: {
  report: PlatformHealthReport | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onReview: (id: string) => void;
}) {
  if (!report) {
    return (
      <div data-tour="admin-health-panels" className="flex flex-col items-center gap-3 py-16 text-sm text-neutral-400">
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-cyan-400" /> : <HeartPulse className="h-6 w-6 text-neutral-500" />}
        {loading ? "Scanning platform data\u2026" : error || "Run a health check to see what needs attention."}
        {!loading && <button type="button" className={ghostButtonClass} onClick={onRefresh}>Run health check</button>}
      </div>
    );
  }

  const overdue = report.renewals.filter((item) => item.overdue).length;
  return (
    <div data-tour="admin-health-panels" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <span>
          Checked {new Date(report.generatedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })} · {report.scanned.leagues} leagues, {report.scanned.teams} teams,{" "}
          {report.scanned.players} players, {report.scanned.matches} games, {report.scanned.plays} plays. Read-only: nothing is changed or deleted automatically.
        </span>
        <button type="button" className={ghostButtonClass} onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-run
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      {report.truncated.length > 0 && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          The scan reached its limit for {report.truncated.join(", ")}, so some checks were skipped.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Integrity warnings" value={report.integrity.length} icon={AlertTriangle} tone={report.integrity.length ? "rose" : "emerald"} />
        <StatCard label="Renewals due" value={report.renewals.length} hint={overdue ? `${overdue} overdue` : undefined} icon={CreditCard} tone={overdue ? "rose" : "amber"} />
        <StatCard label="Seasons ending" value={report.rollover.length} icon={CalendarClock} tone="violet" />
        <StatCard label="Cleanup candidates" value={report.stale.length} icon={Trash2} tone="neutral" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Data integrity" icon={AlertTriangle}>
          {report.integrity.length === 0 ? (
            <EmptyState><CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-emerald-400" />No broken links between leagues, teams, players, games, and plays.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.integrity.slice(0, 50).map((issue) => (
                <li key={`${issue.code}-${issue.targetId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2">
                  <span className="min-w-0 flex-1 break-words">{issue.message}</span>
                  {(issue.targetKind === "league" || issue.targetKind === "team") && <ReviewButton id={issue.targetId} onReview={onReview} />}
                </li>
              ))}
              {report.integrity.length > 50 && <li className="text-xs text-neutral-400">+{report.integrity.length - 50} more</li>}
            </ul>
          )}
        </Panel>

        <Panel title="Renewals (next 7 days)" icon={CreditCard}>
          {report.renewals.length === 0 ? (
            <EmptyState>No paid renewals due this week.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.renewals.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2">
                  <span className="min-w-0 flex-1 break-words">
                    <b>{item.name}</b> <span className="text-neutral-400">({item.kind})</span>
                    <span className={`ml-2 text-xs font-bold ${item.overdue ? "text-rose-300" : "text-amber-300"}`}>{item.overdue ? "Overdue" : "Due"} {formatDate(item.renewsAt)}</span>
                  </span>
                  <ReviewButton id={item.id} onReview={onReview} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Seasons ending soon" icon={CalendarClock}>
          {report.rollover.length === 0 ? (
            <EmptyState>No active season has its final scheduled game in the next two weeks.</EmptyState>
          ) : (
            <ul className="space-y-2 text-sm">
              {report.rollover.map((item) => (
                <li key={item.leagueId} className="rounded-xl border border-white/5 px-3 py-2">
                  <b>{item.leagueName}</b>: {item.seasonTitle}
                  <div className="text-xs text-neutral-400">
                    Final game {formatDate(item.lastGameAt)} ({item.daysUntilEnd >= 0 ? `in ${item.daysUntilEnd} days` : `${-item.daysUntilEnd} days ago`}). Admins get a one-time Start New Season reminder by email.
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Stale and test records" icon={Trash2}>
          {report.stale.length === 0 ? (
            <EmptyState>No trial, archived, or test-named records idle for 30+ days.</EmptyState>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-400">Dry run. Review each record in Customers and delete it there if it is no longer needed.</p>
              <ul className="space-y-2 text-sm">
                {report.stale.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-3 py-2">
                    <span className="min-w-0 flex-1 break-words">
                      <b>{item.name}</b> <span className="text-neutral-400">({item.kind})</span>
                      <span className="block text-xs text-neutral-400">{item.reasons.join(" \u00b7 ")} · last activity {formatDate(item.lastActivityAt)}</span>
                    </span>
                    <ReviewButton id={item.id} onReview={onReview} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="New this week" icon={Sparkles}>
          {report.newRecords.length === 0 ? (
            <EmptyState>No new leagues, teams, or free agents in the last 7 days.</EmptyState>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {report.newRecords.slice(0, 30).map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex flex-wrap justify-between gap-2">
                  <span className="min-w-0 break-words">{item.name} <span className="text-neutral-400">({item.kind.replace("_", " ")})</span></span>
                  <span className="text-xs text-neutral-400">{formatDate(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Unverified admin emails" icon={MailWarning}>
          {report.unverifiedAdmins.length === 0 ? (
            <EmptyState>Every league and team admin with an account has verified their email.</EmptyState>
          ) : (
            <ul className="space-y-1 text-sm">
              {report.unverifiedAdmins.map((email) => <li key={email} className="break-all">{email}</li>)}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
