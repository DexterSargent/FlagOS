import type { ToolWalkthrough } from "@/lib/walkthroughData";
import {
  PLAY_DESIGNER_WALKTHROUGH,
  PLAYBOOK_STUDIO_WALKTHROUGH,
  TEAM_ROSTER_WALKTHROUGH,
  TEAM_HUB_WALKTHROUGH,
  TEAM_SCHEDULE_WALKTHROUGH,
  TEAM_STATS_WALKTHROUGH,
  ASYNC_STAT_KEEPER_WALKTHROUGH,
} from "@/lib/walkthroughData";
import {
  COMMISSIONER_DASHBOARD_WALKTHROUGH,
  STAT_KEEPER_WALKTHROUGH,
  SCHEDULE_WALKTHROUGH,
  STATS_WALKTHROUGH,
  TEAMS_DIRECTORY_WALKTHROUGH,
  MATCH_BOX_SCORE_WALKTHROUGH,
} from "./league";
import {
  LANDING_WALKTHROUGH,
  PRICING_WALKTHROUGH,
  MY_STORY_WALKTHROUGH,
  LOGIN_WALKTHROUGH,
  LEAGUE_DIRECTORY_WALKTHROUGH,
  JOIN_LEAGUE_WALKTHROUGH,
  ACCOUNT_WALKTHROUGH,
  PROFILE_WALKTHROUGH,
  FREE_AGENTS_WALKTHROUGH,
} from "./public";
import { ADMIN_OVERVIEW_GUIDE, ADMIN_SANDBOX_GUIDE } from "./admin";

export const ALL_WALKTHROUGHS: Record<string, ToolWalkthrough> = Object.fromEntries(
  [
    PLAY_DESIGNER_WALKTHROUGH,
    PLAYBOOK_STUDIO_WALKTHROUGH,
    TEAM_ROSTER_WALKTHROUGH,
    TEAM_HUB_WALKTHROUGH,
    TEAM_SCHEDULE_WALKTHROUGH,
    TEAM_STATS_WALKTHROUGH,
    ASYNC_STAT_KEEPER_WALKTHROUGH,
    COMMISSIONER_DASHBOARD_WALKTHROUGH,
    STAT_KEEPER_WALKTHROUGH,
    SCHEDULE_WALKTHROUGH,
    STATS_WALKTHROUGH,
    TEAMS_DIRECTORY_WALKTHROUGH,
    MATCH_BOX_SCORE_WALKTHROUGH,
    LANDING_WALKTHROUGH,
    PRICING_WALKTHROUGH,
    MY_STORY_WALKTHROUGH,
    LOGIN_WALKTHROUGH,
    LEAGUE_DIRECTORY_WALKTHROUGH,
    JOIN_LEAGUE_WALKTHROUGH,
    ACCOUNT_WALKTHROUGH,
    PROFILE_WALKTHROUGH,
    FREE_AGENTS_WALKTHROUGH,
    ADMIN_OVERVIEW_GUIDE,
    ADMIN_SANDBOX_GUIDE,
  ].map((w) => [w.id, w])
);

const ROUTES: Array<[RegExp, ToolWalkthrough]> = [
  [/^\/$/, LANDING_WALKTHROUGH],
  [/^\/pricing\/?$/, PRICING_WALKTHROUGH],
  [/^\/my-story\/?$/, MY_STORY_WALKTHROUGH],
  [/^\/login\/?$/, LOGIN_WALKTHROUGH],
  [/^\/leagues\/?$/, LEAGUE_DIRECTORY_WALKTHROUGH],
  [/^\/free-agents\/?$/, FREE_AGENTS_WALKTHROUGH],
  [/^\/join(\/|$)/, JOIN_LEAGUE_WALKTHROUGH],
  [/^\/account\/?$/, ACCOUNT_WALKTHROUGH],
  [/^\/profile\/?$/, PROFILE_WALKTHROUGH],
  [/^\/admin\/sandbox\/?$/, ADMIN_SANDBOX_GUIDE],
  [/^\/admin\/?$/, ADMIN_OVERVIEW_GUIDE],
  [/^\/teams\/[^/]+\/playbook/, PLAY_DESIGNER_WALKTHROUGH],
  [/^\/teams\/[^/]+\/matches\/[^/]+\/stat-keeper/, ASYNC_STAT_KEEPER_WALKTHROUGH],
  [/^\/teams\/[^/]+\/roster/, TEAM_ROSTER_WALKTHROUGH],
  [/^\/teams\/[^/]+\/schedule/, TEAM_SCHEDULE_WALKTHROUGH],
  [/^\/teams\/[^/]+\/stats/, TEAM_STATS_WALKTHROUGH],
  [/^\/teams\/[^/]+\/?$/, TEAM_HUB_WALKTHROUGH],
  [/^\/teams\/?$/, TEAMS_DIRECTORY_WALKTHROUGH],
  [/^\/matches\/[^/]+\/play-by-play/, STAT_KEEPER_WALKTHROUGH],
  [/^\/matches\/[^/]+\/?$/, MATCH_BOX_SCORE_WALKTHROUGH],
  [/^\/schedule\/?$/, SCHEDULE_WALKTHROUGH],
  [/^\/stats\/?$/, STATS_WALKTHROUGH],
  [/^\/league(\/|$)/, COMMISSIONER_DASHBOARD_WALKTHROUGH],
];

/** Default guide for a route. Pages register the role- and state-specific guide at runtime via usePageGuide. */
export function getToolWalkthroughForRoute(pathname: string | null | undefined): ToolWalkthrough | null {
  if (pathname == null) return null;
  const path = pathname === "" ? "/" : pathname;
  return ROUTES.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}