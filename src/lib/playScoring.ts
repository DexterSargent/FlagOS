/** Plays record the snapping team in `possessionTeamId`; pick-6 and safety points belong to the other team. */
export function getPlayScoreDelta(
  play: {
    possessionTeamId?: string | null;
    isTouchdown?: boolean;
    isPick6?: boolean;
    isSafety?: boolean;
    result?: string;
    points?: number | null;
    pointsScored?: number | null;
  },
  homeTeamId: string,
): { home: number; away: number } {
  const offenseIsHome = play.possessionTeamId === homeTeamId;
  const isPick6 = !!play.isPick6 || play.result === "Pick 6";
  const isSafety = !!play.isSafety || play.result === "Safety";
  const recorded = Number(play.pointsScored ?? play.points ?? 0) || 0;
  const points = recorded > 0 ? recorded : isSafety ? 2 : (play.isTouchdown || isPick6) ? 6 : 0;
  if (points <= 0) return { home: 0, away: 0 };
  const defenseScored = isPick6 || isSafety || play.result === "Defensive Conversion";
  const homeScored = defenseScored ? !offenseIsHome : offenseIsHome;
  return homeScored ? { home: points, away: 0 } : { home: 0, away: points };
}
