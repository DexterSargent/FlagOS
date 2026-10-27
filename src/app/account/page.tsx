"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { ACCOUNT_WALKTHROUGH } from "@/lib/walkthroughs/public";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { useLeague } from "@/lib/leagueContext";
import { useMyMemberships } from "@/lib/useMyMemberships";
import { accountEmailRequest, confirmAccountOwner, connectAccountEmail } from "@/lib/accountEmails";
import type { AccountEmailSettings } from "@/lib/accountEmailTypes";
import SiteControls from "@/components/SiteControls";
import {
  User,
  Mail,
  Shield,
  Trophy,
  Users,
  Key,
  Bell,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Settings,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

export default function AccountPage() {
  usePageGuide(ACCOUNT_WALKTHROUGH);
  const { user, loading, logout, sendPasswordReset, isPlatformAdmin } = useAuth();
  const { userLeagues: switcherLeagues } = useLeague();
  const { data: memberships } = useMyMemberships(user?.emailVerified ? user.uid : null);
  // Every league the account belongs to, in any role. The demo league is a preview, not a membership.
  const userLeagues = useMemo(() => {
    const list: Array<{ id: string; name: string; role: "owner" | "member" }> = [];
    const seen = new Set<string>(["default", "demo"]);
    for (const league of memberships?.leagues || []) {
      if (seen.has(league.id)) continue;
      seen.add(league.id);
      list.push({ id: league.id, name: league.name, role: league.isCommissioner ? "owner" : "member" });
    }
    for (const league of switcherLeagues) {
      if (seen.has(league.id)) continue;
      seen.add(league.id);
      list.push({ id: league.id, name: league.name, role: league.role === "owner" || league.role === "admin" ? "owner" : "member" });
    }
    return list;
  }, [memberships, switcherLeagues]);

  const userTeams = useMemo(() => {
    const list: Array<{ id: string; name: string; roleLabel: string }> = [];
    const seen = new Set<string>();

    if (memberships?.independentTeams) {
      for (const t of memberships.independentTeams) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          list.push({
            id: t.id,
            name: t.name,
            roleLabel: t.roles?.includes("coach") ? "Coach / Staff" : "Player",
          });
        }
      }
    }

    if (memberships?.leagues) {
      for (const l of memberships.leagues) {
        if (Array.isArray(l.teams)) {
          for (const t of l.teams) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              list.push({
                id: t.id,
                name: t.name,
                roleLabel: t.roles?.includes("coach") ? "Coach / Staff" : "Player",
              });
            }
          }
        }
      }
    }

    return list;
  }, [memberships]);

  const [settings, setSettings] = useState<AccountEmailSettings | null>(null);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password reset state
  const [resetSending, setResetSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Notification preferences (persisted locally)
  const [notifyGameDay, setNotifyGameDay] = useState(true);
  const [notifySchedules, setNotifySchedules] = useState(true);
  const [notifyScorekeeping, setNotifyScorekeeping] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  useEffect(() => {
    let active = true;
    setSettings(null);
    setConfirmed(false);
    if (user?.emailVerified) {
      accountEmailRequest<AccountEmailSettings>(user, "list").then(
        (result) => { if (active) setSettings(result); },
        (reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load connected emails."); },
      );
    }
    return () => { active = false; };
  }, [user]);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update account emails.");
    } finally {
      setBusy(false);
      setOwnerPassword("");
      setPassword("");
    }
  }

  async function connect(usePassword: boolean) {
    if (!user) return;
    await run(async () => {
      await connectAccountEmail(user, usePassword ? { email, password } : undefined);
      setSettings(await accountEmailRequest<AccountEmailSettings>(user, "list"));
      setEmail("");
      setMessage("Email connected. Sign in with either address to use this account.");
    });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      setProfileMessage("Display name updated successfully.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile name.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!user?.email) return;
    setResetSending(true);
    setResetSuccess(false);
    try {
      const result = await sendPasswordReset(user.email);
      if (result.success) {
        setResetSuccess(true);
      } else {
        setError(result.message || "Failed to send reset link.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setResetSending(false);
    }
  }

  function handleExportData() {
    if (!user) return;
    const summary = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      memberships: memberships || null,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flagos-account-summary-${user.uid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#07090E] text-slate-900 dark:text-white transition-colors flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-[#07090E]/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <SiteControls />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Intro */}
        <div data-tour="account-intro" className="space-y-2">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600 dark:text-[#3CA505]" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              Account &amp; Settings
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            One person, one FlagOS account. Manage your personal identity, portal affiliations, connected emails, and notification preferences.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-400" role="status">
            Loading account details...
          </div>
        ) : !user ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/60 p-8 text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-neutral-300">
              Sign in to manage your account settings, connected emails, and team memberships.
            </p>
            <Link
              href="/login?redirect=%2Faccount"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              Sign in to manage connected emails
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Verification Warning Alert */}
            {!user.emailVerified && (
              <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-bold">Email Verification Required</p>
                  <p className="text-xs">Verify your primary email, then sign out and sign in again before connecting other emails.</p>
                </div>
              </div>
            )}

            {/* Error & Message Alerts */}
            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                {message}
              </p>
            )}

            {/* SECTION 1: MY TEAMS & LEAGUES DASHBOARD HUB */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                    <span>My Portals &amp; Affiliations</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Jump directly to your active leagues and team portals.
                  </p>
                </div>
                <Link
                  href="/leagues"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Browse Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Leagues Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Leagues
                </h3>
                {userLeagues.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userLeagues.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-emerald-500/40 transition-all gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{l.name}</p>
                          <p className="text-xs text-slate-500 dark:text-neutral-400">
                            {l.role === "owner" ? "Commissioner / Admin" : "Member"}
                          </p>
                        </div>
                        <Link
                          href={`/league/${l.id}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-colors"
                        >
                          Open Hub
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-neutral-400 italic">No leagues affiliated yet.</p>
                )}
              </div>

              {/* Teams Grid */}
              {userTeams.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    Teams
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userTeams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-cyan-500/40 transition-all gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.name}</p>
                          <p className="text-xs text-slate-500 dark:text-neutral-400">
                            {t.roleLabel}
                          </p>
                        </div>
                        <Link
                          href={`/teams/${t.id}`}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-colors"
                        >
                          Team Portal
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* SECTION 2: PROFILE & IDENTITY */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                  <span>Profile &amp; Display Name</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Update how your name appears across team rosters and game stat sheets.
                </p>
              </div>

              {profileMessage && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{profileMessage}</p>
              )}
              {profileError && (
                <p className="text-xs font-bold text-red-600 dark:text-red-400">{profileError}</p>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-3 max-w-md">
                <div>
                  <label htmlFor="account-display-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1">
                    Display Name
                  </label>
                  <input
                    id="account-display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {profileSaving ? "Saving..." : "Update Name"}
                </button>
              </form>
            </section>

            {/* SECTION 3: CONNECTED EMAILS (PRESERVED FOR TEST SUITE) */}
            <section data-tour="account-emails" className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm">
              <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                  <span>Connected sign-in emails ({settings?.emails.length ?? 1})</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Connect up to ten verified sign-in emails to access this single FlagOS profile.
                </p>
              </div>

              {(settings?.emails || [{ uid: user.uid, email: user.email || "" }]).map((entry) => (
                <div key={entry.uid} className="flex items-center justify-between gap-3 break-all text-sm py-2 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5">
                  <span className="font-medium text-slate-800 dark:text-neutral-200">
                    {entry.email}
                    {entry.uid === user.uid && <span className="ml-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">Primary account</span>}
                  </span>
                  {entry.uid !== user.uid && (
                    <button
                      disabled={busy || !confirmed}
                      className="text-xs font-bold text-red-600 dark:text-red-300 hover:underline disabled:opacity-40"
                      onClick={() => {
                        if (!window.confirm("Disconnect this email? You will be signed out and other sessions will lose refresh access. Existing ID tokens may remain valid for up to one hour. The additional email can still sign in to its original account.")) return;
                        void run(async () => {
                          await accountEmailRequest(user, "disconnect", { uid: entry.uid });
                          await logout();
                        });
                      }}
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              ))}
            </section>

            {/* EMAIL CONNECTION CONFIRMATION WORKFLOW (FOR TESTS) */}
            {!confirmed ? (
              <section data-tour="account-confirm" className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">1. Confirm your primary account</h2>
                <p className="text-xs text-slate-600 dark:text-neutral-400">Sign in again as {user.email} before adding or disconnecting an email.</p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(async () => { await confirmAccountOwner(user, ownerPassword); setConfirmed(true); });
                  }}
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1" htmlFor="owner-password">
                      Primary account password
                    </label>
                    <input
                      id="owner-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={ownerPassword}
                      onChange={(event) => setOwnerPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black p-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button disabled={busy} className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors">
                    Confirm with password
                  </button>
                </form>
                <button
                  disabled={busy}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-300 hover:underline disabled:opacity-50 block mt-2"
                  onClick={() => void run(async () => {
                    await confirmAccountOwner(user);
                    setConfirmed(true);
                  })}
                >
                  Confirm with Google instead
                </button>
              </section>
            ) : (
              <section data-tour="account-connect" className="space-y-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm">
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">2. Sign in to the additional email</h2>
                <p className="text-xs text-slate-600 dark:text-neutral-400">Use an existing verified account. This will not switch your current session.</p>
                <form
                  className="space-y-3"
                  onSubmit={(event) => { event.preventDefault(); void connect(true); }}
                >
                  <div>
                    <label htmlFor="connected-email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1">
                      Additional email
                    </label>
                    <input
                      id="connected-email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black p-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="connected-password" className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-neutral-400 mb-1">
                      Additional account password
                    </label>
                    <input
                      id="connected-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black p-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    disabled={busy || !settings}
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    {busy ? "Connecting..." : "Connect email"}
                  </button>
                </form>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    disabled={busy || !settings}
                    className="text-xs font-bold text-cyan-600 dark:text-cyan-300 hover:underline disabled:opacity-50"
                    onClick={() => void connect(false)}
                  >
                    Connect another Google account
                  </button>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <button
                    disabled={busy}
                    className="text-xs text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    onClick={() => setConfirmed(false)}
                  >
                    Confirm primary account again
                  </button>
                </div>
              </section>
            )}

            {/* SECTION 4: SECURITY & PASSWORD */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                  <span>Security &amp; Password</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Request a secure password change link delivered directly to your verified email.
                </p>
              </div>

              {resetSuccess && (
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Password reset link has been dispatched to {user.email}. Please check your inbox.
                </p>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetSending}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {resetSending ? "Sending link..." : "Send Password Reset Link"}
                </button>
              </div>
            </section>

            {/* SECTION 5: NOTIFICATIONS PREFERENCES */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                  <span>Notification Preferences</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Manage game day reminders and schedule modification alerts.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">Game Day Alerts</p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">Receive reminder notices 2 hours prior to scheduled kickoff</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyGameDay}
                    onChange={(e) => setNotifyGameDay(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-neutral-200">Schedule Change Notices</p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">Instant notification when field locations or kickoff times shift</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifySchedules}
                    onChange={(e) => setNotifySchedules(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>
              </div>
            </section>

            {/* SECTION 6: DATA EXPORT & ACTIONS */}
            <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-neutral-900/70 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-white/5 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-[#3CA505]" />
                  <span>Data &amp; Privacy</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  You own 100% of your account data. Export your profile records at any time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-neutral-200 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Account Data (JSON)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider transition-colors ml-auto"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
