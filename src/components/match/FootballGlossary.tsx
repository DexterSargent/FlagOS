"use client";

import { useEffect } from "react";
import { BookOpen, X } from "lucide-react";

export type GlossaryKey =
  | "down" | "possession" | "timeout" | "td" | "pat1" | "pat2" | "safety" | "turnoverOnDowns"
  | "cAtt" | "cmpPct" | "passTd" | "intThrown" | "firstDown" | "rec" | "rush" | "patPass" | "patRec" | "patRush" | "totalTd"
  | "flagPull" | "sack" | "pbu" | "ffl" | "defInt" | "defTd" | "saf" | "pick6";

export const GLOSSARY: Record<GlossaryKey, { term: string; definition: string }> = {
  down: { term: "Downs", definition: "The offense gets a set number of tries (downs) to cross the next line to gain. Reach it for a new set of downs; fail on the last down and the other team takes over." },
  possession: { term: "Possession", definition: "The team with the ball is on offense. The football icon on the scoreboard marks who has it." },
  timeout: { term: "Timeouts", definition: "Each team gets a few clock stoppages per game. The dots and the count under each score show how many are left." },
  td: { term: "Touchdown (TD)", definition: "Carrying or catching the ball in the end zone. Worth 6 points." },
  pat1: { term: "1-point try (PAT)", definition: "After a touchdown the scoring team runs one play from close to the end zone. Scoring from the short distance is worth 1 point." },
  pat2: { term: "2-point try (PAT)", definition: "The same after-touchdown play from farther back. Harder, so it is worth 2 points. Flag football has no kicks or field goals." },
  safety: { term: "Safety", definition: "The ball carrier's flag is pulled in their own end zone. The defense scores 2 points." },
  turnoverOnDowns: { term: "Turnover on downs", definition: "The offense used every down without gaining a new set, so the other team takes over. No points are scored." },
  cAtt: { term: "C/ATT", definition: "Completions / attempts: passes caught out of passes thrown." },
  cmpPct: { term: "CMP%", definition: "Completion percentage: completions divided by attempts." },
  passTd: { term: "PASS TD", definition: "Touchdown passes thrown." },
  intThrown: { term: "INT (thrown)", definition: "Passes thrown that the defense intercepted." },
  firstDown: { term: "1D", definition: "First downs: plays that earned a new set of downs, including touchdowns." },
  rec: { term: "REC", definition: "Receptions: passes caught." },
  rush: { term: "RUSH", definition: "Rushing attempts: times the player ran with the ball." },
  patPass: { term: "PAT PASS", definition: "Successful point-after-touchdown tries thrown." },
  patRec: { term: "PAT REC", definition: "Successful point-after-touchdown tries caught." },
  patRush: { term: "PAT RUSH", definition: "Successful point-after-touchdown tries run in." },
  totalTd: { term: "TOT TD", definition: "Total touchdowns scored by the player (receiving, rushing and defensive). Passing TDs are counted separately." },
  flagPull: { term: "FLAGS", definition: "Flag pulls: the flag-football version of a tackle. Pulling the ball carrier's flag ends the play." },
  sack: { term: "SACKS", definition: "Pulling the quarterback's flag behind the line before they throw." },
  pbu: { term: "PBU", definition: "Pass breakup: knocking a pass away so it falls incomplete." },
  ffl: { term: "FFL", definition: "Flag pull for a loss: pulling a ball carrier's flag behind the line of scrimmage." },
  defInt: { term: "INT", definition: "Interceptions: catching a pass thrown by the other team." },
  defTd: { term: "DEF TD", definition: "Defensive touchdowns, usually an interception returned to the end zone (a pick 6)." },
  saf: { term: "SAF", definition: "Safeties forced: pulling a ball carrier's flag in their own end zone for 2 points." },
  pick6: { term: "Pick 6", definition: "An interception returned for a touchdown." },
};

const NEWCOMER_KEYS: GlossaryKey[] = ["down", "possession", "td", "pat1", "pat2", "safety", "turnoverOnDowns", "timeout", "flagPull", "sack", "pbu", "pick6"];

export function GlossaryDefinitionBar({ termKey, onClose }: { termKey: GlossaryKey | null; onClose: () => void }) {
  if (!termKey) return null;
  const entry = GLOSSARY[termKey];
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-50">
      <p className="flex-1 leading-relaxed"><span className="font-black text-cyan-300">{entry.term}:</span> {entry.definition}</p>
      <button type="button" onClick={onClose} aria-label="Close explanation" className="shrink-0 rounded-md p-1 text-cyan-200 hover:bg-white/10">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function FootballGlossaryModal({ open, onClose, highlight }: { open: boolean; onClose: () => void; highlight?: GlossaryKey | null }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const statKeys = (Object.keys(GLOSSARY) as GlossaryKey[]).filter((k) => !NEWCOMER_KEYS.includes(k));
  const renderEntry = (key: GlossaryKey) => (
    <div key={key} className={`rounded-xl px-3 py-2 ${highlight === key ? "bg-cyan-500/15 ring-1 ring-cyan-400/50" : ""}`}>
      <dt className="text-sm font-black text-white">{GLOSSARY[key].term}</dt>
      <dd className="text-xs leading-relaxed text-neutral-300">{GLOSSARY[key].definition}</dd>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Flag football terms"
        data-tour="viewer-glossary"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-neutral-900 p-4 text-white shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-black"><BookOpen className="h-4 w-4 text-cyan-300" /> New to flag football?</h2>
          <button type="button" onClick={onClose} aria-label="Close terms" className="rounded-lg p-2 text-neutral-300 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-neutral-400">Flag football plays like regular football, but there is no tackling and no kicking. Defenders pull a flag from the ball carrier&apos;s belt to end the play.</p>
        <dl className="space-y-1">{NEWCOMER_KEYS.map(renderEntry)}</dl>
        <h3 className="mb-1 mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">Box score columns</h3>
        <dl className="space-y-1">{statKeys.map(renderEntry)}</dl>
      </div>
    </div>
  );
}
