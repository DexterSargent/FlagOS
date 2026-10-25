"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Layers, LockKeyhole, Plus, Save, Shield, Trash2, Users, X, Zap } from "lucide-react";
import { createSecureRecord, requestPrivateData } from "@/lib/secureWrites";
import { getDepthFormations, getPlayerPositions, type DepthChart, type DepthChartResponse, type DepthChartState, type DepthFormation } from "@/lib/depthChart";
import type { Playbook } from "@/lib/playbookTypes";

interface DepthPlayer {
  id: string;
  playerName: string;
  number?: string;
  positions?: string[];
  position?: string;
}

export default function TeamDepthCharts({ teamId, players, canManage, signedIn, isDemo, showStats, playerStats, onFormations }: {
  teamId: string;
  players: DepthPlayer[];
  canManage: boolean;
  signedIn: boolean;
  isDemo: boolean;
  showStats: boolean;
  playerStats: Record<string, { gamesPlayed?: number; totalTDs?: number }>;
  onFormations: (formations: DepthFormation[]) => void;
}) {
  const [state, setState] = useState<DepthChartResponse>({ charts: [], visibleToPlayers: false, formations: [], canEdit: false });
  const [activeId, setActiveId] = useState("");
  const [name, setName] = useState("");
  const [formationKey, setFormationKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        let loaded: DepthChartResponse;
        if (isDemo) {
          const books: Playbook[] = JSON.parse(localStorage.getItem(`flagos_playbooks_${teamId}`) || "[]");
          const stored: DepthChartState = JSON.parse(sessionStorage.getItem(`flagos_depth_charts_${teamId}`) || '{"charts":[],"visibleToPlayers":false}');
          loaded = { ...stored, formations: getDepthFormations(books), canEdit: canManage };
        } else if (signedIn) {
          loaded = await requestPrivateData<DepthChartResponse>("depth_chart", { teamId });
        } else {
          loaded = { charts: [], visibleToPlayers: false, formations: [], canEdit: false };
        }
        if (cancelled) return;
        setState(loaded);
        setActiveId(loaded.charts[0]?.id || "");
        setFormationKey(loaded.formations[0]?.key || "");
        setDirty(false);
        onFormations(loaded.canEdit ? loaded.formations : []);
      } catch (error) {
        console.error("Unable to load depth charts:", error);
        if (!cancelled) setError(error instanceof Error ? error.message : "Unable to load depth charts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [teamId, signedIn, isDemo, canManage, onFormations, reload]);

  const change = (next: DepthChartResponse) => {
    setState(next);
    setDirty(true);
    setNotice("");
  };
  const updateChart = (chart: DepthChart) => change({ ...state, charts: state.charts.map((current) => current.id === chart.id ? chart : current) });
  const active = state.charts.find((chart) => chart.id === activeId);
  const formation = state.formations.find((item) => item.key === active?.formationKey);
  const canEdit = canManage && state.canEdit;
  const slots = formation?.slots || Object.keys(active?.assignments || {}).map((id) => ({ id, label: id }));
  const filledSlots = slots.filter((slot) => active?.assignments[slot.id]?.length).length;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { charts: state.charts, visibleToPlayers: state.visibleToPlayers };
      if (isDemo) sessionStorage.setItem(`flagos_depth_charts_${teamId}`, JSON.stringify(payload));
      else await createSecureRecord("depth_chart", { teamId, ...payload });
      setDirty(false);
      setNotice("Depth charts saved.");
    } catch (error) {
      console.error("Unable to save depth charts:", error);
      setError(error instanceof Error ? error.message : "Unable to save depth charts.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-neutral-400">Loading depth charts...</p>;
  if (error && !state.formations.length) return <div className="p-6"><p role="alert">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>Retry depth charts</button></div>;
  if (!canEdit && !state.visibleToPlayers) return <p className="p-6 text-neutral-400">Depth charts are private. Coaches can enable player access.</p>;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-neutral-900 dark:text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-700 dark:text-cyan-300">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Depth charts</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Your lineup. Every position. Next player up.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${state.visibleToPlayers ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400"}`}>
          {state.visibleToPlayers ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
          {state.visibleToPlayers ? "Visible to players" : "Coaches only"}
        </span>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {canEdit && (
        <fieldset disabled={saving} className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.025]">
          <legend className="sr-only">Manage depth charts</legend>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 p-4 dark:border-white/10">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={state.visibleToPlayers} onChange={(event) => change({ ...state, visibleToPlayers: event.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[var(--league-primary)]" />
              <span>
                <span className="block font-semibold">Allow rostered players to view depth charts</span>
                <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">Players can view lineups, but only coaches can make changes.</span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {dirty && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Unsaved changes</span>}
              <button type="button" disabled={!dirty} onClick={save} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">
                <Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving..." : "Save Depth Charts"}
              </button>
            </div>
          </div>
          <form className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end" onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !formationKey) return;
            const chart: DepthChart = { id: crypto.randomUUID(), name: name.trim(), formationKey, assignments: {} };
            change({ ...state, charts: [...state.charts, chart] });
            setActiveId(chart.id);
            setName("");
          }}>
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <span>Chart name</span>
              <input aria-label="Depth chart name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Starting lineup" className="block min-h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-white/10 dark:bg-neutral-950 dark:text-white" />
            </label>
            <label className="min-w-0 space-y-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              <span>Formation</span>
              <select aria-label="Depth chart formation" value={formationKey} onChange={(event) => setFormationKey(event.target.value)} className="block min-h-10 w-full min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-white/10 dark:bg-neutral-950 dark:text-white">
                {state.formations.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
              </select>
            </label>
            <button type="submit" disabled={state.charts.length >= 20 || !state.formations.length} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 xl:col-span-1 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
              <Plus className="h-4 w-4" aria-hidden="true" />Create Depth Chart
            </button>
          </form>
        </fieldset>
      )}
      {!state.charts.length && (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center dark:border-white/15 dark:bg-white/[0.025]">
          <Users className="mx-auto mb-3 h-8 w-8 text-neutral-400" aria-hidden="true" />
          <p className="font-bold">Build your next lineup</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">{canEdit ? "Create a depth chart from a playbook formation, or use a default formation when no playbook exists." : "No depth charts have been published yet."}</p>
        </div>
      )}
      {!!state.charts.length && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Depth charts">
          {state.charts.map((chart) => <button type="button" key={chart.id} aria-pressed={chart.id === activeId} onClick={() => setActiveId(chart.id)} className={`min-h-10 max-w-full break-words rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${chart.id === activeId ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 shadow-sm dark:text-cyan-300" : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5"}`}>{chart.name}</button>)}
        </div>
      )}
      {active && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="break-words text-xl font-black tracking-tight">{active.name}</h4>
                {formation && <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${formation.side === "offense" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "bg-purple-500/10 text-purple-700 dark:text-purple-300"}`}>
                  {formation.side === "offense" ? <Zap className="h-3 w-3" aria-hidden="true" /> : <Shield className="h-3 w-3" aria-hidden="true" />}{formation.side}
                </span>}
              </div>
              <p className="break-words text-xs text-neutral-500 dark:text-neutral-400">{formation?.name || "Removed formation"} · {filledSlots} / {slots.length} positions filled</p>
            </div>
            {canEdit && <button type="button" disabled={saving} onClick={() => {
              change({ ...state, charts: state.charts.filter((chart) => chart.id !== active.id) });
              setActiveId(state.charts.find((chart) => chart.id !== active.id)?.id || "");
            }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-40 dark:text-red-300"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete Chart</button>}
          </div>
          {!formation && <p role="alert" className="text-amber-300">This formation no longer exists in the playbook. Existing assignments are retained; create a chart for a current formation.</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {slots.map((slot) => {
              const assigned = active.assignments[slot.id] || [];
              return <section key={slot.id} aria-label={`${slot.label} depth chart`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-950/60">
                <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <h5 className="min-w-0 break-words text-sm font-bold">{slot.label}</h5>
                  <span className="shrink-0 rounded-full bg-neutral-200/60 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-white/10 dark:text-neutral-400">{assigned.length} {assigned.length === 1 ? "player" : "players"}</span>
                </div>
                <ol className="space-y-2 p-3" aria-label={`${slot.label} player order`}>
                  {assigned.map((id, index) => {
                    const player = players.find((item) => item.id === id);
                    return <li key={id} className={`rounded-xl border p-3 ${index === 0 ? "border-cyan-500/25 bg-cyan-500/[0.07]" : "border-transparent bg-neutral-50 dark:bg-white/[0.03]"}`}>
                      <div className="flex items-start gap-2.5">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${index === 0 ? "bg-cyan-600 text-white" : "bg-neutral-200 text-neutral-600 dark:bg-white/10 dark:text-neutral-400"}`} aria-label={`Depth ${index + 1}`}>{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{index === 0 ? "Starter" : "Backup"}{player ? ` · #${player.number || "-"}` : ""}</span>
                          <span className="block break-words text-sm font-semibold">{player?.playerName || "Player no longer on roster"}</span>
                          {showStats && player && <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{playerStats[player.playerName]?.gamesPlayed || 0} GP / {playerStats[player.playerName]?.totalTDs || 0} TD</span>}
                        </div>
                      </div>
                      {canEdit && <div className="mt-2 flex gap-1 border-t border-neutral-200/60 pt-2 dark:border-white/5">
                        <button type="button" disabled={saving || index === 0} aria-label={`Move ${player?.playerName || id} up at ${slot.label}`} onClick={() => {
                          const next = [...assigned]; [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: next } });
                        }} title="Move up" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-cyan-500/10 hover:text-cyan-700 disabled:opacity-30 dark:text-neutral-400 dark:hover:text-cyan-300"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" disabled={saving || index === assigned.length - 1} aria-label={`Move ${player?.playerName || id} down at ${slot.label}`} onClick={() => {
                          const next = [...assigned]; [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: next } });
                        }} title="Move down" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-cyan-500/10 hover:text-cyan-700 disabled:opacity-30 dark:text-neutral-400 dark:hover:text-cyan-300"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" disabled={saving} aria-label={`Remove ${player?.playerName || id} from ${slot.label}`} title="Remove player" onClick={() => updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: assigned.filter((item) => item !== id) } })} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 dark:text-neutral-400 dark:hover:text-red-300"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </div>}
                    </li>;
                  })}
                </ol>
                {!assigned.length && <div className="mx-3 mb-3 rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center dark:border-white/10">
                  <Users className="mx-auto mb-2 h-5 w-5 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No players assigned</p>
                </div>}
                <div className="mt-auto px-3 pb-3">
                {canEdit && <select aria-label={`Add player to ${slot.label}`} value="" disabled={saving} onChange={(event) => {
                  if (event.target.value) updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: [...assigned, event.target.value] } });
                }} className="min-h-10 w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-xs text-neutral-700 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300">
                  <option value="">Add player...</option>
                  {players.filter((player) => !assigned.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.playerName} ({getPlayerPositions(player).join(" / ")})</option>)}
                </select>}
                </div>
              </section>;
            })}
          </div>
        </>
      )}
    </div>
  );
}
