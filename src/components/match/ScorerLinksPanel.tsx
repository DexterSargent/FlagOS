"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Link2, Trash2 } from "lucide-react";
import { DEFAULT_SCORER_LINK_HOURS, SCORER_LINK_HOURS } from "@/lib/scorerAccess";
import { scorerAccessRequest, type ScorerLink } from "@/lib/scorerAccessClient";

function formatExpiry(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** League-admin controls for inviting a temporary, single-game scorer. */
export default function ScorerLinksPanel({ matchId }: { matchId: string }) {
  const [links, setLinks] = useState<ScorerLink[]>([]);
  const [hours, setHours] = useState<number>(DEFAULT_SCORER_LINK_HOURS);
  const [label, setLabel] = useState("");
  const [newLink, setNewLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await scorerAccessRequest<{ links: ScorerLink[] }>("list", { matchId });
      setLinks(result.links);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load scorer links.");
    }
  }, [matchId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createLink = async () => {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const result = await scorerAccessRequest<{ path: string; expiresAt: number }>("create", { matchId, hours, label });
      setNewLink({ url: `${window.location.origin}${result.path}`, expiresAt: result.expiresAt });
      setLabel("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create a scorer link.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (linkId?: string) => {
    if (!linkId && !confirm("Revoke every scorer link for this game? Anyone using one loses access immediately.")) return;
    setBusy(true);
    setError("");
    try {
      await scorerAccessRequest("revoke", { matchId, ...(linkId ? { linkId } : {}) });
      setNewLink(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't revoke access.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!newLink) return;
    try {
      await navigator.clipboard.writeText(newLink.url);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the link and copy it manually.");
    }
  };

  return (
    <div data-tour="match-scorer-links" className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-white">Scorer access</h3>
          <p className="text-xs text-neutral-400">
            Let someone else keep score for this game only. Each link works for one person, expires on its own, and can be revoked at any time.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          placeholder="Who is it for? (optional)"
          aria-label="Who the scorer link is for"
          className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        />
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          aria-label="How long the link works"
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          {SCORER_LINK_HOURS.map((h) => <option key={h} value={h}>Works for {h} hours</option>)}
        </select>
        <button
          type="button"
          onClick={createLink}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Link2 className="w-3.5 h-3.5" /> Create link
        </button>
      </div>

      {newLink && (
        <div className="rounded-xl border border-emerald-500/40 bg-black/40 p-3 space-y-2">
          <p className="text-[11px] text-emerald-300 font-bold">
            Send this link to your scorer. It is shown only once and works until {formatExpiry(newLink.expiresAt)}.
          </p>
          <div className="flex gap-2">
            <input readOnly value={newLink.url} onFocus={(e) => e.currentTarget.select()} aria-label="Scorer link" className="flex-1 min-w-0 rounded-lg bg-black/60 px-2 py-1.5 text-[11px] text-white font-mono" />
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 text-xs font-bold text-white hover:bg-white/10">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Active links</p>
          <ul className="space-y-1.5">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{link.label || "Unnamed scorer"}</p>
                  <p className="text-neutral-400 truncate">
                    {link.redeemedByEmail ? `Used by ${link.redeemedByEmail}` : "Not opened yet"} · ends {formatExpiry(link.expiresAt)}
                  </p>
                </div>
                <button type="button" onClick={() => revoke(link.id)} disabled={busy} className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                  <Trash2 className="w-3 h-3" /> Revoke
                </button>
              </li>
            ))}
          </ul>
          {links.length > 1 && (
            <button type="button" onClick={() => revoke()} disabled={busy} className="text-[11px] font-bold text-red-300 hover:underline disabled:opacity-50">
              Revoke all links for this game
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
    </div>
  );
}
