"use client";

import { useEffect, useState } from "react";
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
    <div className="p-4 sm:p-6 space-y-5">
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {notice && <p role="status" className="text-emerald-300">{notice}</p>}
      {canEdit && (
        <fieldset disabled={saving} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.visibleToPlayers} onChange={(event) => change({ ...state, visibleToPlayers: event.target.checked })} />
              Allow rostered players to view depth charts
            </label>
            <button type="button" disabled={!dirty} onClick={save} className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-black disabled:opacity-40">{saving ? "Saving..." : "Save Depth Charts"}</button>
            {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
          </div>
          <form className="flex flex-wrap gap-3" onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !formationKey) return;
            const chart: DepthChart = { id: crypto.randomUUID(), name: name.trim(), formationKey, assignments: {} };
            change({ ...state, charts: [...state.charts, chart] });
            setActiveId(chart.id);
            setName("");
          }}>
            <input aria-label="Depth chart name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Depth chart name" className="rounded-lg bg-neutral-950 border border-white/20 p-2" />
            <select aria-label="Depth chart formation" value={formationKey} onChange={(event) => setFormationKey(event.target.value)} className="max-w-full rounded-lg bg-neutral-950 border border-white/20 p-2">
              {state.formations.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
            </select>
            <button type="submit" disabled={state.charts.length >= 20 || !state.formations.length} className="rounded-lg bg-white/10 px-4 py-2 disabled:opacity-40">Create Depth Chart</button>
          </form>
        </fieldset>
      )}
      {!state.charts.length && <p className="text-sm text-neutral-400">{canEdit ? "Create a depth chart from a playbook formation, or use a default formation when no playbook exists." : "No depth charts have been published yet."}</p>}
      {!!state.charts.length && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Depth charts">
          {state.charts.map((chart) => <button type="button" key={chart.id} aria-pressed={chart.id === activeId} onClick={() => setActiveId(chart.id)} className={`rounded-lg border px-3 py-2 text-sm ${chart.id === activeId ? "border-cyan-400 text-cyan-300" : "border-white/10"}`}>{chart.name}</button>)}
        </div>
      )}
      {active && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="font-bold">{active.name} - {formation?.name || "Removed formation"}</h4>
            {canEdit && <button type="button" disabled={saving} onClick={() => {
              change({ ...state, charts: state.charts.filter((chart) => chart.id !== active.id) });
              setActiveId(state.charts.find((chart) => chart.id !== active.id)?.id || "");
            }} className="text-sm text-red-300">Delete Chart</button>}
          </div>
          {!formation && <p role="alert" className="text-amber-300">This formation no longer exists in the playbook. Existing assignments are retained; create a chart for a current formation.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(formation?.slots || Object.keys(active.assignments).map((id) => ({ id, label: id }))).map((slot) => {
              const assigned = active.assignments[slot.id] || [];
              return <div key={slot.id} className="flex flex-col justify-start bg-neutral-950/80 border border-white/10 rounded-2xl p-4 space-y-3">
                <h5 className="font-bold text-cyan-300">{slot.label}</h5>
                <ol className="space-y-2">
                  {assigned.map((id, index) => {
                    const player = players.find((item) => item.id === id);
                    return <li key={id} className="rounded-lg bg-white/5 p-2 text-xs">
                      <span>{index + 1}. {player ? `#${player.number || "-"} ${player.playerName}` : "Player no longer on roster"}</span>
                      {showStats && player && <span className="block text-neutral-400">{playerStats[player.playerName]?.gamesPlayed || 0} GP / {playerStats[player.playerName]?.totalTDs || 0} TD</span>}
                      {canEdit && <div className="flex gap-2 mt-2">
                        <button type="button" disabled={saving || index === 0} aria-label={`Move ${player?.playerName || id} up at ${slot.label}`} onClick={() => {
                          const next = [...assigned]; [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: next } });
                        }} className="disabled:opacity-30">Up</button>
                        <button type="button" disabled={saving || index === assigned.length - 1} aria-label={`Move ${player?.playerName || id} down at ${slot.label}`} onClick={() => {
                          const next = [...assigned]; [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: next } });
                        }} className="disabled:opacity-30">Down</button>
                        <button type="button" disabled={saving} aria-label={`Remove ${player?.playerName || id} from ${slot.label}`} onClick={() => updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: assigned.filter((item) => item !== id) } })}>Remove</button>
                      </div>}
                    </li>;
                  })}
                </ol>
                {canEdit && <select aria-label={`Add player to ${slot.label}`} value="" disabled={saving} onChange={(event) => {
                  if (event.target.value) updateChart({ ...active, assignments: { ...active.assignments, [slot.id]: [...assigned, event.target.value] } });
                }} className="w-full bg-neutral-900 border border-white/20 rounded-lg p-2 text-xs">
                  <option value="">Add player...</option>
                  {players.filter((player) => !assigned.includes(player.id)).map((player) => <option key={player.id} value={player.id}>{player.playerName} ({getPlayerPositions(player).join(" / ")})</option>)}
                </select>}
                {!assigned.length && <p className="text-xs text-neutral-500">No players assigned</p>}
              </div>;
            })}
          </div>
        </>
      )}
    </div>
  );
}
