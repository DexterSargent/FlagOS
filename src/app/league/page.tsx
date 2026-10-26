"use client";
import FlagOSLoader from "@/components/FlagOSLoader";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLeague } from "@/lib/leagueContext";

export default function LeagueRedirectPage() {
  const router = useRouter();
  const { activeLeagueId } = useLeague();

  useEffect(() => {
    router.replace(`/league/${activeLeagueId || "default"}`);
  }, [activeLeagueId, router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
      <FlagOSLoader />
    </div>
  );
}
