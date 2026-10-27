"use client";

import React, { useState } from "react";
import { MailCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";

/** Shown to password accounts that signed in before clicking their verification link. */
export default function EmailVerificationNotice() {
  const { user, resendVerificationEmail, confirmEmailVerified, logout } = useAuth();
  const [busy, setBusy] = useState<"" | "send" | "check">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resend = async () => {
    setBusy("send");
    setError("");
    const result = await resendVerificationEmail();
    if (result.success) setMessage(result.message || "Verification link sent.");
    else setError(result.message);
    setBusy("");
  };

  const check = async () => {
    setBusy("check");
    setError("");
    setMessage("");
    try {
      const verified = await confirmEmailVerified();
      if (!verified) setError("We still can't see the verification. Open the link in the email, then try again.");
    } catch {
      setError("Couldn't refresh your account. Try again.");
    }
    setBusy("");
  };

  return (
    <div className="w-full space-y-3 text-left" data-testid="email-verification-notice">
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-100">
        <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
          <MailCheck className="w-4 h-4 shrink-0" />
          <span>Verify your email to continue</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          FlagOS links you to your league and team by email. Click the verification link we sent to{" "}
          <strong className="break-all">{user?.email}</strong> to unlock your league portal.
        </p>
      </div>
      {message && <p role="status" className="text-[11px] text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-[11px] text-rose-700 dark:text-rose-300">{error}</p>}
      <button
        type="button"
        onClick={check}
        disabled={!!busy}
        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
      >
        {busy === "check" ? "Checking…" : "I've verified my email"}
      </button>
      <button
        type="button"
        onClick={resend}
        disabled={!!busy}
        className="w-full py-2.5 px-4 border border-neutral-300 dark:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-60 text-neutral-800 dark:text-neutral-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
      >
        {busy === "send" ? "Sending…" : "Resend verification email"}
      </button>
      <button
        type="button"
        onClick={logout}
        className="w-full py-2.5 min-h-[44px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
      >
        Sign out
      </button>
    </div>
  );
}
