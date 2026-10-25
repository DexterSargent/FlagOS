"use client";

import { usePageGuide } from "@/lib/pageGuide";
import { ACCOUNT_WALKTHROUGH } from "@/lib/walkthroughs/public";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { accountEmailRequest, confirmAccountOwner, connectAccountEmail } from "@/lib/accountEmails";
import type { AccountEmailSettings } from "@/lib/accountEmailTypes";

export default function AccountPage() {
  usePageGuide(ACCOUNT_WALKTHROUGH);
  const { user, loading, logout } = useAuth();
  const [settings, setSettings] = useState<AccountEmailSettings | null>(null);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div data-tour="account-intro" className="mx-auto max-w-xl space-y-6">
        <Link href="/login" className="text-sm text-neutral-400 hover:text-white">Back to sign-in settings</Link>
        <h1 className="text-3xl font-black">Account &amp; Connected Emails</h1>
        <p className="text-sm text-neutral-400">
          One person, one FlagOS account. Connect up to ten verified sign-in emails.
          Connecting an email uses this account&apos;s profile and permissions; it does not merge another account&apos;s records or import its roles.
        </p>
        {loading ? <p role="status">Loading account...</p> : !user ? (
          <Link href="/login?redirect=%2Faccount" className="text-cyan-400">Sign in to manage connected emails</Link>
        ) : !user.emailVerified ? (
          <p role="alert">Verify your primary email, then sign out and sign in again before connecting other emails.</p>
        ) : (
          <>
            {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</p>}
            <section data-tour="account-emails" className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900 p-5">
              <h2 className="font-bold">Connected sign-in emails ({settings?.emails.length ?? 1})</h2>
              {(settings?.emails || [{ uid: user.uid, email: user.email || "" }]).map((entry) => (
                <div key={entry.uid} className="flex items-center justify-between gap-3 break-all text-sm">
                  <span>{entry.email}{entry.uid === user.uid && <span className="ml-2 text-xs text-neutral-400">Primary account</span>}</span>
                  {entry.uid !== user.uid && (
                    <button disabled={busy || !confirmed} className="text-red-300 disabled:opacity-40" onClick={() => {
                      if (!window.confirm("Disconnect this email? You will be signed out and other sessions will lose refresh access. Existing ID tokens may remain valid for up to one hour. The additional email can still sign in to its original account.")) return;
                      void run(async () => {
                        await accountEmailRequest(user, "disconnect", { uid: entry.uid });
                        await logout();
                      });
                    }}>Disconnect</button>
                  )}
                </div>
              ))}
            </section>
            {!confirmed ? (
              <section data-tour="account-confirm" className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900 p-5">
                <h2 className="font-bold">1. Confirm your primary account</h2>
                <p className="text-xs text-neutral-400">Sign in again as {user.email} before adding or disconnecting an email.</p>
                <form className="space-y-3" onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => { await confirmAccountOwner(user, ownerPassword); setConfirmed(true); });
                }}>
                  <label className="block text-sm" htmlFor="owner-password">Primary account password</label>
                  <input id="owner-password" type="password" autoComplete="current-password" required value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black p-3" />
                  <button disabled={busy} className="rounded-xl bg-cyan-600 px-4 py-2 font-bold disabled:opacity-50">Confirm with password</button>
                </form>
                <button disabled={busy} className="text-sm text-cyan-300 disabled:opacity-50" onClick={() => void run(async () => {
                  await confirmAccountOwner(user);
                  setConfirmed(true);
                })}>Confirm with Google instead</button>
              </section>
            ) : (
              <section data-tour="account-connect" className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900 p-5">
                <h2 className="font-bold">2. Sign in to the additional email</h2>
                <p className="text-xs text-neutral-400">Use an existing verified account. This will not switch your current session.</p>
                <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void connect(true); }}>
                  <label htmlFor="connected-email" className="block text-sm">Additional email</label>
                  <input id="connected-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black p-3" />
                  <label htmlFor="connected-password" className="block text-sm">Additional account password</label>
                  <input id="connected-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black p-3" />
                  <button disabled={busy || !settings} className="rounded-xl bg-cyan-600 px-4 py-2 font-bold disabled:opacity-50">{busy ? "Connecting..." : "Connect email"}</button>
                </form>
                <button disabled={busy || !settings} className="text-sm text-cyan-300 disabled:opacity-50" onClick={() => void connect(false)}>Connect another Google account</button>
                <button disabled={busy} className="block text-xs text-neutral-400 hover:text-white" onClick={() => setConfirmed(false)}>Confirm primary account again</button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
