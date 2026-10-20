import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { sortRosterByStatLeader } from "@/lib/playerNumberHelper";

export default function StatPlayerPicker({ label, roster, playerNumbers, counts, countLabel, selected, onSelect, teamLabel = "Team Defense", collapsible = false, expanded, onExpandedChange }: {
  label: string;
  roster: string[];
  playerNumbers: Record<string, string>;
  counts: Record<string, number>;
  countLabel: string;
  selected: string[];
  onSelect: (player: string) => void;
  teamLabel?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [locallyExpanded, setLocallyExpanded] = useState(true);
  const isExpanded = !collapsible || (expanded ?? locallyExpanded);
  const setExpanded = (value: boolean) => {
    setLocallyExpanded(value);
    onExpandedChange?.(value);
  };
  const selection = selected.map((player) => player === "TEAM" ? teamLabel :
    `${playerNumbers[player] ? `#${playerNumbers[player]} ` : ""}${player}`).join(" & ");
  return (
    <div role="group" aria-label={label} className="space-y-2 min-w-0">
      {!isExpanded ? (
        <button type="button" aria-label={`${label}: ${selection || "None selected"}. Click to change`}
          aria-expanded={false} onClick={() => setExpanded(true)}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-neutral-800 px-3 py-2 text-left">
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase text-neutral-400">{label}</span>
            <span className="block truncate text-xs font-bold text-white">{selection || "Optional - tap to add"}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-cyan-400" />
        </button>
      ) : (
      <>
      <div className="flex items-center justify-between gap-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-40 sm:max-h-52 overflow-y-auto">
        {sortRosterByStatLeader(roster, playerNumbers, counts).map((player) => {
          const active = selected.includes(player);
          return (
            <button type="button" key={player} aria-label={player === "TEAM" ? teamLabel : player} aria-pressed={active}
              onClick={() => { onSelect(player); if (collapsible) setExpanded(false); }}
              className={`flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${active ? "bg-white text-black border-white" : "bg-neutral-800 text-neutral-300 border-white/10 hover:border-white/30"}`}>
              <span className="flex min-w-0 items-center gap-1.5">
                {player !== "TEAM" && playerNumbers[player] && <span className="shrink-0 rounded bg-cyan-500/15 px-1 font-mono">#{playerNumbers[player]}</span>}
                <span className="truncate">{player === "TEAM" ? teamLabel : player}</span>
                {!!counts[player] && <span className="shrink-0 font-mono text-[10px]">({counts[player]} {countLabel})</span>}
              </span>
              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          );
        })}
      </div>
      {collapsible && <button type="button" aria-label={`Done selecting ${label}`} onClick={() => setExpanded(false)}
        className="min-h-9 px-2 text-xs font-bold text-cyan-400">Done</button>}
      </>
      )}
    </div>
  );
}
