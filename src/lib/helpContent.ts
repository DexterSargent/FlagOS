export interface HelpTopic {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
}

interface HelpRoute {
  test: (pathname: string) => boolean;
  topic: HelpTopic;
}

const ROUTES: HelpRoute[] = [
  {
    test: (p) => /^\/teams\/[^/]+\/playbook/.test(p),
    topic: {
      id: "playbook",
      title: "Play Designer",
      summary: "Build offensive and defensive plays, then save them to your private playbook.",
      steps: [
        "Pick a formation card, or start from a blank field.",
        "Tap a receiver to select it. Tap empty field to deselect everyone.",
        "Open Routes to choose a route and set its depth in yards.",
        "Open Motion to add pre-snap motion for the selected player.",
        "Drag a route end-point to reshape it. Depth snaps to whole yards vertically and moves freely sideways.",
        "On defense, assign a zone to a defender. Moving the zone keeps its line attached.",
        "Name the play and save. Plays are private to your team.",
      ],
      tips: ["Hold a drag to see the route depth in yards.", "Use landscape on a phone for a wider field."],
    },
  },
  {
    test: (p) => /^\/teams\/[^/]+\/roster/.test(p),
    topic: {
      id: "roster",
      title: "Roster",
      summary: "Manage players, jersey numbers and positions.",
      steps: [
        "Add players with a name and jersey number.",
        "Edit or remove a player from their row.",
        "Jersey numbers appear in the play-by-play and box score.",
      ],
    },
  },
  {
    test: (p) => /^\/teams\/[^/]+\/schedule/.test(p),
    topic: {
      id: "team-schedule",
      title: "Team Schedule",
      summary: "See this team's games and open any match.",
      steps: ["Tap a game to view the box score or live play-by-play.", "Completed games show final scores."],
    },
  },
  {
    test: (p) => /^\/teams\/[^/]+\/stats/.test(p),
    topic: {
      id: "team-stats",
      title: "Team Stats",
      summary: "Season totals and leaders for this team.",
      steps: ["Switch between passing, rushing, receiving and defense.", "Stats update as play-by-play is saved."],
    },
  },
  {
    test: (p) => /^\/teams\/[^/]+\/matches\/[^/]+\/stat-keeper/.test(p),
    topic: {
      id: "stat-keeper",
      title: "Stat Keeper",
      summary: "Record a game's stats as it happens.",
      steps: ["Choose the play type.", "Pick the players involved.", "Save to update stats and the score."],
    },
  },
  {
    test: (p) => /^\/teams\/[^/]+/.test(p),
    topic: {
      id: "team-hub",
      title: "Team Hub",
      summary: "Your team's home: roster, schedule, stats and playbook.",
      steps: [
        "Use the cards or navigation to open Roster, Schedule, Stats and Playbook.",
        "Team admins can edit team branding and details.",
      ],
    },
  },
  {
    test: (p) => p === "/teams",
    topic: {
      id: "teams",
      title: "Teams",
      summary: "Browse every team in the league.",
      steps: ["Tap a team to open its hub.", "Use search to find a team quickly."],
    },
  },
  {
    test: (p) => /^\/matches\/[^/]+\/play-by-play/.test(p),
    topic: {
      id: "play-by-play",
      title: "Play-by-Play",
      summary: "Score a game one play at a time, or follow it live.",
      steps: [
        "Press Start Next Play, then choose Pass, Run or Penalty.",
        "Pick the outcome first: Complete, Incomplete, Interception, Sack, and so on.",
        "Choose the quarterback, receiver and flagger(s). Each step collapses into a one-line summary; tap it to change.",
        "Finish with the result: Touchdown, First Down, Next Down, Turnover or Safety.",
        "Use Undo to remove the last play. Viewers see the score and plays update live.",
      ],
      tips: ["Async mode lets you enter a finished game later.", "Penalties use a 3-step flow: who, which penalty, then yardage."],
    },
  },
  {
    test: (p) => /^\/matches\/[^/]+/.test(p),
    topic: {
      id: "match",
      title: "Match",
      summary: "Game details, score and box score.",
      steps: ["Review the score and team stats.", "Open Play-by-Play to follow or score the game."],
    },
  },
  {
    test: (p) => p === "/schedule",
    topic: {
      id: "schedule",
      title: "League Schedule",
      summary: "Every game this season.",
      steps: ["Tap a game for details.", "Completed games show final scores."],
    },
  },
  {
    test: (p) => p === "/stats",
    topic: {
      id: "stats",
      title: "League Stats",
      summary: "Standings and individual leaders.",
      steps: ["Switch categories to see leaders.", "Tap a player or team for more detail."],
    },
  },
  {
    test: (p) => p.startsWith("/league") || p === "/leagues",
    topic: {
      id: "league",
      title: "League",
      summary: "League home, teams, schedule and settings.",
      steps: ["Commissioners manage teams, schedule and rules.", "Use the header to move between league pages."],
    },
  },
  {
    test: (p) => p === "/admin",
    topic: {
      id: "admin",
      title: "Admin Portal",
      summary: "Platform-wide leagues and teams overview.",
      steps: ["Review leagues and teams.", "Use the actions on each row to manage records."],
    },
  },
  {
    test: (p) => p === "/profile",
    topic: {
      id: "profile",
      title: "Profile",
      summary: "Your account details and sign out.",
      steps: ["Update your details.", "Use Sign out when you are finished."],
    },
  },
  {
    test: (p) => p === "/join",
    topic: {
      id: "join",
      title: "Join a League or Team",
      summary: "Enter an invite code to join.",
      steps: ["Enter the code from your commissioner or coach.", "Sign in if prompted."],
    },
  },
];

const DEFAULT_TOPIC: HelpTopic = {
  id: "general",
  title: "Getting around",
  summary: "FlagOS runs flag football leagues: schedules, rosters, live scoring and playbooks.",
  steps: [
    "Use the demo to try everything with sample data. It resets whenever you want.",
    "Sign in to manage your own league or team.",
    "Switch light and dark mode with the theme toggle.",
  ],
};

export function getHelpTopic(pathname: string | null | undefined): HelpTopic {
  const path = pathname || "/";
  const match = ROUTES.find((r) => r.test(path));
  return match ? match.topic : DEFAULT_TOPIC;
}
