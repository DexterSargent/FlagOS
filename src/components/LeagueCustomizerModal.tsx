"use client";

import dynamic from "next/dynamic";
import { useLeague } from "@/lib/leagueContext";

const LeagueCustomizerContent = dynamic(() => import("./LeagueCustomizerContent"), { ssr: false });

export default function LeagueCustomizerModal() {
  const { isCustomizerOpen } = useLeague();
  return isCustomizerOpen ? <LeagueCustomizerContent /> : null;
}
