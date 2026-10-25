"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Download, LoaderCircle, Search, ShieldCheck, Users } from "lucide-react";
import { formatDate, toCsv, type PlatformUser } from "@/lib/adminMetrics";
import { isPlatformAdminEmail } from "@/lib/platformAdmin";
import { EmptyState, Panel, StatCard, downloadCsv, ghostButtonClass } from "./AdminUi";

type Filter = "all" | "admins" | "unverified" | "disabled" | "dormant";

export interface Membership {
  id: string;
  name: string;
  kind: "league" | "team";
}

export default function AdminUsers({
  users,
  memberships,
  onSetDisabled,
}: {
  users: PlatformUser[];
  memberships: Map<string, Membership[]>;
  onSetDisabled: (user: PlatformUser, disabled: boolean) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const dormantCutoff = Date.now() - 90 * 86_400_000;
  const monthAgo = Date.now() - 30 * 86_400_000;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((user) => {
        if (filter === "admins") return (memberships.get(user.email)?.length ?? 0) > 0;
        if (filter === "unverified") return !user.emailVerified;
        if (filter === "disabled") return user.disabled;
        if (filter === "dormant") return (user.lastSignInAt ?? 0) < dormantCutoff;
        return true;
      })
      .filter((user) => !term || user.email.includes(term) || user.displayName.toLowerCase().includes(term) || user.uid.toLowerCase().includes(term) ||
        (memberships.get(user.email) || []).some((membership) => membership.name.toLowerCase().includes(term)))
      .sort((a, b) => (b.lastSignInAt ?? 0) - (a.lastSignInAt ?? 0));
  }, [users, memberships, search, filter, dormantCutoff]);

  const exportUsers = () => {
    downloadCsv(
      "flagos-users.csv",
      toCsv(
        ["Email", "Name", "UID", "Verified", "Disabled", "Created", "Last active", "Manages"],
        rows.map((user) => [
          user.email,
          user.displayName,
          user.uid,
          user.emailVerified ? "yes" : "no",
          user.disabled ? "yes" : "no",
          user.createdAt ? new Date(user.createdAt).toISOString() : "",
          user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : "",
          (memberships.get(user.email) || []).map((membership) => `${membership.name} (${membership.kind})`).join("; "),
        ]),
      ),
    );
  };

  const toggle = async (user: PlatformUser) => {
    setPendingUid(user.uid);
    try {
      await onSetDisabled(user, !user.disabled);
    } finally {
      setPendingUid(null);
    }
  };

  return (
    <div className="space-y-5">
      <div data-tour="admin-users-stats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Accounts" value={users.length} icon={Users} tone="cyan" />
        <StatCard label="New (30d)" value={users.filter((user) => (user.createdAt ?? 0) >= monthAgo).length} tone="emerald" />
        <StatCard label="Active (30d)" value={users.filter((user) => (user.lastSignInAt ?? 0) >= monthAgo).length} tone="violet" />
        <StatCard label="Customer admins" value={users.filter((user) => (memberships.get(user.email)?.length ?? 0) > 0).length} icon={ShieldCheck} tone="amber" />
      </div>

      <Panel
        tour="admin-users-accounts"
        title={`Accounts (${rows.length})`}
        icon={Users}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email, name, league"
                aria-label="Search accounts"
                className="w-36 bg-transparent text-xs outline-none placeholder:text-neutral-600 sm:w-48"
              />
            </label>
            <select
              aria-label="Filter accounts"
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              className="rounded-lg border border-white/10 bg-neutral-950 px-2 py-1.5 text-xs font-bold text-neutral-200"
            >
              <option value="all">All accounts</option>
              <option value="admins">League / team admins</option>
              <option value="unverified">Unverified email</option>
              <option value="dormant">Inactive 90+ days</option>
              <option value="disabled">Disabled</option>
            </select>
            <button type="button" className={ghostButtonClass} onClick={exportUsers}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState>No accounts match.</EmptyState>
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((user) => {
              const managed = memberships.get(user.email) || [];
              const protectedAccount = isPlatformAdminEmail(user.email);
              return (
                <li key={user.uid} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`truncate text-sm font-bold ${user.disabled ? "text-neutral-500 line-through" : ""}`}>{user.email || "(no email)"}</span>
                      {protectedAccount && <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-300">Owner</span>}
                      {!user.emailVerified && <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">Unverified</span>}
                      {user.disabled && <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">Disabled</span>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-500">
                      {user.displayName ? `${user.displayName} · ` : ""}Joined {formatDate(user.createdAt)} · Active {formatDate(user.lastSignInAt)}
                      {user.providers.length > 0 && ` · ${user.providers.map((provider) => provider.replace(".com", "")).join(", ")}`}
                    </div>
                    {managed.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {managed.slice(0, 4).map((membership) => (
                          <span key={`${membership.kind}-${membership.id}`} className={`max-w-[12rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold ${membership.kind === "league" ? "bg-cyan-500/10 text-cyan-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                            {membership.name}
                          </span>
                        ))}
                        {managed.length > 4 && <span className="text-[10px] text-neutral-500">+{managed.length - 4} more</span>}
                      </div>
                    )}
                  </div>
                  {!protectedAccount && (
                    <button
                      type="button"
                      onClick={() => void toggle(user)}
                      disabled={pendingUid === user.uid}
                      className={`${ghostButtonClass} ${user.disabled ? "" : "hover:border-rose-500/40 hover:text-rose-200"}`}
                    >
                      {pendingUid === user.uid ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : user.disabled ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Ban className="h-3.5 w-3.5" />
                      )}
                      {user.disabled ? "Enable" : "Disable"}
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
