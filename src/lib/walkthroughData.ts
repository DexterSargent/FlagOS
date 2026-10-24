export interface WalkthroughDetail {
  label: string;
  text: string;
}

export interface WalkthroughStep {
  id: string;
  /** CSS selector for the highlighted control. Empty string shows a centred overview card. */
  targetSelector: string;
  title: string;
  description: string;
  /** Button-by-button breakdown of everything inside the highlighted area. */
  details?: WalkthroughDetail[];
  category?: string;
  placement?: "top" | "bottom" | "left" | "right";
  tip?: string;
  actionHint?: string;
}

export interface ToolWalkthrough {
  id: string;
  toolName: string;
  subtitle: string;
  steps: WalkthroughStep[];
}

export const PLAY_DESIGNER_WALKTHROUGH: ToolWalkthrough = {
  id: "play-designer",
  toolName: "Play Designer",
  subtitle: "Draw formations, routes, motion and defensive coverages",
  steps: [
    {
      id: "studio-toolbar",
      targetSelector: '[data-testid="designer-toolbar"]',
      title: "Studio Toolbar",
      category: "Navigation",
      description: "The bar across the top of the designer handles everything about the play as a whole.",
      details: [
        { label: "Back to Plays", text: "Returns to the play list for this formation. Your work is auto-saved first." },
        { label: "Formation dropdown", text: "Jump straight to another formation in this playbook without leaving the designer." },
        { label: "Coach Q&A", text: "Opens the coaching notes / question log your staff and players can read." },
        { label: "Save status", text: "Shows Saving… / Saved so you always know your changes are stored." },
      ],
      tip: "Return to the formation's play cards to duplicate, delete or create plays. Print whole playbooks from the playbook menu.",
    },
    {
      id: "play-command-bar",
      targetSelector: '[data-tour="play-command-bar"]',
      title: "Play Details Bar",
      category: "Play Setup",
      description: "Name the play and tag when you want to call it.",
      details: [
        { label: "Play name", text: "Type to rename the play. This is the name shown on wristbands and the play list." },
        { label: "Formation", text: "Changes the formation this play belongs to. Pick 'Add New Formation…' to create one on the spot." },
        { label: "Situation", text: "Tags the play for a game situation (e.g. Red Zone, 3rd & Short) so you can filter for it later." },
        { label: "Notes icon", text: "Adds a free-form coaching note to the play." },
        { label: "Q&A icon", text: "Opens questions and answers attached to this specific play." },
        { label: "Guided Tour", text: "Re-opens this walkthrough any time." },
      ],
    },
    {
      id: "opponent-toggle",
      targetSelector: '[data-tour="opponent-toggle"]',
      title: "Show Opponent",
      category: "Field View",
      description: "Overlays the opposing side on the field so you can design against a look.",
      details: [
        { label: "Toggle", text: "Shows or hides the opposing players. They're for reference only and don't change your play." },
      ],
      tip: "Designing offense? Turn on a Cover 2 look to see where the holes are before drawing routes.",
    },
    {
      id: "opponent-scheme",
      targetSelector: '[data-tour="opponent-scheme-selector"]',
      title: "Opponent Scheme",
      category: "Field View",
      description: "Choose which play the opposing side runs.",
      details: [
        { label: "Your playbooks", text: "Pick any play from your other playbooks (e.g. your own defense) as the opponent look." },
        { label: "Standard plays", text: "Built-in common looks such as Cover 1, Cover 2, Cover 3 and basic offensive sets." },
        { label: "Reset alignment", text: "Snaps dragged opponent players back to their default spots." },
        { label: "X", text: "Clears the opponent scheme." },
      ],
    },
    {
      id: "custom-zones",
      targetSelector: '[data-tour="custom-zones"]',
      title: "Custom Zones",
      category: "Defense",
      description: "Add your own coverage areas to the field on defensive plays.",
      details: [
        { label: "Custom zone", text: "Adds one coverage area you can drag and resize. Zone tools appear only for zone coverage, not man or rush." },
        { label: "Roundness", text: "Slide from square corners (0%) to a full oval (100%) without creating a different zone." },
      ],
    },
    {
      id: "play-field",
      targetSelector: '[data-tour="play-field"]',
      title: "The Field",
      category: "Canvas",
      placement: "right",
      description: "This is where you build the play. Everything here can be dragged.",
      details: [
        { label: "Player circle", text: "Tap to select, drag to move them pre-snap." },
        { label: "Route nodes", text: "Drag a route's corner points to reshape it. Undo point removes the last node without clearing the rest of the route or its motion." },
        { label: "Motion nodes", text: "The dashed path before the snap. Drag to change where the motion player ends up." },
        { label: "Zones & handles", text: "Drag a zone to move it; pull the corner handles to resize." },
        { label: "Rusher bend", text: "On a rusher, drag the curve handle to bend the rush path around the line." },
        { label: "Draw mode", text: "While drawing, each tap on the field adds the next route point." },
      ],
      actionHint: "Tap a player, then drag them to a new spot.",
    },
    {
      id: "player-pills",
      targetSelector: '[data-tour="player-pills"]',
      title: "Player Pills",
      category: "Players",
      description: "A quick list of every player in the play. Tapping one selects it, even if it's hard to grab on the field.",
      details: [
        { label: "Coloured dot", text: "Means the player already has a route or assignment." },
        { label: "📝", text: "That player has a position note." },
        { label: "⚡", text: "That player is the pre-snap motion player." },
      ],
    },
    {
      id: "player-actions",
      targetSelector: '[data-tour="player-actions"]',
      title: "Selected Player Actions",
      category: "Players",
      description: "Shows who is selected and what they're doing, plus tools for that player.",
      details: [
        { label: "Position Notes", text: "Opens the install sheet: one note per position explaining their job on this play." },
        { label: "Draw Route / Stop Drawing", text: "Enter draw mode to tap out a custom route; tap again to finish." },
        { label: "Undo", text: "Removes only the last route node. The earlier nodes and pre-snap motion stay intact." },
        { label: "Clear", text: "Removes the selected player's route or assignment." },
      ],
    },
    {
      id: "route-drawer",
      targetSelector: '[data-tour="route-drawer-toggle"]',
      title: "Route Library",
      category: "Routes",
      description: "Pick a pre-built route instead of drawing one by hand.",
      details: [
        { label: "Route list", text: "Slant, Out, Post, Corner, Go and more. They're auto-mirrored to the player's side of the field." },
        { label: "Saved routes", text: "Routes you've saved from your own drawings appear here too." },
        { label: "Switch players", text: "Use the position pills at the top of the library to assign another receiver without closing it. Only the route list scrolls; the field stays visible." },
        { label: "Route depth", text: "Use the vertical rail beside the field, its plus/minus buttons, or the arrow keys while the rail is focused to adjust depth in yards." },
      ],
      tip: "Draw a route once, save it as a preset, then reuse it in any play.",
    },
    {
      id: "motion-menu",
      targetSelector: '[data-tour="motion-menu-toggle"]',
      title: "Pre-Snap Motion",
      category: "Routes",
      description: "Gives the selected offensive player a motion before the snap.",
      details: [
        { label: "Motion types", text: "Jet, orbit, shift and return motions. The ⚡ marker shows who's in motion." },
        { label: "Remove motion", text: "Clears the motion so the player starts from their set spot." },
        { label: "Switch players", text: "The motion menu has its own position pills. Route choices stay in the separate Routes library." },
      ],
    },
    {
      id: "defense-coverage",
      targetSelector: '[data-tour="defense-coverage"]',
      title: "Coverage & Assignment",
      category: "Defense",
      description: "With a defender selected, choose what they're responsible for.",
      details: [
        { label: "Zone", text: "Shows standard zone choices (deep third, flat, hook…) and one Custom zone action. Man and Rush hide these zone tools." },
        { label: "Man", text: "Then tap the receiver this defender should cover; a ring shows the match-up." },
        { label: "Rush", text: "Sends the defender after the QB. Bend the path on the field." },
        { label: "Category tabs", text: "Filter the standard zones by deep, underneath or flat." },
      ],
    },
    {
      id: "zone-customizer",
      targetSelector: '[data-testid="zone-customizer-panel"]',
      title: "Zone Customizer",
      category: "Defense",
      description: "Fine-tune the selected zone.",
      details: [
        { label: "Delete", text: "Removes the zone." },
        { label: "Name", text: "Rename it (e.g. 'Hook L') so players know what it means." },
        { label: "Roundness", text: "Adjust continuously from square corners (0%) to an oval (100%)." },
        { label: "Width & depth", text: "Use − / + for small steps or drag the slider." },
        { label: "Colour swatches", text: "Colour-code zones, for example deep in blue and underneath in yellow." },
      ],
    },
    {
      id: "animation-controls",
      targetSelector: '[data-tour="play-animation-controls"]',
      title: "Play Animation",
      category: "Playback",
      description: "Watch the play run so you can check timing and spacing.",
      details: [
        { label: "Run / Pause / Replay", text: "Starts, pauses or replays the animation." },
        { label: "Reset", text: "Puts every player back at the pre-snap alignment." },
        { label: "Speed dropdown", text: "Choose 0.5x, 1x or 1.5x. Slow it down to teach timing." },
        { label: "Timeline slider", text: "Scrub to any moment of the play." },
      ],
      actionHint: "Press Run to watch your play.",
    },
  ],
};

export const PLAYBOOK_STUDIO_WALKTHROUGH: ToolWalkthrough = {
  id: "playbook-studio",
  toolName: "Playbook Studio",
  subtitle: "Organise playbooks, formations and plays",
  steps: [
    {
      id: "studio-overview",
      targetSelector: "",
      title: "How Playbooks Are Organised",
      category: "Overview",
      description: "Everything is nested in three levels so it stays tidy as your playbook grows.",
      details: [
        { label: "Playbook", text: "A collection for one side of the ball (e.g. 'Offense 2026' or 'Base Defense')." },
        { label: "Formation", text: "A set alignment of players inside a playbook (e.g. Trips Right)." },
        { label: "Play", text: "The routes or assignments run from a formation." },
      ],
    },
    {
      id: "create-playbook",
      targetSelector: '[data-tour="create-playbook-btn"]',
      title: "Create Playbook",
      category: "Playbooks",
      description: "Starts a new offensive or defensive playbook.",
      details: [
        { label: "Name", text: "What players will see on the playbook card." },
        { label: "Type", text: "Offense or Defense — this sets which tools the designer shows." },
      ],
    },
    {
      id: "playbook-cards",
      targetSelector: '[data-tour="playbook-cards-grid"]',
      title: "Your Playbooks",
      category: "Playbooks",
      description: "Each card is one playbook with a preview of its formations.",
      details: [
        { label: "Card", text: "Opens the playbook to see its formations." },
        { label: "Pencil", text: "Rename the playbook." },
        { label: "Trash", text: "Delete the playbook and everything in it (asks for confirmation)." },
      ],
    },
    {
      id: "formations-toolbar",
      targetSelector: '[data-tour="formations-toolbar"]',
      title: "Formations Toolbar",
      category: "Formations",
      description: "Controls for the playbook you have open.",
      details: [
        { label: "All Playbooks", text: "Goes back to the playbook list." },
        { label: "Pencil", text: "Rename this playbook." },
        { label: "Show / Hide Opposing", text: "Shows an opponent look on the formation previews." },
        { label: "Add Formation", text: "Opens the formation editor to place players." },
      ],
    },
    {
      id: "formation-cards",
      targetSelector: '[data-tour="formation-cards-grid"]',
      title: "Formation Cards",
      category: "Formations",
      description: "Each card shows the pre-snap spots and how many plays use it. Tap one to see its plays.",
      tip: "Keep formations few and plays many — it's easier for players to learn.",
    },
    {
      id: "new-play",
      targetSelector: '[data-tour="new-play-btn"]',
      title: "New Play",
      category: "Plays",
      description: "Opens the Play Designer with a blank play in the current formation.",
    },
    {
      id: "edit-playbook",
      targetSelector: '[data-tour="edit-playbook-btn"]',
      title: "Edit Playbook",
      category: "Plays",
      description: "Rename or change the details of the playbook you're in.",
    },
    {
      id: "play-cards",
      targetSelector: '[data-tour="play-cards-grid"]',
      title: "Play Cards",
      category: "Plays",
      description: "Every play in this formation, with a mini diagram.",
      details: [
        { label: "Card", text: "Opens the play in the designer." },
        { label: "Formation dropdown", text: "Moves the play to another formation." },
        { label: "Duplicate", text: "Makes a copy to build a variation." },
        { label: "Delete", text: "Removes the play." },
      ],
    },
    {
      id: "print-armband",
      targetSelector: '[data-tour="print-armband-btn"]',
      title: "Print Wristbands",
      category: "Game Day",
      description: "Builds a printable wristband / armband sheet with numbered plays for game day.",
    },
    {
      id: "autosave",
      targetSelector: '[data-tour="autosave-status"]',
      title: "Auto-Save",
      category: "Game Day",
      description: "Changes save automatically. This shows when the last save happened.",
    },
  ],
};

export const STAT_KEEPER_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper",
  toolName: "Stat Keeper",
  subtitle: "Run the clock and log every play live",
  steps: [
    {
      id: "score-header",
      targetSelector: '[data-tour="score-header"]',
      title: "Scoreboard Header",
      category: "Game Status",
      description: "The live score, clocks and game controls. Everything here updates for fans in real time.",
      details: [
        { label: "‹ Back", text: "Leaves the stat keeper. The game keeps its state." },
        { label: "Team scores", text: "Update automatically from the plays you log." },
      ],
    },
    {
      id: "undo",
      targetSelector: '[aria-label="Undo last play"]',
      title: "Undo Last Play",
      category: "Game Status",
      description: "Reverses the most recent play, including its score, stats and down & distance.",
      tip: "Logged the wrong player? Undo, then re-log — it's faster than editing.",
    },
    {
      id: "timeouts",
      targetSelector: '[title="Call home team timeout"]',
      title: "Timeouts",
      category: "Clock",
      description: "Tap a team's timeout to use one. It stops the game clock and the remaining count drops.",
    },
    {
      id: "game-clock",
      targetSelector: '[data-tour="game-clock-controls"]',
      title: "Game Clock",
      category: "Clock",
      description: "Controls the main game clock.",
      details: [
        { label: "▶ / ❚❚", text: "Start or stop the clock." },
        { label: "±10s", text: "Adjust the time. Hold for faster changes (hidden on small phones)." },
      ],
    },
    {
      id: "down-selector",
      targetSelector: '[data-tour="down-selector"]',
      title: "Down",
      category: "Game Status",
      description: "Shows the current down. Use − and + to correct it; it normally advances on its own.",
    },
    {
      id: "play-clock",
      targetSelector: '[data-tour="play-clock-controls"]',
      title: "Play Clock",
      category: "Clock",
      description: "The between-plays clock. It turns amber at 5 seconds and red at 0.",
      details: [
        { label: "▶ / ❚❚", text: "Start or pause the play clock." },
        { label: "↺", text: "Reset to the full play clock." },
      ],
    },
    {
      id: "fullscreen",
      targetSelector: '[aria-label="Fullscreen scoreboard"]',
      title: "Fullscreen Scoreboard",
      category: "Game Status",
      description: "Shows a big scoreboard you can point at the crowd or bench.",
    },
    {
      id: "reset-game",
      targetSelector: '[aria-label="Reset game"]',
      title: "Reset Game",
      category: "Game Status",
      description: "Wipes the game back to pre-game. It asks for confirmation — use it only if you started by mistake.",
    },
    {
      id: "play-log",
      targetSelector: '[data-tour="play-log-btn"]',
      title: "Play Log",
      category: "Logging",
      description: "Opens the full list of logged plays so you can review or fix them.",
    },
    {
      id: "spot-ball",
      targetSelector: '[data-tour="spot-ball-btn"]',
      title: "Spot the Ball",
      category: "Logging",
      description: "Sets where the ball is on the field. Yardage for the next play is measured from here.",
    },
    {
      id: "play-type",
      targetSelector: '[data-tour="play-type-selector"]',
      title: "Log a Play",
      category: "Logging",
      description: "Pick what happened, then fill in who was involved.",
      details: [
        { label: "Down buttons", text: "Quickly set the down before logging." },
        { label: "Pass", text: "Pick the passer, receiver and result (complete, incomplete, interception)." },
        { label: "Run", text: "Pick the runner and where they were flagged." },
        { label: "Penalty", text: "Pick the penalty and which team it's against; yardage is applied for you." },
      ],
      actionHint: "Tap Pass or Run to start logging.",
    },
  ],
};

export const TEAM_ROSTER_WALKTHROUGH: ToolWalkthrough = {
  id: "team-roster",
  toolName: "Team Roster",
  subtitle: "Manage players, jersey numbers and the depth chart",
  steps: [
    {
      id: "add-player",
      targetSelector: '[data-tour="add-player-btn"]',
      title: "Add Player",
      category: "Roster",
      description: "Adds someone to the team.",
      details: [
        { label: "Name", text: "The player's display name." },
        { label: "Jersey #", text: "Must be unique on the team." },
        { label: "Positions", text: "Pick up to 10 positions they can play." },
        { label: "Add / Cancel", text: "Save the player or close without saving." },
        { label: "Roster Full", text: "Shown instead when the team has hit its player limit." },
      ],
    },
    {
      id: "roster-tabs",
      targetSelector: '[data-tour="roster-tabs"]',
      title: "View Switcher",
      category: "Roster",
      description: "Switch how you look at the team.",
      details: [
        { label: "Roster Table", text: "The full player list." },
        { label: "Depth Chart", text: "Order players by position for game day." },
        { label: "Show / Hide Stats", text: "Adds season stats to the table." },
      ],
    },
    {
      id: "roster-table",
      targetSelector: '[data-tour="roster-list-table"]',
      title: "Roster Table",
      category: "Roster",
      description: "Every player on the team.",
      details: [
        { label: "Name / Stats", text: "Opens the player's stats and game log." },
        { label: "Edit", text: "Change name, jersey or positions." },
        { label: "Delete", text: "Removes the player from the roster (asks first)." },
      ],
    },
    {
      id: "depth-chart",
      targetSelector: '[data-tour="depth-chart-section"]',
      title: "Depth Chart",
      category: "Depth Chart",
      description: "Drag players to set who starts at each position and who backs them up.",
    },
  ],
};

export const TEAM_HUB_WALKTHROUGH: ToolWalkthrough = {
  id: "team-hub",
  toolName: "Team Hub",
  subtitle: "Your team's home page",
  steps: [
    {
      id: "team-identity",
      targetSelector: '[data-tour="team-header-identity"]',
      title: "Team Identity",
      category: "Team",
      description: "Your team name, colours and logo as everyone else sees them.",
      details: [{ label: "Add / Change Logo", text: "Upload a logo (coaches only)." }],
    },
    {
      id: "schedule-game",
      targetSelector: '[data-tour="team-schedule-game-btn"]',
      title: "Schedule Game",
      category: "Coach Tools",
      description: "Add a game to your team's schedule, including against teams outside the league.",
    },
    {
      id: "team-staff",
      targetSelector: '[data-tour="team-staff-btn"]',
      title: "Coaches & Admins",
      category: "Coach Tools",
      description: "Choose who else can manage this team.",
      details: [
        { label: "Add by email", text: "Gives another coach edit access once they sign in with that email." },
        { label: "Remove", text: "Takes away someone's access." },
        { label: "Manage my connected emails", text: "Link other emails you sign in with." },
      ],
    },
    {
      id: "edit-team",
      targetSelector: '[data-tour="edit-team-btn"]',
      title: "Edit Team",
      category: "Coach Tools",
      description: "Change how the team looks across the site.",
      details: [
        { label: "Name & shortcode", text: "The shortcode (up to 5 letters) appears on scoreboards." },
        { label: "Colour presets", text: "One-tap colour schemes." },
        { label: "Primary / secondary / tertiary", text: "Pick colours or type exact hex codes." },
        { label: "Logo", text: "Upload a file, paste a URL or remove it." },
        { label: "Save / Cancel", text: "Apply or discard your changes." },
      ],
    },
    {
      id: "team-record",
      targetSelector: '[data-tour="team-record-badge"]',
      title: "Record & Stats",
      category: "Team",
      description: "The season record and headline stats.",
      details: [
        { label: "Customize Stats", text: "Choose which stats appear here." },
        { label: "Retry", text: "Reloads stats if they failed to load." },
      ],
    },
    {
      id: "quick-links",
      targetSelector: '[data-tour="team-quick-links"]',
      title: "Quick Links",
      category: "Navigation",
      description: "Jump to the team's main areas.",
      details: [
        { label: "Schedule", text: "Upcoming and past games." },
        { label: "Roster", text: "Players and depth chart." },
        { label: "Stats", text: "Team and player stats." },
        { label: "Playbook", text: "Only coaches and rostered players can see it." },
      ],
    },
  ],
};

export const LEAGUE_DIRECTORY_WALKTHROUGH: ToolWalkthrough = {
  id: "league-directory",
  toolName: "League Command Center",
  subtitle: "Run the league: schedule, standings, teams and settings",
  steps: [
    {
      id: "league-admin-actions",
      targetSelector: '[data-tour="league-admin-actions"]',
      title: "Commissioner Actions",
      category: "Admin",
      description: "Your main league controls.",
      details: [
        { label: "League Settings", text: "Branding, rules, divisions, visibility, teams and billing." },
        { label: "Schedule Game", text: "Add games to the league schedule." },
        { label: "Manage Teams", text: "See and edit every team in the league." },
      ],
    },
    {
      id: "league-kpis",
      targetSelector: '[data-tour="league-kpis"]',
      title: "League at a Glance",
      category: "Admin",
      description: "Teams vs paid slots, schedule progress, total players and the top scorer.",
      details: [{ label: "Manage Teams & Slots", text: "Opens League Settings to add team slots." }],
    },
    {
      id: "league-schedule",
      targetSelector: '[data-tour="league-schedule-tab"]',
      title: "Live & Upcoming Games",
      category: "Games",
      description: "Live games show the score in real time. Tap a game to open it or start keeping stats.",
    },
    {
      id: "league-standings",
      targetSelector: '[data-tour="league-standings-section"]',
      title: "Standings",
      category: "Season",
      description: "Updated automatically as games are finished.",
    },
    {
      id: "league-stats",
      targetSelector: '[data-tour="league-stats-tab"]',
      title: "League Leaders",
      category: "Season",
      description: "Top passer, receiver, scorer and flag puller. Tap a player to see their game log.",
    },
    {
      id: "league-teams",
      targetSelector: '[data-tour="league-teams-grid"]',
      title: "Teams",
      category: "Teams",
      description: "Every team in the league with its record. Tap a team to open its hub.",
    },
  ],
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
