import { Check } from "lucide-react";
import { sortRosterByStatLeader } from "@/lib/playerNumberHelper";

export default function StatPlayerPicker({ label, roster, playerNumbers, counts, countLabel, selected, onSelect, teamLabel = "Team Defense" }: {
  label: string;
  roster: string[];
  playerNumbers: Record<string, string>;
  counts: Record<string, number>;
  countLabel: string;
  selected: string[];
  onSelect: (player: string) => void;
  teamLabel?: string;
}) {
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-40 sm:max-h-52 overflow-y-auto">
        {sortRosterByStatLeader(roster, playerNumbers, counts).map((player) => {
          const active = selected.includes(player);
          return (
            <button type="button" key={player} aria-label={player === "TEAM" ? teamLabel : player} aria-pressed={active}
              onClick={() => onSelect(player)}
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
    </div>
  );
}
