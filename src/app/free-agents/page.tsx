"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, Search, UserPlus } from "lucide-react";
import { usePageGuide } from "@/lib/pageGuide";
import { FREE_AGENTS_WALKTHROUGH } from "@/lib/walkthroughs/public";
import { getCachedLeaguesDirectory } from "@/lib/leagueDataCache";
import { buildDirectoryCatalog, type DirectoryLeague } from "@/lib/leagueDirectoryData";
import { useAuth } from "@/lib/authContext";

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 focus:border-emerald-500 text-sm text-slate-900 dark:text-white outline-none";

export default function FreeAgentsPage() {
  usePageGuide(FREE_AGENTS_WALKTHROUGH);
  const { user } = useAuth();
  const [remoteLeagues, setRemoteLeagues] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", area: "", experience: "", notes: "", website: "" });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    getCachedLeaguesDirectory()
      .then(({ leagues }) => {
        if (current) setRemoteLeagues(leagues);
      })
      .catch(() => {
        // Signed-out visitors cannot list leagues; the interest form still works.
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [user]);

  const openLeagues = useMemo<DirectoryLeague[]>(
    () =>
      buildDirectoryCatalog([], undefined, remoteLeagues as Record<string, unknown>[]).filter(
        (league) => league.isListed && league.acceptsFreeAgents,
      ),
    [remoteLeagues],
  );

  useEffect(() => {
    if (user?.email) setForm((prev) => (prev.email ? prev : { ...prev, email: user.email || "" }));
  }, [user]);

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ageConfirmed) {
      setError("Please confirm you are 18+ or have a parent or guardian's permission.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/public/free-agent-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ageConfirmed }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't save your details. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07090E] text-slate-900 dark:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <header className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Players without a team
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Find a Team</h1>
          <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-2xl">
            A <strong>free agent</strong> is a player who signs up without a team. The league organizer places free agents
            on teams that need players. Register with a league below, or leave your details so an organizer near you can reach out.
          </p>
        </header>

        <section data-tour="free-agent-leagues" className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-neutral-300">
            Leagues accepting free agents
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-neutral-400">Loading leagues…</p>
          ) : openLeagues.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-neutral-400 flex items-start gap-3">
              <Search className="w-5 h-5 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <p>
                {user
                  ? "No public leagues are accepting free agents right now. Leave your details below and we'll pass them to organizers in your area."
                  : "Sign in to see public leagues accepting free agents, or leave your details below and we'll pass them to organizers in your area."}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {openLeagues.map((league) => (
                <li
                  key={league.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 space-y-3"
                >
                  <div>
                    <h3 className="font-black uppercase text-base leading-snug">{league.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {[league.venue.city, league.gameDay, league.competitionTier].filter(Boolean).join(" · ") || league.rulesFormat}
                      </span>
                    </p>
                    {league.individualFee !== undefined && (
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">${league.individualFee} per player</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/join?league=${league.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider"
                      style={{ backgroundColor: "#2b7d04", color: "#ffffff" }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Register as Free Agent
                    </Link>
                    <Link
                      href={`/league/${league.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 text-xs font-bold uppercase tracking-wider"
                    >
                      League Page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          data-tour="free-agent-interest"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-white/10 space-y-4"
        >
          {submitted ? (
            <div className="py-6 text-center space-y-2" role="status">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <h2 className="text-lg font-black uppercase">Thanks — you&apos;re on the list</h2>
              <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
                We&apos;ll share your details with organizers near {form.area}. They&apos;ll contact you at {form.email}. Your details are never shown publicly.
              </p>
              <Link href="/leagues" className="inline-block mt-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline">
                Browse the league directory
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-black uppercase">Leave your details</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Only FlagOS staff and league organizers see this. It is never shown publicly.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold">Name *</span>
                  <input required maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold">Email *</span>
                  <input required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold">City / Area *</span>
                  <input required maxLength={120} placeholder="e.g. Toronto, ON" value={form.area} onChange={(e) => update("area", e.target.value)} className={inputClass} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold">Experience</span>
                  <select value={form.experience} onChange={(e) => update("experience", e.target.value)} className={inputClass}>
                    <option value="">Choose one (optional)</option>
                    <option>New to flag football</option>
                    <option>Some experience</option>
                    <option>Experienced</option>
                  </select>
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-bold">Notes</span>
                  <textarea
                    maxLength={500}
                    rows={3}
                    placeholder="Positions you like, availability, anything organizers should know"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    className={inputClass}
                  />
                </label>
                {/* Honeypot field hidden from people; bots tend to fill it. */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="hidden"
                  name="website"
                />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600"
                />
                <span>I am 18 or older, or a parent/guardian is submitting this for me.</span>
              </label>
              {error && (
                <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#256c03] hover:bg-[#1d5502] text-[#fff] text-xs font-black uppercase tracking-wider disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send My Details"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
