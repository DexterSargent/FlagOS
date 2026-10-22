"use client";

import { FlagOSText } from "@/components/FlagOSText";
import { useTeamColors } from "@/lib/teamColorContext";
import { useLeague } from "@/lib/leagueContext";
import { useEmbedState } from "@/lib/embedState";

/** Footer shared by team portal pages; `section` replaces the default portal label. */
export default function TeamPortalFooter({ section }: { section?: string }) {
  const { team, isStandalone } = useTeamColors();
  const { settings } = useLeague();
  const { embedQuery } = useEmbedState();
  if (embedQuery) return null;

  const teamName = team?.name || "Team";
  const label = section || team?.tagline || (isStandalone || team?.subscription?.status === "active" ? "Independent Team Portal" : "Official Team Portal");

  return (
    <footer className="relative z-10 w-full border-t border-white/10 bg-black/80 backdrop-blur-md py-6 sm:py-8 px-6 text-xs text-neutral-400 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <span className="font-bold text-white uppercase whitespace-nowrap">{teamName}</span>
          <span aria-hidden="true">•</span>
          <span className="whitespace-nowrap">{label}</span>
          <span aria-hidden="true">•</span>
          <span className="whitespace-nowrap">{settings.seasonTitle || "2026"}</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 font-medium">
          <span>Powered by</span>
          <FlagOSText />
        </div>
      </div>
    </footer>
  );
}
