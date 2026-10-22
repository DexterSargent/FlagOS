export interface WalkthroughStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  category?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  tip?: string;
  actionHint?: string;
}

export interface OverlayCallout {
  id: string;
  targetSelector: string;
  label: string;
  description: string;
  shortcutOrRole?: string;
  category: "primary" | "tactics" | "gameplay" | "settings" | "export";
  positionPreference?: "top" | "bottom" | "left" | "right";
}

export interface ToolWalkthrough {
  id: string;
  toolName: string;
  subtitle: string;
  quickSummary: string;
  steps: WalkthroughStep[];
  callouts: OverlayCallout[];
  proTips: string[];
}

export const PLAY_DESIGNER_WALKTHROUGH: ToolWalkthrough = {
  id: "play-designer",
  toolName: "Play Designer & Tactical Board",
  subtitle: "Design routes, scheme coverage zones, and test plays against real opponent schemes",
  quickSummary: "Build custom offensive or defensive plays. Drag players or route points directly on the field, apply route tree presets, add pre-snap motion, draw custom defensive coverage zones, and simulate plays live.",
  steps: [
    {
      id: "field",
      targetSelector: '[data-tour="play-field"]',
      title: "Interactive Field & Dragging",
      description: "This is your tactical canvas. Click or tap any player circle to select them. Drag players to reposition their pre-snap alignment, or drag route endpoints to reshape their path.",
      category: "Canvas",
      placement: "bottom",
      actionHint: "Tap any player circle or waypoint to select it. Drag to adjust position or yard depth.",
      tip: "Depth automatically snaps to whole yards vertically while giving you smooth horizontal freedom."
    },
    {
      id: "player-selection",
      targetSelector: '[data-tour="player-pills"]',
      title: "Active Player Quick-Switch",
      description: "Quickly switch between receivers or defenders using these pills. The highlighted player is the one whose route, motion, or coverage assignment is currently being customized.",
      category: "Personnel",
      placement: "bottom",
      tip: "A small dot indicates placed waypoints; a pencil icon shows custom coach notes for that position."
    },
    {
      id: "route-catalog",
      targetSelector: '[data-tour="route-drawer-toggle"]',
      title: "Route Tree & Presets",
      description: "Browse 40+ standard route tree presets (Slant, Out, Post, Go, Dig, Wheel, Corner, Drag, etc.) or clear routes. Choose a preset to instantly draw it with proper yardage cuts.",
      category: "Offense",
      placement: "left",
      actionHint: "Open the catalog to pick from Slants, Posts, Outs, Screens, and Combos.",
      tip: "You can modify any preset route by dragging its nodes on the field after applying it."
    },
    {
      id: "motion-menu",
      targetSelector: '[data-tour="motion-menu-toggle"]',
      title: "Pre-Snap Motion",
      description: "Simulate offensive deception before the snap! Add Jet Motion, Orbit Motion, Backfield Shifts, or Return Motion. Motion players will execute their shift before running their route in the simulator.",
      category: "Offense",
      placement: "left",
      tip: "Motion players show an animated gold dashed path indicating their pre-snap path."
    },
    {
      id: "custom-zones",
      targetSelector: '[data-tour="custom-zones"]',
      title: "Defensive Zones & Custom Bubbles",
      description: "Create oval or rectangular zone coverage bubbles. Drag the zone on the field to reposition it; resize handles let you customize its depth and width. The defender's assignment line stays connected!",
      category: "Defense",
      placement: "bottom",
      tip: "You can resize zones by dragging the side and corner handles directly on the canvas."
    },
    {
      id: "pass-rush",
      targetSelector: '[data-testid="set-pass-rush-btn"]',
      title: "Pass Rush Assignment & Bend",
      description: "Designate a defender as the Rusher. Rusher lines up at or behind the official 7-yard rush line. You can bend the rush path to test blindside attacks and stunts.",
      category: "Defense",
      placement: "left",
      tip: "Drag the yellow rusher bend node on the field to angle the rush path towards the QB."
    },
    {
      id: "opponent-toggle",
      targetSelector: '[data-tour="opponent-toggle"]',
      title: "Simulate Opponent On Field",
      description: "Turn on the opposing team to test coverage reads! When enabled, defensive coverage appears against offensive routes (or vice-versa), giving coaches a complete gameday visual.",
      category: "Simulation",
      placement: "bottom",
      tip: "Click 'Opponent On' to see how your play matches up against real opposing alignments."
    },
    {
      id: "opponent-scheme",
      targetSelector: '[data-tour="opponent-scheme-selector"]',
      title: "Opponent Playbook Matchup",
      description: "Select an actual play from one of your team's other playbooks to test against! E.g. pick your own Cover 3 defense to see if your offensive flood concept finds open grass.",
      category: "Simulation",
      placement: "bottom",
      actionHint: "Click to select any offensive or defensive play to populate as the opponent.",
      tip: "Both sides run simultaneously when you click Run Play!"
    },
    {
      id: "animation-controls",
      targetSelector: '[data-tour="play-animation-controls"]',
      title: "Run Play & Timing Scrubber",
      description: "Hit 'Run Play' to watch players break on their routes in real time. Use the scrubber bar to inspect specific route milestones, or adjust speed from 0.5x to 1.5x.",
      category: "Simulation",
      placement: "top",
      tip: "Use the scrubber to freeze the frame right at the quarterback's release point."
    },
    {
      id: "formation-and-autosave",
      targetSelector: '[data-tour="autosave-status"]',
      title: "Seamless Auto-Saving",
      description: "Never lose your work! Every adjustment to player positions, routes, and zones is debounced and autosaved automatically. The green checkmark confirms cloud sync.",
      category: "Cloud",
      placement: "bottom",
      tip: "You can leave the page at any time—your work is safe and synced across your coaching staff."
    }
  ],
  callouts: [
    {
      id: "co-field",
      targetSelector: '[data-tour="play-field"]',
      label: "Field Canvas",
      description: "Drag players or route points to customize depth & angles",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-routes",
      targetSelector: '[data-tour="route-drawer-toggle"]',
      label: "Routes Tree",
      description: "40+ preset cuts & tree routes with custom yardage",
      category: "tactics",
      positionPreference: "left"
    },
    {
      id: "co-motion",
      targetSelector: '[data-tour="motion-menu-toggle"]',
      label: "Pre-Snap Motion",
      description: "Jet sweeps, orbit motion, and backfield resets",
      category: "tactics",
      positionPreference: "left"
    },
    {
      id: "co-custom-zones",
      targetSelector: '[data-tour="custom-zones"]',
      label: "Custom Zones",
      description: "Create oval or rectangular coverage zones of any size",
      category: "tactics",
      positionPreference: "bottom"
    },
    {
      id: "co-opponent",
      targetSelector: '[data-tour="opponent-toggle"]',
      label: "Opponent Toggle",
      description: "Toggle opposing offense/defense visibility on the board",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-opponent-select",
      targetSelector: '[data-tour="opponent-scheme-selector"]',
      label: "Opponent Scheme",
      description: "Load an actual play from other playbooks to test reads",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-run-play",
      targetSelector: '[data-tour="play-animation-controls"]',
      label: "Run Play / Scrubber",
      description: "Animate routes, control simulation speed, and scrub time",
      category: "gameplay",
      positionPreference: "top"
    },
    {
      id: "co-formation",
      targetSelector: '[data-tour="formation-selector"]',
      label: "Formation",
      description: "Switch offensive/defensive base alignments or add new ones",
      category: "settings",
      positionPreference: "bottom"
    },
    {
      id: "co-autosave",
      targetSelector: '[data-tour="autosave-status"]',
      label: "Auto-Save Status",
      description: "Real-time debounced cloud saving for team collaboration",
      category: "settings",
      positionPreference: "bottom"
    }
  ],
  proTips: [
    "Rotate your phone to landscape mode for a wider, expanded field viewport.",
    "Drag custom zone edges directly on the field to dynamically expand coverage width and depth.",
    "Use 'Opponent Play' to pit your top red-zone pass play against your base red-zone goal-line defense.",
    "Add coach notes to individual player pills to specify read progressions (e.g. '1st read: Post, check down to Center')."
  ]
};

export const PLAYBOOK_STUDIO_WALKTHROUGH: ToolWalkthrough = {
  id: "playbook-studio",
  toolName: "Playbook Studio",
  subtitle: "Organize offensive & defensive schemes, print wristbands, and manage plays",
  quickSummary: "Manage your team's tactical library. Group plays by formation, edit playbook details, create print-ready quarterback armbands, and collaborate privately with your coaching staff.",
  steps: [
    {
      id: "create-playbook",
      targetSelector: '[data-tour="create-playbook-btn"]',
      title: "Create a New Playbook",
      description: "Create dedicated playbooks for Offense or Defense. Organize strategies into Red Zone, 2-Minute Drill, Base Defense, or Goal Line packages.",
      category: "Playbooks",
      placement: "bottom",
      actionHint: "Click '+ New Playbook' to create an offensive or defensive book.",
      tip: "Teams can store multiple playbooks for different gameday scenarios."
    },
    {
      id: "edit-playbook",
      targetSelector: '[data-tour="edit-playbook-btn"]',
      title: "Edit Playbook Details",
      description: "Rename your playbook, update description, or customize formation categories. You can also delete unused books if you are a team admin.",
      category: "Settings",
      placement: "bottom",
      tip: "Playbooks remain private to your team and are never visible to opponents."
    },
    {
      id: "print-armband",
      targetSelector: '[data-tour="print-armband-btn"]',
      title: "Print Wristband Armbands",
      description: "Generate pocket and wristband play sheets formatted perfectly for players and quarterbacks on gameday. Choose grid layouts (2x4, 3x5, etc.) and color themes.",
      category: "Export",
      placement: "bottom",
      actionHint: "Click 'Print Armband' to preview and print gameday sheets.",
      tip: "Wristband sheets include play diagrams and route codes for rapid no-huddle calling."
    },
    {
      id: "new-play",
      targetSelector: '[data-tour="new-play-btn"]',
      title: "Add New Play",
      description: "Instantly create a new play within your active formation. Opens the full Play Designer with standard initial alignments.",
      category: "Plays",
      placement: "left",
      tip: "You can also duplicate existing plays to create variations and wrinkles."
    },
    {
      id: "play-cards",
      targetSelector: '[data-tour="play-cards-grid"]',
      title: "Play Cards & Diagram Previews",
      description: "Each card displays a live mini-diagram of the play, showing route cuts, motions, and zone assignments. Click any card to launch the Play Designer.",
      category: "Plays",
      placement: "top",
      tip: "Cards display key situation tags like '3rd & Long' or 'Goal Line'."
    }
  ],
  callouts: [
    {
      id: "co-create-pb",
      targetSelector: '[data-tour="create-playbook-btn"]',
      label: "+ New Playbook",
      description: "Create an offensive or defensive playbook",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-edit-pb",
      targetSelector: '[data-tour="edit-playbook-btn"]',
      label: "Edit Details",
      description: "Edit title, description, and formation rules",
      category: "settings",
      positionPreference: "bottom"
    },
    {
      id: "co-print-armband",
      targetSelector: '[data-tour="print-armband-btn"]',
      label: "Print Wristband",
      description: "Export compact laminated wristband play-sheets",
      category: "export",
      positionPreference: "bottom"
    },
    {
      id: "co-new-play",
      targetSelector: '[data-tour="new-play-btn"]',
      label: "+ New Play",
      description: "Start designing a new play in this formation",
      category: "primary",
      positionPreference: "left"
    },
    {
      id: "co-play-cards",
      targetSelector: '[data-tour="play-cards-grid"]',
      label: "Play Cards",
      description: "Mini route previews; click to open tactical editor",
      category: "tactics",
      positionPreference: "top"
    }
  ],
  proTips: [
    "Export your wristbands the night before games to give players time to study route codes.",
    "Create a dedicated 'Short Yardage' playbook with quick-release 3-yard slant concepts.",
    "Use Q&A notes on plays to remind backup quarterbacks of blitz hot-routes."
  ]
};

export const STAT_KEEPER_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper",
  toolName: "Live Game Stat Keeper & Scoring Wizard",
  subtitle: "Track down-and-distance, log plays with one tap, and calculate player stats live",
  quickSummary: "The official FlagOS live game scoring engine. Record passes, runs, sacks, turnovers, and penalties in real-time. Automatically tracks box scores, standings, player leaderboards, and game clocks.",
  steps: [
    {
      id: "score-header",
      targetSelector: '[data-tour="score-header"]',
      title: "Scoreboard & Team Colors",
      description: "Displays current home and away scores, active team colors, possession indicator football, and remaining timeouts for each sideline.",
      category: "Game Status",
      placement: "bottom",
      tip: "Tap a timeout button (TO) to deduct a timeout and launch the official countdown timer."
    },
    {
      id: "clock-controls",
      targetSelector: '[data-tour="game-clock-controls"]',
      title: "Game Clock & Play Clock",
      description: "Control the game period clock and official play clock (25s / 30s). Play clock resets with a single click after each play is spotted.",
      category: "Clock",
      placement: "bottom",
      tip: "The play clock turns amber when under 10 seconds and red when expiring."
    },
    {
      id: "spot-ball",
      targetSelector: '[data-tour="spot-ball-btn"]',
      title: "Ball Spotting & Snap Trigger",
      description: "Between plays, clicking 'Click When Snapped' starts the game clock and activates play recording. Ensures accurate game time tracking.",
      category: "Gameplay",
      placement: "bottom",
      actionHint: "Click when the ball is officially snapped to begin the play.",
      tip: "During two-minute warnings, the clock automatically follows stop-clock rules."
    },
    {
      id: "down-selector",
      targetSelector: '[data-tour="down-selector"]',
      title: "Down & Distance",
      description: "Displays current down (1st, 2nd, 3rd, 4th). Automatically advances on completed plays or resets upon reaching line-to-gain for a first down.",
      category: "Gameplay",
      placement: "top",
      tip: "You can tap any down manually if a referee calls a replay of the down."
    },
    {
      id: "play-type",
      targetSelector: '[data-tour="play-type-selector"]',
      title: "Play Type Wizard (Pass / Run / Penalty)",
      description: "Select the fundamental play type. Choosing Pass or Run advances directly into the outcome wizard (Complete, Incomplete, Sack, Interception, FFL).",
      category: "Play Logging",
      placement: "top",
      actionHint: "Select Pass, Run, or Penalty to log the result.",
      tip: "Penalty flow lets you select the offending player, infraction name, and automatic yardage walk-off."
    },
    {
      id: "play-log",
      targetSelector: '[data-tour="play-log-btn"]',
      title: "Play Log & Undo Play",
      description: "Review all previous plays logged in the game. If a mistake was made, click Undo to revert the last play and restore exact down, distance, and score.",
      category: "History",
      placement: "left",
      tip: "Undo is non-destructive and recalculates all individual player stats automatically."
    }
  ],
  callouts: [
    {
      id: "co-score",
      targetSelector: '[data-tour="score-header"]',
      label: "Score & Possession",
      description: "Live score, possession football, and timeout counters",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-clock",
      targetSelector: '[data-tour="game-clock-controls"]',
      label: "Clocks",
      description: "Game clock & 30-second play clock with reset buttons",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-spot",
      targetSelector: '[data-tour="spot-ball-btn"]',
      label: "Snap / Spot Ball",
      description: "Start game clock when center snaps to quarterback",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-down",
      targetSelector: '[data-tour="down-selector"]',
      label: "Down Indicator",
      description: "1st, 2nd, 3rd, or 4th down tracking",
      category: "gameplay",
      positionPreference: "top"
    },
    {
      id: "co-play-type",
      targetSelector: '[data-tour="play-type-selector"]',
      label: "Play Type",
      description: "Pass, Run, or Penalty wizard triggers",
      category: "primary",
      positionPreference: "top"
    },
    {
      id: "co-log",
      targetSelector: '[data-tour="play-log-btn"]',
      label: "Play Log & Undo",
      description: "Inspect chronological play feed and undo mistakes",
      category: "settings",
      positionPreference: "left"
    }
  ],
  proTips: [
    "Assign jersey numbers to all roster players so you can tap '#7' instead of searching names.",
    "Use Async Mode if entering stats after the game has already concluded from a paper scoresheet.",
    "Fullscreen Scoreboard mode turns any tablet or TV into a live stadium jumbotron."
  ]
};

export const TEAM_ROSTER_WALKTHROUGH: ToolWalkthrough = {
  id: "team-roster",
  toolName: "Team Roster & Depth Chart",
  subtitle: "Manage athletes, jersey numbers, positions, and offensive/defensive depth charts",
  quickSummary: "Manage your team's roster. Add and edit players, set jersey numbers used across live scoring, and build formation-by-formation depth charts.",
  steps: [
    {
      id: "add-player",
      targetSelector: '[data-tour="add-player-btn"]',
      title: "Add Player to Roster",
      description: "Add a new teammate with their name, jersey number, and primary position. Players will immediately appear in the live stat keeper and play designer.",
      category: "Personnel",
      placement: "bottom",
      actionHint: "Click '+ Add Player' to add a roster member.",
      tip: "Jersey numbers must be unique within your team to prevent live scoring confusion."
    },
    {
      id: "roster-list",
      targetSelector: '[data-tour="roster-list-table"]',
      title: "Roster Table & Details",
      description: "View all rostered athletes, their assigned jersey numbers, positions, and season games played. Edit contact emails or jersey numbers directly.",
      category: "Personnel",
      placement: "top",
      tip: "Click on any player's name to view their complete game-by-game statistics."
    },
    {
      id: "depth-chart",
      targetSelector: '[data-tour="depth-chart-section"]',
      title: "Interactive Depth Chart",
      description: "Organize starters and backups by formation (Spread, Trips, Bunch, 3-2 Defense). Ensures every player knows their assignment before kickoff.",
      category: "Tactics",
      placement: "top",
      tip: "Coaches can easily see who is backup at Rusher or Quarterback if fatigue sets in."
    }
  ],
  callouts: [
    {
      id: "co-add-player",
      targetSelector: '[data-tour="add-player-btn"]',
      label: "+ Add Player",
      description: "Add teammate name, number & position",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-roster-table",
      targetSelector: '[data-tour="roster-list-table"]',
      label: "Roster Directory",
      description: "List of players, numbers, and stats overview",
      category: "primary",
      positionPreference: "top"
    },
    {
      id: "co-depth-chart",
      targetSelector: '[data-tour="depth-chart-section"]',
      label: "Depth Chart",
      description: "Formation starters and rotational depth chart",
      category: "tactics",
      positionPreference: "top"
    }
  ],
  proTips: [
    "Keep jersey numbers up to date before gameday so the stat keeper can spot players quickly.",
    "Assign secondary positions (e.g. 'WR / DB') for versatile two-way athletes."
  ]
};

export const TEAM_HUB_WALKTHROUGH: ToolWalkthrough = {
  id: "team-hub",
  toolName: "Team Hub & Franchise Portal",
  subtitle: "Your team's home base: record, schedule, comprehensive stats, and custom colors",
  quickSummary: "The central headquarters for your team. Review recent match results, upcoming matchups, team leaderboards, and customize your team's visual identity.",
  steps: [
    {
      id: "team-header",
      targetSelector: '[data-tour="team-header-identity"]',
      title: "Team Identity & Colors",
      description: "Displays your team logo, official name, shortcode, and custom brand colors. Team colors automatically theme your entire team portal and play designer.",
      category: "Branding",
      placement: "bottom",
      tip: "Coaches can customize primary, secondary, and tertiary colors with high-contrast preview."
    },
    {
      id: "team-record",
      targetSelector: '[data-tour="team-record-badge"]',
      title: "Season Record & Form",
      description: "Tracks your Wins, Losses, Ties, Win Percentage, Point Differential, and active winning/losing streak across the active season.",
      category: "Performance",
      placement: "bottom",
      tip: "Tiebreakers in league standings factor in head-to-head records and point differential."
    },
    {
      id: "quick-links",
      targetSelector: '[data-tour="team-quick-links"]',
      title: "Quick Navigation Hub",
      description: "Direct shortcuts to Roster, Schedule, Season Stats, and Playbook Studio. Everything your coaching staff and players need in one place.",
      category: "Navigation",
      placement: "bottom",
      tip: "Playbook button is restricted to rostered players and verified team coaches."
    },
    {
      id: "edit-team",
      targetSelector: '[data-tour="edit-team-btn"]',
      title: "Edit Team & Branding",
      description: "Authorized team coaches can edit the team name, upload custom logos, or pick preset color combinations.",
      category: "Settings",
      placement: "left",
      tip: "Changes made here immediately update your score display in live game stat keeping."
    }
  ],
  callouts: [
    {
      id: "co-team-identity",
      targetSelector: '[data-tour="team-header-identity"]',
      label: "Team Identity",
      description: "Logo, team name, shortcode and color theme",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-team-record",
      targetSelector: '[data-tour="team-record-badge"]',
      label: "Season Record",
      description: "W-L-T, win percentage, streak & point differential",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-quick-links",
      targetSelector: '[data-tour="team-quick-links"]',
      label: "Quick Links",
      description: "Direct access to Playbook, Roster, Schedule & Stats",
      category: "primary",
      positionPreference: "bottom"
    },
    {
      id: "co-edit-team",
      targetSelector: '[data-tour="edit-team-btn"]',
      label: "Edit Team Info",
      description: "Change colors, logo, and franchise settings",
      category: "settings",
      positionPreference: "left"
    }
  ],
  proTips: [
    "Share the team hub URL with players—they can view their stats and schedule without logging in.",
    "Use high-contrast team colors so your plays and live scores stand out clearly."
  ]
};

export const LEAGUE_DIRECTORY_WALKTHROUGH: ToolWalkthrough = {
  id: "league-directory",
  toolName: "League Directory & Standings",
  subtitle: "Explore divisions, standings, season schedule, and individual player leaders",
  quickSummary: "Explore the entire league ecosystem. Check team standings, view live score updates, filter the game schedule, and compare player leaderboards.",
  steps: [
    {
      id: "standings",
      targetSelector: '[data-tour="league-standings-section"]',
      title: "Standings & Point Differential",
      description: "Up-to-date league standings sorted by winning percentage and tiebreakers. Tracks Points For, Points Against, and active streaks.",
      category: "Standings",
      placement: "top",
      tip: "Tap any team row to jump directly to their franchise hub."
    },
    {
      id: "schedule-link",
      targetSelector: '[data-tour="league-schedule-tab"]',
      title: "Schedule & Live Games",
      description: "View upcoming games, past final scores, and currently live in-progress matchups with real-time score updates.",
      category: "Schedule",
      placement: "bottom",
      tip: "Live games display a pulsating red 'LIVE' badge with current game time."
    },
    {
      id: "stats-link",
      targetSelector: '[data-tour="league-stats-tab"]',
      title: "League Leaderboards",
      description: "See the league's top passers, rushers, receivers, flag pullers, and sack leaders. Compare MVP candidates across teams.",
      category: "Stats",
      placement: "bottom",
      tip: "Filter leaders by season, minimum attempts, or specific defensive categories."
    }
  ],
  callouts: [
    {
      id: "co-standings",
      targetSelector: '[data-tour="league-standings-section"]',
      label: "Standings Table",
      description: "Rankings, W-L records, and playoff seeding",
      category: "primary",
      positionPreference: "top"
    },
    {
      id: "co-league-schedule",
      targetSelector: '[data-tour="league-schedule-tab"]',
      label: "Game Schedule",
      description: "All matches, field locations, and live games",
      category: "gameplay",
      positionPreference: "bottom"
    },
    {
      id: "co-league-stats",
      targetSelector: '[data-tour="league-stats-tab"]',
      label: "League Leaders",
      description: "Top passing, rushing, receiving, and defensive stats",
      category: "primary",
      positionPreference: "bottom"
    }
  ],
  proTips: [
    "Switch between light and dark mode at the top right for optimal outdoor daylight visibility on the sidelines.",
    "Click any player's name in the leaderboards to view their complete game log."
  ]
};

export const ALL_WALKTHROUGHS: Record<string, ToolWalkthrough> = {
  "play-designer": PLAY_DESIGNER_WALKTHROUGH,
  "playbook-studio": PLAYBOOK_STUDIO_WALKTHROUGH,
  "stat-keeper": STAT_KEEPER_WALKTHROUGH,
  "team-roster": TEAM_ROSTER_WALKTHROUGH,
  "team-hub": TEAM_HUB_WALKTHROUGH,
  "league-directory": LEAGUE_DIRECTORY_WALKTHROUGH,
};

export function getToolWalkthroughForRoute(pathname: string | null | undefined): ToolWalkthrough | null {
  if (!pathname) return null;
  if (/^\/teams\/[^/]+\/playbook/.test(pathname)) {
    // If in editor view, default to play-designer, or playbook studio
    return PLAY_DESIGNER_WALKTHROUGH;
  }
  if (/^\/matches\/[^/]+\/play-by-play/.test(pathname) || /^\/teams\/[^/]+\/matches\/[^/]+\/stat-keeper/.test(pathname)) {
    return STAT_KEEPER_WALKTHROUGH;
  }
  if (/^\/teams\/[^/]+\/roster/.test(pathname)) {
    return TEAM_ROSTER_WALKTHROUGH;
  }
  if (/^\/teams\/[^/]+$/.test(pathname)) {
    return TEAM_HUB_WALKTHROUGH;
  }
  if (pathname.startsWith("/league") || pathname === "/leagues" || pathname === "/schedule" || pathname === "/stats") {
    return LEAGUE_DIRECTORY_WALKTHROUGH;
  }
  return null;
}
