"use client";

import { useMemo } from "react";
import { Crown, History } from "lucide-react";
import {
  buildCareerSummaries,
  PLAYER_STAT_KEYS,
  type LeagueSeason,
  type PlayerStatKey,
  type PlayerStatLine,
  type SeasonSnapshot,
} from "@/lib/leagueSeasons";

const COLUMNS: Array<{ key: PlayerStatKey; label: string; title: string }> = [
  { key: "gamesPlayed", label: "GP", title: "Games played" },
  { key: "totalTDs", label: "TD", title: "Total touchdowns" },
  { key: "passTD", label: "Pass TD", title: "Passing touchdowns" },
  { key: "receptions", label: "Rec", title: "Receptions" },
  { key: "rushTD", label: "Rush TD", title: "Rushing touchdowns" },
  { key: "flagPulls", label: "Flags", title: "Flag pulls" },
  { key: "int", label: "INT", title: "Interceptions" },
];

export default function PlayerCareerCard({
  player,
  seasons,
  currentSeasonId,
  snapshots,
  liveStats,
  loading,
  error,
}: {
  player: { id: string; name: string; teamId: string; teamName: string };
  seasons: LeagueSeason[];
  currentSeasonId: string;
  snapshots: SeasonSnapshot[];
  liveStats: Partial<Record<PlayerStatKey, number>>;
  loading: boolean;
  error: string;
}) {
  const career = useMemo(() => {
    const liveLine = {
      playerId: player.id,
      name: player.name,
      number: "",
      teamId: player.teamId,
      teamName: player.teamName,
      teamShortcode: "",
    } as PlayerStatLine;
    PLAYER_STAT_KEYS.forEach((key) => { liveLine[key] = liveStats[key] || 0; });
    const current = seasons.find((season) => season.id === currentSeasonId);
    const summaries = buildCareerSummaries([
      ...snapshots.map((snapshot) => ({
        seasonId: snapshot.seasonId,
        title: snapshot.title,
        number: snapshot.number,
        isCurrent: false,
        championTeamId: snapshot.championTeamId,
        playerStats: snapshot.playerStats.filter((line) =>
          line.playerId ? line.playerId === player.id : line.name.trim().toLowerCase() === player.name.trim().toLowerCase()),
      })),
      {
        seasonId: currentSeasonId,
        title: current?.title || "Current season",
        number: current?.number || snapshots.length + 1,
        isCurrent: true,
        playerStats: [liveLine],
      },
    ]);
    return summaries.find((summary) => summary.playerId === player.id) || summaries[0] || null;
  }, [player.id, player.name, player.teamId, player.teamName, seasons, currentSeasonId, snapshots, liveStats]);

  const rows = career ? [...career.seasons].sort((a, b) => b.number - a.number) : [];

  return (
    <section data-tour="profile-career" className="bg-[#0B0F19] border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-5 sm:p-6 flex flex-wrap items-center gap-3 border-b border-white/10">
        <History className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-white">Career</h3>
        {career && (
          <span className="text-xs text-neutral-400">
            {career.seasons.length} {career.seasons.length === 1 ? "season" : "seasons"}
            {career.championships > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-bold text-amber-400">
                <Crown className="w-3.5 h-3.5" /> {career.championships}x champion
              </span>
            )}
          </span>
        )}
      </div>
      {error && <p role="alert" className="px-5 sm:px-6 pt-4 text-sm text-red-300">{error}</p>}
      {loading ? (
        <p className="p-6 text-sm text-neutral-400">Loading past seasons...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-black/40 text-[11px] uppercase tracking-wider text-neutral-400">
                <th className="text-left py-3 px-5">Season</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="py-3 px-2 text-center" title={column.title}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.seasonId} className="border-t border-white/5 text-neutral-200">
                  <td className="py-2.5 px-5">
                    <span className="font-semibold text-white">{entry.seasonTitle}</span>
                    <span className="block text-xs text-neutral-400">
                      {entry.line.teamName}{entry.isCurrent ? " - current" : ""}
                      {entry.championTeamId && entry.championTeamId === entry.line.teamId && (
                        <Crown className="w-3 h-3 inline ml-1 text-amber-400" aria-label="Champion" />
                      )}
                    </span>
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="py-2.5 px-2 text-center tabular-nums">{entry.line[column.key] || 0}</td>
                  ))}
                </tr>
              ))}
              {career && (
                <tr className="border-t border-white/15 bg-white/[0.04] font-black text-white">
                  <td className="py-3 px-5 uppercase text-xs tracking-wider">Career total</td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="py-3 px-2 text-center tabular-nums">{career.totals[column.key]}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
