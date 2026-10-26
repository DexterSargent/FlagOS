"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Mail, RefreshCw, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";

interface InterestEntry {
  id: string;
  name: string;
  email: string;
  area: string;
  experience?: string;
  notes?: string;
  createdAt?: { toDate?: () => Date };
}

/** Platform-admin list of public free-agent interest submissions (read and delete only). */
export default function AdminFreeAgents() {
  const [entries, setEntries] = useState<InterestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(query(collection(db, "free_agent_interest"), orderBy("createdAt", "desc"), limit(200)));
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InterestEntry, "id">) })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await deleteDoc(doc(db, "free_agent_interest", id));
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the submission.");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <section data-tour="admin-free-agents" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black">Free Agent Interest</h2>
          <p className="text-xs text-neutral-400">
            Submitted from the public Find a Team page. Forward them to organizers in the player&apos;s area.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-neutral-200 hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}
      {loading ? (
        <FlagOSLoader label="Loading free agents" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-neutral-400">No submissions yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="font-bold text-white">
                  {entry.name} <span className="font-normal text-neutral-400">· {entry.area}</span>
                </div>
                <div className="text-xs text-neutral-400 break-all">{entry.email}</div>
                {(entry.experience || entry.notes) && (
                  <div className="text-xs text-neutral-300 break-words">
                    {[entry.experience, entry.notes].filter(Boolean).join(" — ")}
                  </div>
                )}
                {entry.createdAt?.toDate && (
                  <div className="text-[11px] text-neutral-500">{entry.createdAt.toDate().toLocaleString()}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`mailto:${entry.email}?subject=${encodeURIComponent("Flag football in your area")}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-bold text-neutral-200 hover:bg-white/10"
                >
                  <Mail className="h-3.5 w-3.5" /> Email
                </a>
                {confirmingId === entry.id ? (
                  <button
                    type="button"
                    onClick={() => void remove(entry.id)}
                    className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white"
                  >
                    Delete?
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete submission from ${entry.name}`}
                    onClick={() => setConfirmingId(entry.id)}
                    className="rounded-lg border border-red-500/30 p-1.5 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
