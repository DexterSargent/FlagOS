"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { AlertCircle, ArrowLeft, Building2, ExternalLink, LoaderCircle, LockKeyhole, RefreshCw, Search, Shield, Users } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";

interface ManagedRecord {
  id: string;
  name: string;
  shortcode: string;
  visibility?: string;
  subscriptionStatus?: string;
  leagueId?: string;
  [key: string]: unknown;
}

const getText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

export default function PlatformAdminPage() {
  const router = useRouter();
  const { user, isPlatformAdmin, loading: authLoading } = useAuth();
  const [leagues, setLeagues] = useState<ManagedRecord[]>([]);
  const [teams, setTeams] = useState<ManagedRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [updatingLeagueId, setUpdatingLeagueId] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    setError("");
    try {
      const [leagueSnapshot, teamSnapshot] = await Promise.all([
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "teams")),
      ]);
      setLeagues(
        leagueSnapshot.docs.map((record) => {
          const data = record.data();
          return {
            ...data,
            id: record.id,
            name: getText(data.leagueName ?? data.name, "Untitled league"),
            shortcode: getText(data.shortcode, ""),
            visibility: getText(data.visibility, "public"),
            subscriptionStatus: getText(data.subscription?.status, "Not set"),
          };
        })
      );
      setTeams(
        teamSnapshot.docs.map((record) => {
          const data = record.data();
          return {
            ...data,
            id: record.id,
            name: getText(data.name ?? data.teamName, "Untitled team"),
            shortcode: getText(data.shortcode, ""),
            leagueId: getText(data.leagueId, ""),
            subscriptionStatus: getText(data.subscription?.status, "Not set"),
          };
        })
      );
    } catch (loadError) {
      console.error("Failed to load platform records:", loadError);
      setError("Could not load leagues and teams. Check the Firebase connection and try again.");
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent("/admin")}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && isPlatformAdmin) void loadRecords();
  }, [authLoading, isPlatformAdmin, loadRecords]);

  const filteredLeagues = useMemo(
    () => leagues.filter((league) => `${league.name} ${league.shortcode} ${league.id}`.toLowerCase().includes(search.toLowerCase())),
    [leagues, search]
  );
  const filteredTeams = useMemo(
    () => teams.filter((team) => `${team.name} ${team.shortcode} ${team.id} ${team.leagueId || ""}`.toLowerCase().includes(search.toLowerCase())),
    [teams, search]
  );

  const toggleLeagueVisibility = async (league: ManagedRecord) => {
    const visibility = league.visibility === "private" ? "public" : "private";
    setUpdatingLeagueId(league.id);
    setError("");
    try {
      await updateDoc(doc(db, "leagues", league.id), { visibility });
      setLeagues((current) => current.map((entry) => entry.id === league.id ? { ...entry, visibility } : entry));
    } catch (updateError) {
      console.error(`Failed to update visibility for league ${league.id}:`, updateError);
      setError(`Could not update ${league.name}. Try again.`);
    } finally {
      setUpdatingLeagueId(null);
    }
  };

  if (authLoading || (!user && !isPlatformAdmin)) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-neutral-950 text-neutral-300">
        <LoaderCircle className="h-6 w-6 animate-spin text-cyan-400" aria-label="Checking access" />
      </main>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-neutral-950 px-6 text-white">
        <section className="max-w-md rounded-3xl border border-amber-500/20 bg-neutral-900 p-8 text-center">
          <LockKeyhole className="mx-auto h-9 w-9 text-amber-400" />
          <h1 className="mt-4 text-xl font-black">Restricted platform area</h1>
          <p className="mt-2 text-sm text-neutral-400">This management page is only available to the FlagOS platform owner.</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">
            Return to FlagOS
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> FlagOS home
            </Link>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Platform management</h1>
            <p className="mt-2 text-sm text-neutral-400">View and manage customer leagues and team portals.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loadingRecords}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRecords ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <Building2 className="h-8 w-8 text-cyan-300" />
            <div><div className="text-2xl font-black">{leagues.length}</div><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Leagues</div></div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <Users className="h-8 w-8 text-emerald-300" />
            <div><div className="text-2xl font-black">{teams.length}</div><div className="text-xs font-bold uppercase tracking-wide text-neutral-400">Teams</div></div>
          </div>
        </div>

        <label className="mt-7 flex max-w-xl items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search leagues, teams, or IDs"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-600"
          />
        </label>

        {error && (
          <div role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loadingRecords ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-neutral-400">
            <LoaderCircle className="h-5 w-5 animate-spin text-cyan-400" /> Loading platform records…
          </div>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Building2 className="h-5 w-5 text-cyan-300" /> Leagues</h2>
              <div className="space-y-3">
                {filteredLeagues.map((league) => (
                  <article key={league.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{league.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{league.shortcode || "No shortcode"} · {league.id}</p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-300">
                        {league.subscriptionStatus}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/league/${league.id}`} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
                        Manage league <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        disabled={updatingLeagueId === league.id}
                        onClick={() => void toggleLeagueVisibility(league)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-white/5 disabled:opacity-50"
                      >
                        {updatingLeagueId === league.id ? "Saving…" : `Make ${league.visibility === "private" ? "public" : "private"}`}
                      </button>
                    </div>
                  </article>
                ))}
                {!filteredLeagues.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-neutral-500">No leagues found.</p>}
              </div>
            </section>

            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Shield className="h-5 w-5 text-emerald-300" /> Teams</h2>
              <div className="space-y-3">
                {filteredTeams.map((team) => (
                  <article key={team.id} className="rounded-2xl border border-white/10 bg-neutral-900 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold">{team.name}</h3>
                        <p className="mt-1 text-xs text-neutral-500">{team.shortcode || "No shortcode"} · {team.id}</p>
                        {team.leagueId && <p className="mt-1 text-xs text-neutral-600">League: {team.leagueId}</p>}
                      </div>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-300">
                        {team.subscriptionStatus}
                      </span>
                    </div>
                    <Link href={`/teams/${team.id}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20">
                      Manage team <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))}
                {!filteredTeams.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-neutral-500">No teams found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
