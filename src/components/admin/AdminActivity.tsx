"use client";

import { useMemo, useState } from "react";
import { Activity, Building2, CreditCard, Search, Shield, Trash2, UserCog } from "lucide-react";
import type { AuditEntry } from "@/lib/adminMetrics";
import { EmptyState, Panel } from "./AdminUi";

type Group = "all" | "billing" | "customers" | "users";

function groupOf(action: string): Exclude<Group, "all"> {
  if (action.startsWith("ledger") || action.startsWith("subscription")) return "billing";
  if (action.startsWith("user")) return "users";
  return "customers";
}

function iconFor(action: string) {
  if (action.startsWith("delete") || action === "ledger_delete") return Trash2;
  if (action.startsWith("ledger") || action.startsWith("subscription")) return CreditCard;
  if (action.startsWith("user")) return UserCog;
  if (action.includes("team")) return Shield;
  return Building2;
}

function dayLabel(value: number | null): string {
  if (value === null) return "Unknown date";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AdminActivity({ entries }: { entries: AuditEntry[] }) {
  const [group, setGroup] = useState<Group>("all");
  const [search, setSearch] = useState("");
  const days = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = entries
      .filter((entry) => group === "all" || groupOf(entry.action) === group)
      .filter((entry) => !term || entry.summary.toLowerCase().includes(term) || entry.actorEmail.includes(term) || (entry.targetId || "").toLowerCase().includes(term));
    const grouped = new Map<string, AuditEntry[]>();
    for (const entry of filtered) {
      const label = dayLabel(entry.createdAt);
      grouped.set(label, [...(grouped.get(label) || []), entry]);
    }
    return [...grouped.entries()];
  }, [entries, group, search]);

  return (
    <Panel
      tour="admin-activity-log"
      title="Activity log"
      icon={Activity}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-neutral-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activity"
              aria-label="Search activity"
              className="w-32 bg-transparent text-xs outline-none placeholder:text-neutral-600 sm:w-44"
            />
          </label>
          <select
            aria-label="Filter activity"
            value={group}
            onChange={(event) => setGroup(event.target.value as Group)}
            className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs font-bold text-neutral-200"
          >
            <option value="all">All activity</option>
            <option value="customers">Leagues & teams</option>
            <option value="billing">Billing & ledger</option>
            <option value="users">Accounts</option>
          </select>
        </div>
      }
    >
      {days.length === 0 ? (
        <EmptyState>
          {entries.length === 0
            ? "No activity recorded yet. Changes you make to leagues, teams, billing, and accounts from now on will appear here."
            : "No activity matches."}
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {days.map(([label, dayEntries]) => (
            <div key={label}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</h3>
              <ol className="space-y-1.5 border-l border-white/10 pl-4">
                {dayEntries.map((entry) => {
                  const Icon = iconFor(entry.action);
                  return (
                    <li key={entry.id} className="relative flex gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.03]">
                      <span className="absolute -left-[1.4rem] top-2.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-neutral-900">
                        <Icon className="h-2.5 w-2.5 text-neutral-400" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm">{entry.summary}</div>
                        <div className="text-xs text-neutral-500">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : ""} · {entry.actorEmail}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
