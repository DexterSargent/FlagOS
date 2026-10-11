"use client";

import { use } from "react";
import AsyncPlayByPlayManager from "@/components/AsyncPlayByPlayManager";

export default function TeamAsyncStatKeeperPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const unwrappedParams = use(params);
  const teamId = unwrappedParams.id;
  const matchId = unwrappedParams.matchId;

  return (
    <AsyncPlayByPlayManager
      matchId={matchId}
      backUrl={`/teams/${teamId}/schedule`}
    />
  );
}
