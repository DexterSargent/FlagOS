"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLeague } from "@/lib/leagueContext";

export default function LeagueRedirectPage() {
  const router = useRouter();
  const { activeLeagueId } = useLeague();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("league");
    router.replace(`/league/${requested || activeLeagueId || "default"}`);
  }, [activeLeagueId, router]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center font-sans">
      <FlagOSLoader />
    </div>
  );
}
