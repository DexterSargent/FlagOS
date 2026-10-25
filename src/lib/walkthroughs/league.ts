import type { ToolWalkthrough } from "@/lib/walkthroughData";

export const COMMISSIONER_DASHBOARD_WALKTHROUGH: ToolWalkthrough = {
  id: "commissioner-dashboard",
  toolName: "League Command Center",
  subtitle: "Run your league: teams, games, standings, leaders and settings",
  steps: [
    { id: "overview", targetSelector: "", title: "Your League Command Center", category: "Overview", description: "This is the commissioner home base. Review the season, manage the league, and jump into games, teams, standings, and player leaders." },
    { id: "actions", targetSelector: '[data-tour="league-admin-actions"]', title: "Commissioner Actions", category: "League Setup", description: "Use these shortcuts to update your league or open the main management pages.", details: [
      { label: "League Settings", text: "Open league setup to manage branding, rules, teams, visibility, and other league options." },
      { label: "Schedule Game", text: "Open the calendar to add and manage games." },
      { label: "Manage Teams", text: "Open the team directory to manage team rosters and league teams." },
      { label: "View Teams", text: "When the league is archived, this opens the read-only team directory." },
      { label: "Copy Direct URL", text: "Copy the private league link so invited people can open this league." },
    ] },
    { id: "league-kpis", targetSelector: '[data-tour="league-kpis"]', title: "League at a Glance", category: "Season", description: "These cards summarize team slots, schedule progress, player count, and league scoring leaders.", details: [
      { label: "Teams & Slots", text: "Compare the current team count with your league's available team slots." },
      { label: "Manage Teams & Slots", text: "Open League Settings to adjust team slots. Demo leagues show Demo Settings instead." },
      { label: "Schedule Progress", text: "See how many games have been scheduled or completed." },
      { label: "Players", text: "See the number of players currently registered in the league." },
      { label: "Top Scorer", text: "See who has scored the most touchdowns so far." },
    ] },
    { id: "league-schedule", targetSelector: '[data-tour="league-schedule-tab"]', title: "Live & Upcoming Games", category: "Games", description: "Follow current and upcoming matchups. Open a game for its score and play-by-play, or start scorekeeping when your role allows it.", details: [
      { label: "Schedule", text: "Open the full league calendar." },
      { label: "Game card", text: "Open a matchup to see its game details and available live or stat-keeping actions." },
      { label: "Stat Keeper", text: "For an eligible manager, open the live controls and record plays." },
    ] },
    { id: "league-standings", targetSelector: '[data-tour="league-standings-section"]', title: "Official Standings", category: "Season", description: "Compare team records and points as completed games update the table.", details: [
      { label: "Team name", text: "Open that team's hub." },
      { label: "Standings & Stats", text: "Open the complete league standings and player statistics." },
    ] },
    { id: "league-leaders", targetSelector: '[data-tour="league-leaders-section"]', title: "League Stat Leaders", category: "Season", description: "See the leading passers, receivers, scorers, and defenders.", details: [
      { label: "Player name", text: "Open that player's profile or game details when available." },
      { label: "View all stats", text: "Open the full stats page for sortable player leaderboards." },
    ] },
    { id: "league-teams", targetSelector: '[data-tour="league-teams-grid"]', title: "Team Directory Preview", category: "Teams", description: "Browse league teams and their records, then open a team hub.", details: [
      { label: "Team card", text: "Open the selected team's hub." },
      { label: "View all teams", text: "Open the full team directory." },
    ] },
  ],
};

export const TEAM_ADMIN_DASHBOARD_WALKTHROUGH: ToolWalkthrough = {
  id: "team-admin-dashboard", toolName: "Team Dashboard", subtitle: "Manage your roster and prepare for your team's next game",
  steps: [
    { id: "overview", targetSelector: "", title: "Your Team Dashboard", category: "Overview", description: "See your team's season at a glance, add players, check the next matchup, and review team stats." },
    { id: "team-actions", targetSelector: '[data-tour="team-dashboard-actions"]', title: "Team Shortcuts", category: "Team", description: "Quickly get to common team tasks.", details: [
      { label: "Add Player", text: "Open the quick-add form to add a player to your roster." },
      { label: "Full Roster", text: "Open the complete roster for your team." },
      { label: "Playbook", text: "Open your team's playbook." },
      { label: "Edit Team Info", text: "Open your team hub to update team details." },
    ] },
    { id: "team-snapshot", targetSelector: '[data-tour="team-dashboard-stats"]', title: "Team Snapshot", category: "Season", description: "Review your record, roster size, point differential, and standing." },
    { id: "team-schedule", targetSelector: '[data-tour="dashboard-schedule"]', title: "Team Games", category: "Games", description: "Follow your upcoming and live games. Choose a matchup for the game details." },
    { id: "team-standings", targetSelector: '[data-tour="dashboard-standings"]', title: "League Standings", category: "Season", description: "Compare your team's position with the rest of the league." },
    { id: "team-leaders", targetSelector: '[data-tour="dashboard-leaders"]', title: "Team Leaders", category: "Stats", description: "Check your team's top passers, receivers, scorers, and defenders." },
    { id: "team-roster", targetSelector: '[data-tour="team-dashboard-roster"]', title: "Roster Preview", category: "Team", description: "Review your active players and open a player's profile or the complete roster." },
  ],
};

export const PLAYER_DASHBOARD_WALKTHROUGH: ToolWalkthrough = {
  id: "player-dashboard", toolName: "Player Dashboard", subtitle: "Keep up with your team, games, and season stats",
  steps: [
    { id: "overview", targetSelector: "", title: "Your Player Dashboard", category: "Overview", description: "This is your personal gameday view. Check your team, next game, teammates, stats, and league leaders." },
    { id: "player-actions", targetSelector: '[data-tour="player-dashboard-actions"]', title: "Team Shortcuts", category: "Team", description: "Open the team resources available to your account.", details: [
      { label: "Team Playbook", text: "Open your team's playbook when you have access to it." },
      { label: "Team Hub", text: "Open your team's main page." },
      { label: "Squad Roster", text: "See your teammates and the full roster." },
      { label: "View Teams", text: "If you are a free agent, browse league teams." },
    ] },
    { id: "player-stats", targetSelector: '[data-tour="player-dashboard-stats"]', title: "Your Season Stats", category: "Stats", description: "Review your season performance breakdown.", details: [
      { label: "League Leaderboards", text: "Open the full league player leaderboards." },
      { label: "Full Career Logs", text: "Open your career profile and game logs." },
    ] },
    { id: "player-games", targetSelector: '[data-tour="dashboard-schedule"]', title: "Games", category: "Games", description: "Follow live and upcoming league games. Open your matchup to see its details." },
    { id: "player-standings", targetSelector: '[data-tour="player-dashboard-standings"]', title: "League Standings", category: "Season", description: "Compare your team's record with the rest of the league.", details: [
      { label: "View Full Table", text: "Open complete standings and player statistics." },
      { label: "Team name", text: "Open that team's hub." },
    ] },
    { id: "player-leaders", targetSelector: '[data-tour="player-league-recognition"]', title: "League Leader Recognition", category: "Stats", description: "If you are a league leader, this banner shows the categories where you rank at the top.", details: [
      { label: "Leaderboards", text: "Open the full league leaderboard page." },
    ] },
    { id: "player-roster", targetSelector: '[data-tour="player-dashboard-roster"]', title: "Teammates", category: "Team", description: "See the players sharing your roster and open the full roster or team clubhouse.", details: [
      { label: "Full Roster", text: "Open every player on your team." },
      { label: "View Team Clubhouse", text: "Open your team's main page." },
    ] },
  ],
};

export const SPECTATOR_DASHBOARD_WALKTHROUGH: ToolWalkthrough = {
  id: "spectator-dashboard", toolName: "League Overview", subtitle: "Follow live games, standings, teams, and player leaders",
  steps: [
    { id: "overview", targetSelector: "", title: "League Gameday Overview", category: "Overview", description: "Follow the season without managing a team. Find live and upcoming games, standings, leaders, and team pages here." },
    { id: "fan-links", targetSelector: '[data-tour="spectator-dashboard-links"]', title: "League Shortcuts", category: "Navigation", description: "Jump to the most-used public league pages.", details: [
      { label: "Game Schedule", text: "Browse upcoming, live, and completed games." },
      { label: "Standings & Stats", text: "Compare team standings and player statistics." },
      { label: "Player Registration", text: "Open the registration page when the league is accepting players." },
    ] },
    { id: "fan-snapshot", targetSelector: '[data-tour="spectator-dashboard-snapshot"]', title: "Season Snapshot", category: "Season", description: "See active teams, upcoming games, and current scoring and passing leaders." },
    { id: "fan-schedule", targetSelector: '[data-tour="dashboard-schedule"]', title: "Live & Upcoming Games", category: "Games", description: "Open a game to see its details or follow the live play-by-play." },
    { id: "fan-standings", targetSelector: '[data-tour="dashboard-standings"]', title: "League Standings", category: "Season", description: "See the current standings and open a team hub." },
    { id: "fan-leaders", targetSelector: '[data-tour="league-leaders-section"]', title: "League Leaders", category: "Stats", description: "See the players at the top of key offensive and defensive categories.", details: [
      { label: "10 Categories", text: "Open the full league player leaderboards." },
    ] },
    { id: "fan-teams", targetSelector: '[data-tour="league-teams-grid"]', title: "Teams", category: "Teams", description: "Browse teams and open a team page for more information." },
  ],
};

export const SCHEDULE_WALKTHROUGH: ToolWalkthrough = {
  id: "league-schedule", toolName: "Game Schedule", subtitle: "Browse, build, and manage the season calendar",
  steps: [
    { id: "overview", targetSelector: "", title: "League Schedule", category: "Overview", description: "Find games by week, switch between the regular season and playoff views, and open any game to follow its details." },
    { id: "schedule-actions", targetSelector: '[data-tour="schedule-actions"]', title: "Schedule Tools", category: "Management", description: "League managers can build a full schedule, add an individual game, or clear the current calendar.", details: [
      { label: "Build Schedule", text: "Open the schedule builder to generate a balanced season and playoff fixtures." },
      { label: "Schedule Game", text: "Open the form to add one game with teams, date, time, and venue." },
      { label: "Clear schedule", text: "Start the clear-schedule confirmation. This removes scheduled games; review carefully before confirming." },
    ] },
    { id: "backup", targetSelector: '[data-tour="schedule-backup"]', title: "Schedule Recovery", category: "Management", description: "If a schedule was replaced recently, restore its saved copy or dismiss the recovery notice.", details: [
      { label: "Restore Schedule", text: "Bring back the previously archived schedule." },
      { label: "Dismiss", text: "Permanently dismiss the saved backup notice." },
    ] },
    { id: "schedule-views", targetSelector: '[data-tour="schedule-views"]', title: "Season Views", category: "Navigation", description: "Choose which part of the calendar to browse.", details: [
      { label: "Regular Season", text: "Show regular season games grouped by week." },
      { label: "Playoff Picture", text: "Show the projected playoff bracket and playoff games. The Projected badge marks the standings-based preview." },
      { label: "All Weeks", text: "Show games from every regular-season week." },
      { label: "Week button", text: "Filter the calendar to the selected week." },
    ] },
    { id: "games", targetSelector: '[data-tour="schedule-games"]', title: "Game Calendar", category: "Games", description: "Browse matchups, results, and game locations. Open a matchup for its box score or live play-by-play.", details: [
      { label: "Game matchup", text: "Open the game details page." },
      { label: "Watch Live / See Stats", text: "Open the play-by-play viewer, which also shows box score and team stats." },
      { label: "Edit Event", text: "Managers can change the selected game's details." },
      { label: "Delete Event", text: "Managers can remove a game from the schedule after confirmation." },
    ] },
  ],
};

export const STATS_WALKTHROUGH: ToolWalkthrough = {
  id: "league-stats", toolName: "Standings & Stats", subtitle: "Compare team records and player performance",
  steps: [
    { id: "overview", targetSelector: "", title: "Standings & Stats", category: "Overview", description: "Review league standings or explore player statistics from completed games." },
    { id: "stats-tabs", targetSelector: '[data-tour="stats-tabs"]', title: "Choose a View", category: "Navigation", description: "Switch between team records and individual player leaderboards.", details: [
      { label: "Team Standings", text: "Show league teams, records, points, and point differential." },
      { label: "Individual Stats", text: "Show player leaderboards and stat categories." },
    ] },
    { id: "standings", targetSelector: '[data-tour="stats-standings"]', title: "Team Standings Table", category: "Teams", description: "Compare wins, losses, ties, points scored, points allowed, and standings points. Select a sortable column heading to change the order.", details: [
      { label: "Team", text: "Open that team's hub." },
      { label: "Rank / Played / W / L / T", text: "Review each team's position and game record." },
      { label: "PF / PA / DIFF / PTS", text: "Compare points for, points against, point differential, and standings points." },
    ] },
    { id: "individual-stats", targetSelector: '[data-tour="stats-tabs"]', title: "Individual Player Stats", category: "Players", description: "Choose Individual Stats to switch from team standings to player leaders and the sortable player table.", details: [
      { label: "Passing / Receiving / Defense", text: "Choose which player stat group to display." },
      { label: "Leaders / Full Table", text: "Switch between top-three category cards and the sortable player table." },
      { label: "View Full [stat] Stats", text: "Open the full player table for that stat category." },
      { label: "Player / Team", text: "Sort by player or team; the team name opens that team's hub." },
      { label: "Rank / GP / Comp / Comp % / Pass TD / INT / PAT Conv", text: "In Passing, compare games, completions, completion rate, touchdowns, interceptions, and conversions." },
      { label: "Receptions / Rec TD / Rush Att / Rush TD", text: "In Receiving, compare catches, receiving touchdowns, carries, and rushing touchdowns." },
      { label: "Flags / INT / Def TD / Sacks / FFL / PBU / Safeties", text: "In Defense, compare defensive production and turnovers." },
      { label: "Stat headings", text: "Select a stat column to sort the table by that statistic." },
    ] },
    { id: "stats-season", targetSelector: '[data-tour="stats-season"]', title: "Switch Seasons", category: "Seasons", description: "Appears once the league has more than one season. Pick a past season to see its final standings and player stats, frozen exactly as they ended.", details: [
      { label: "Season", text: "Choose any season. The current season is marked (current) and updates live." },
      { label: "Back to current season", text: "Shown on the amber banner while you browse a past season; returns to the live standings." },
    ] },
    { id: "stats-history", targetSelector: '[data-tour="stats-tabs"]', title: "League History", category: "Seasons", description: "The History tab appears once a season has ended. It collects every season, champion, all-time leaders and career stats in one place.", details: [
      { label: "Seasons", text: "Each card shows the season's dates and champion. View final standings & stats opens that season." },
      { label: "All-time leaders", text: "Top three career totals in touchdowns, passing TDs, receptions, flag pulls and interceptions, including the live season." },
      { label: "Career stats", text: "Search for a player and select their name to see each season they played, which team they were on, and championships won." },
    ] },
  ],
};

export const TEAMS_DIRECTORY_WALKTHROUGH: ToolWalkthrough = {
  id: "league-teams-directory", toolName: "League Teams", subtitle: "Browse teams, rosters, players, and team results",
  steps: [
    { id: "overview", targetSelector: "", title: "League Teams", category: "Overview", description: "Browse teams and their rosters. League managers can also add teams and players, assign free agents, and update team details." },
    { id: "team-controls", targetSelector: '[data-tour="teams-controls"]', title: "Team Management", category: "Management", description: "Administrators can create teams, edit names, and review their team cards.", details: [
      { label: "Create Team", text: "Open the form to create a team." },
      { label: "Add Team to Subscription (+ $15/mo)", text: "Add a team slot to the league subscription." },
      { label: "Manage Subscription", text: "Open league settings to review subscription options." },
      { label: "Edit Name", text: "Change the selected team's name." },
      { label: "Delete Team", text: "Remove the selected team after confirming." },
      { label: "Save / Cancel", text: "Save the current team name or discard the edit." },
    ] },
    { id: "team-directory", targetSelector: '[data-tour="teams-directory"]', title: "Team Cards", category: "Teams", description: "Open a team to see its roster, performance, and upcoming games.", details: [
      { label: "Team card / View Team", text: "Select a team to open its details and roster." },
    ] },
    { id: "team-roster", targetSelector: '[data-tour="teams-roster"]', title: "Team Roster", category: "Players", description: "Review players on the selected team and use the available roster controls.", details: [
      { label: "Roster (+)", text: "Open the form to add a player to this team." },
      { label: "Player name", text: "Open the player's stats or profile when available." },
      { label: "Team selector", text: "Administrators can move a player to a different team." },
      { label: "Save / Cancel", text: "Keep or discard a roster assignment change." },
      { label: "Delete Player", text: "Administrators can remove the player after confirmation." },
    ] },
    { id: "free-agents", targetSelector: '[data-tour="teams-free-agents"]', title: "Free Agent Pool", category: "Players", description: "Find unassigned players and assign them to a team.", details: [
      { label: "Search players", text: "Filter the free agent list by a player's name." },
      { label: "ALL / QB / WR / RB / C / DB / RUSH / ATH", text: "Filter the pool by position." },
      { label: "Select Team...", text: "Choose which team should receive the free agent." },
      { label: "Assign", text: "Move the selected player onto the chosen team." },
      { label: "Delete Free Agent", text: "Remove this free agent from the pool." },
      { label: "Join As Free Agent / Submit Join Form", text: "Open the player registration form." },
    ] },
    { id: "team-results", targetSelector: '[data-tour="teams-results"]', title: "Team Stats & Results", category: "Season", description: "Review selected-team stats, top performers, and past or upcoming games." },
  ],
};

export const MATCH_BOX_SCORE_WALKTHROUGH: ToolWalkthrough = {
  id: "match-box-score", toolName: "Game Details", subtitle: "Review the matchup, score, box score, and play-by-play",
  steps: [
    { id: "overview", targetSelector: "", title: "Game Details & Box Score", category: "Overview", description: "This page brings together the matchup, current or final score, game administration, and the full play-by-play." },
    { id: "match-header", targetSelector: '[data-tour="match-header"]', title: "Matchup & Score", category: "Game", description: "Check the teams, season week, game time, venue, and current score." },
    { id: "match-admin", targetSelector: '[data-tour="match-admin"]', title: "Game Administration", category: "Management", description: "Authorized managers can edit the event or open the stat keeper.", details: [
      { label: "Edit Event", text: "Update this game's schedule details." },
      { label: "Delete Event", text: "Remove this event after confirming." },
      { label: "Simulate Game", text: "Platform administrators can generate sample game plays and a score." },
      { label: "Stat Keeper", text: "Open the live scorekeeping controls for an unfinished game." },
      { label: "Reopen Play-by-Play", text: "Reopen a completed demo game in its stat keeper." },
      { label: "Reset Game", text: "Reset a demo game to its pre-game state after confirmation." },
    ] },
    { id: "match-feed", targetSelector: '[data-tour="match-play-by-play"]', title: "Box Score & Play-by-Play", category: "Game", description: "Open the game viewer for the play timeline, player box score, and team stats.", details: [
      { label: "See Stats", text: "Open the game viewer for a completed game." },
      { label: "Watch Live", text: "Follow an active game in the live viewer." },
      { label: "Open Play-by-Play", text: "Open the game viewer before kickoff." },
    ] },
  ],
};

export const LIVE_VIEWER_WALKTHROUGH: ToolWalkthrough = {
  id: "live-game-viewer", toolName: "Live Game Viewer", subtitle: "Follow the score, live play log, box score, and team stats",
  steps: [
    { id: "overview", targetSelector: "", title: "Live Game Viewer", category: "Overview", description: "Follow the game without changing it. The scoreboard and game information update as plays are recorded." },
    { id: "viewer-header", targetSelector: '[data-tour="viewer-header"]', title: "Game Header", category: "Game", description: "Check the league, game status, season, location, and available navigation.", details: [
      { label: "Back to game", text: "Return to the game details page." },
      { label: "Open Live Manager", text: "For a demo league manager, open the live stat keeper." },
      { label: "Reset Match", text: "Reset a demo match after confirmation." },
    ] },
    { id: "viewer-scoreboard", targetSelector: '[data-tour="viewer-scoreboard"]', title: "Live Scoreboard", category: "Score", description: "See each team's score, possession, game period, and remaining timeouts. These controls are display-only." },
    { id: "viewer-tabs", targetSelector: '[data-tour="viewer-tabs"]', title: "Game View Tabs", category: "Game", description: "Choose the game information you want to follow.", details: [
      { label: "Play-by-Play", text: "Show the chronological play log." },
      { label: "Box Score", text: "Compare player statistics for each team." },
      { label: "Team Stats", text: "Compare the two teams' game totals." },
      { label: "Home / Away", text: "In the box score, switch between the home and away player lists." },
    ] },
  ],
};


export const PLAYOFF_FORMAT_MODAL_WALKTHROUGH: ToolWalkthrough = {
  id: "playoff-format-modal", toolName: "Playoff Format", subtitle: "Choose who qualifies and how the bracket works",
  steps: [
    { id: "overview", targetSelector: "", title: "Set the Playoff Format", category: "Overview", description: "Choose the playoff bracket style and how many teams qualify. The preview updates before you apply the change." },
    { id: "structure", targetSelector: '[data-tour="playoff-format-structure"]', title: "Elimination System", category: "Format", description: "Choose how teams are eliminated.", details: [
      { label: "Single Elim", text: "Set a knockout bracket where one loss eliminates a team." },
      { label: "Double Elim", text: "Use winners and losers brackets; teams leave the tournament after two losses." },
    ] },
    { id: "qualifiers", targetSelector: '[data-tour="playoff-format-qualifiers"]', title: "Playoff Qualifiers", category: "Teams", description: "Set the number of teams that qualify for the postseason.", details: [
      { label: "Playoff Qualifiers slider", text: "Drag to set the qualifying team count between 2 and the league's total teams." },
      { label: "2 Teams (Championship Only) / All teams", text: "These labels show the slider's minimum and maximum." },
    ] },
    { id: "presets", targetSelector: '[data-tour="playoff-format-presets"]', title: "Quick Presets", category: "Teams", description: "Choose a common qualifying team count with one click.", details: [
      { label: "N Teams / N Teams (Default) / All (N)", text: "Choose the qualifying count shown on a preset; the default and all-team options are labeled." },
    ] },
    { id: "preview", targetSelector: '[data-tour="playoff-format-preview"]', title: "Bracket Preview", category: "Preview", description: "Check the calculated rounds and byes before applying the format.", details: [
      { label: "Calculated Tournament Structure", text: "Review the bracket style and the number of rounds." },
      { label: "Upper Seed Byes", text: "See how many top seeds skip the opening round." },
    ] },
    { id: "actions", targetSelector: '[data-tour="playoff-format-actions"]', title: "Apply or Cancel", category: "Finish", description: "Keep the current format or save the new playoff settings.", details: [
      { label: "Cancel", text: "Close without changing the playoff format." },
      { label: "Apply Playoff Format", text: "Save the selected qualifying count and elimination style." },
    ] },
  ],
};

export const STAT_KEEPER_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper", toolName: "Stat Keeper", subtitle: "Run the clock and record each play as it happens",
  steps: [
    { id: "overview", targetSelector: "", title: "Live Stat Keeper", category: "Overview", description: "Use this screen to manage the game clock and score, keep down and possession accurate, and record plays. Logged plays update the game and viewer." },
    { id: "score-header", targetSelector: '[data-tour="score-header"]', title: "Scoreboard Header", category: "Game Status", description: "The header contains the game controls and live scoreboard.", details: [
      { label: "Back to match", text: "Return to the game details page without clearing the game." },
      { label: "Undo last play", text: "Reverse the most recent play and restore its score and game-state changes." },
      { label: "Call home team timeout", text: "Use one home timeout and stop the game clock." },
      { label: "Call away team timeout", text: "Use one away timeout and stop the game clock." },
      { label: "Fullscreen scoreboard", text: "Show a larger score display for the sideline or crowd." },
      { label: "Simulate full game", text: "Generate a sample game when this control is available to your role." },
      { label: "Reset game", text: "Return the game to pre-game after confirmation. This clears the current game state." },
    ] },
    { id: "game-clock", targetSelector: '[data-tour="game-clock-controls"]', title: "Game Clock & Down", category: "Clock", description: "Keep the period clock and current down accurate.", details: [
      { label: "Remove 10 seconds", text: "Subtract ten seconds from the game clock. Press and hold to adjust continuously." },
      { label: "Add 10 seconds", text: "Add ten seconds to the game clock. Press and hold to adjust continuously." },
      { label: "Start / Pause game clock", text: "Run or stop the game clock." },
      { label: "Decrease Down", text: "Correct the down by one." },
      { label: "Increase Down", text: "Correct the down by one." },
    ] },
    { id: "play-clock", targetSelector: '[data-tour="play-clock-controls"]', title: "Play Clock", category: "Clock", description: "Track the time between plays. The display warns as the play clock runs low.", details: [
      { label: "Start / Pause play clock", text: "Run or pause the between-plays clock." },
      { label: "Reset play clock", text: "Start the play clock again from its full duration." },
    ] },
    { id: "play-log", targetSelector: '[data-tour="play-log-btn"]', title: "Play Log & Spot Ball", category: "Review", description: "Review saved plays and set the next play's starting field position.", details: [
      { label: "Play Log", text: "Open the complete list of plays recorded in this game." },
      { label: "Spot the Ball", text: "Open field-position controls to set where the next play begins." },
    ] },
    { id: "play-entry", targetSelector: '[data-tour="play-type-selector"]', title: "Choose and Record a Play", category: "Logging", description: "Start with the play type, fill in the result and players, then save the play.", details: [
      { label: "PASS", text: "Start a pass play and choose a passer, receiver, result, and any defenders involved." },
      { label: "RUN", text: "Start a run play and choose a runner, result, and where the ball carrier was stopped." },
      { label: "PENALTY", text: "Open the penalty wizard and record the foul, enforcement, and down impact." },
      { label: "Down buttons", text: "Choose the current down before starting the play." },
      { label: "Passer / Runner", text: "Choose the offensive player who threw or carried the ball." },
      { label: "Receiver", text: "Choose the receiving player when the play calls for one." },
      { label: "Defender / Flagger", text: "Choose the defender or flagger involved in the result." },
      { label: "Save play result", text: "Choose the appropriate result button to save the play and update the game." },
    ], actionHint: "Choose PASS, RUN, or PENALTY to start a play." },
    { id: "play-result", targetSelector: '[aria-label="Save play result"]', title: "Finish the Play", category: "Logging", description: "Once the players and outcome are selected, choose the button that describes how the play ended.", details: [
      { label: "TOUCHDOWN", text: "Record a touchdown when the runner or receiver scores." },
      { label: "FIRST DOWN / SHORT OF LINE", text: "Record whether the play reached the line to gain." },
      { label: "PICK 6 / OOB / DOWNED", text: "Choose whether an interception was returned for a score or ended without one." },
      { label: "SAVE & NEXT DOWN", text: "Save a defensive stop or missed pass and advance the down." },
      { label: "Loss Of Yards / Safety", text: "Choose the result of a sack or flagrant foul." },
      { label: "OOB - FIRST DOWN / OOB - SHORT", text: "Choose the result when the ball carrier goes out of bounds." },
    ] },
    { id: "conversion", targetSelector: '[data-tour="conversion-controls"]', title: "Conversion Attempt", category: "Logging", description: "After a touchdown, record the conversion result and the players involved.", details: [
      { label: "1 Point / 2 Points", text: "Choose the value of the conversion attempt." },
      { label: "Good / No Good", text: "Record whether the attempt succeeded." },
      { label: "Passer / Runner", text: "Choose who attempted the conversion." },
      { label: "Receiver", text: "Choose the receiver for a passing conversion; this is optional." },
    ] },
    { id: "drawers", targetSelector: '[data-tour="scoreboard-drawers"]', title: "Play Log Drawer", category: "Review", description: "Review each logged play, including penalties, before closing the drawer and returning to scorekeeping." },
  ],
};

export const SCHEDULE_BUILDER_WALKTHROUGH: ToolWalkthrough = {
  id: "schedule-builder", toolName: "Schedule Builder", subtitle: "Create a balanced regular season and playoff schedule",
  steps: [
    { id: "overview", targetSelector: "", title: "Build a Season Schedule", category: "Overview", description: "Choose season dates, game days, fields, time slots, and playoff options. Review the generated schedule before applying it." },
    { id: "season-settings", targetSelector: '[data-tour="builder-season-settings"]', title: "Season Dates & Duration", category: "Season Setup", description: "Set how long the regular season runs and when it begins.", details: [
      { label: "Regular Season Duration", text: "Set the number of game weeks with the minus/plus buttons, number field, slider, or week dropdown." },
      { label: "Opening Day / Start Date", text: "Choose the date for Week 1. Later weeks are scheduled at weekly intervals." },
      
    ] },
    { id: "playoff-settings", targetSelector: '[data-tour="builder-playoffs"]', title: "Playoff Format", category: "Playoffs", description: "Choose the playoff bracket format and how many teams qualify." },
    { id: "venues-times", targetSelector: '[data-tour="builder-venues-times"]', title: "Fields & Kickoff Times", category: "Game Setup", description: "Set the fields and kickoff times available for games.", details: [
      { label: "Available Field Venues", text: "Review the fields that games can be assigned to." },
      { label: "Add venue or field name...", text: "Enter a field name, then choose + Add Field." },
      { label: "+ Add Field", text: "Add the entered field to the venue list." },
      { label: "Remove field", text: "Remove that venue from the builder's field list." },
      { label: "Kickoff Time Slots", text: "Review the kickoff times games can be assigned to." },
      { label: "Add time slot (e.g. '3:15 PM')...", text: "Enter a kickoff time, then choose + Add Time." },
      { label: "+ Add Time", text: "Add the entered time to the available slots." },
      { label: "Remove kickoff time", text: "Remove that kickoff time from the available slots." },
    ] },
    { id: "apply", targetSelector: '[data-tour="builder-actions"]', title: "Generate & Apply", category: "Finish", description: "Generate a preview, then decide whether to apply it to the league calendar.", details: [
      { label: "Cancel", text: "Close the builder without making a schedule." },
      { label: "Build Season Schedule", text: "Generate a schedule when there are no existing games." },
      { label: "Overwrite & Generate New Schedule", text: "Replace existing games with the newly generated schedule." },
      { label: "Close", text: "Close the completion screen after the schedule is built." },
      { label: "View Full Schedule & Bracket", text: "Close the builder and return to the calendar." },
      { label: "Overwrite & Generate New Schedule", text: "Replace the existing schedule with the generated fixtures. A recovery copy is kept for 24 hours." },
      { label: "Build Season Schedule", text: "Build the first schedule when no games currently exist." },
    ] },
  ],
};

export const QUICK_ADD_PLAYER_WALKTHROUGH: ToolWalkthrough = {
  id: "quick-add-player", toolName: "Add Player to Roster", subtitle: "Add a player to your team roster",
  steps: [
    { id: "overview", targetSelector: "", title: "Add a Player", category: "Overview", description: "Enter a player's name, jersey number, positions, and experience to add them to this team's roster." },
    { id: "player-fields", targetSelector: '[data-tour="quick-add-player-fields"]', title: "Player Details", category: "Roster", description: "Complete the player information before saving.", details: [
      { label: "Team", text: "Shows which team's roster will receive this player." },
      { label: "Athlete Full Name *", text: "Enter the player's name." },
      { label: "Jersey Number (0-99) *", text: "Enter a jersey number from 0 through 99." },
      { label: "Positions (Select all that apply)", text: "Select each position the player plays." },
      { label: "Experience Level", text: "Choose the player's experience level." },
    ] },
    { id: "player-actions", targetSelector: '[data-tour="quick-add-player-actions"]', title: "Save or Cancel", category: "Finish", description: "Save the player to the roster or close without adding them.", details: [
      { label: "Add Player", text: "Save the completed player details to the roster." },
      { label: "Cancel", text: "Close this form without adding a player." },
      { label: "Close", text: "Dismiss the dialog." },
    ] },
  ],
};

export const PLAY_LOG_DRAWER_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper-play-log", toolName: "Live Game Play Log", subtitle: "Review the plays recorded in this game",
  steps: [
    { id: "overview", targetSelector: "", title: "Live Game Play Log", category: "Overview", description: "Review each saved play in order, including its period, down, time, and play description." },
    { id: "play-log-list", targetSelector: '[data-tour="scoreboard-drawers"]', title: "Recorded Plays", category: "Review", description: "Scroll through the game log to verify results and penalty calls.", details: [
      { label: "Live Game Play Log", text: "The drawer title identifies the current game's log." },
      { label: "Close", text: "Close the play log and return to the stat keeper." },
      { label: "Play entry", text: "Each entry shows the half, down, game time, and plain-language result." },
    ] },
  ],
};

export const PENALTY_WIZARD_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper-penalty", toolName: "Penalty Wizard", subtitle: "Record the foul and apply its game impact",
  steps: [
    { id: "overview", targetSelector: "", title: "Record a Penalty", category: "Overview", description: "Choose which side committed the foul, select the infraction, and confirm its enforcement and effect on the down." },
    { id: "penalty-side", targetSelector: '[data-tour="penalty-side"]', title: "Choose the Team", category: "Penalty", description: "Start by selecting which side committed the infraction.", details: [
      { label: "Defense", text: "Record a foul committed by the defending team." },
      { label: "Offense", text: "Record a foul committed by the team with possession." },
      { label: "Back to Play Type", text: "Leave the penalty wizard and return to play selection." },
    ] },
    { id: "penalty-infraction", targetSelector: '[data-tour="penalty-infraction"]', title: "Select the Infraction", category: "Penalty", description: "Choose a penalty for the selected side, then continue to enforcement.", details: [
      { label: "Select infraction", text: "Choose the foul from the available penalties. The displayed yards and default down impact are pre-filled." },
      { label: "Continue to enforcement", text: "Review how the penalty is applied." },
      { label: "Back", text: "Return to the previous penalty step." },
    ] },
    { id: "penalty-enforcement", targetSelector: '[data-tour="penalty-enforcement"]', title: "Enforcement & Down Impact", category: "Penalty", description: "Choose how the foul is enforced and what happens to the down.", details: [
      { label: "Accepted / Declined / Offset", text: "Choose whether the penalty is enforced, declined, or offset with another foul." },
      { label: "5 Yds / 10 Yds / 15 Yds / Spot", text: "Set the penalty yardage." },
      { label: "Auto 1st / Replay / Loss Down", text: "Choose the down result." },
      { label: "Back to infraction", text: "Return to choose a different foul." },
      { label: "Continue to player", text: "Choose the responsible player, or leave responsibility with the team." },
    ] },
    { id: "penalty-player", targetSelector: '[data-tour="penalty-player"]', title: "Responsible Player & Apply", category: "Penalty", description: "Optionally identify the player responsible, review the generated call, and enforce it.", details: [
      { label: "TEAM Infraction", text: "Leave the foul assigned to the whole team." },
      { label: "Athlete responsible (optional)", text: "Choose a player to associate with the penalty." },
      { label: "Back to enforcement", text: "Return to review enforcement, yardage, and down impact." },
      { label: "Enforce penalty", text: "Save the penalty and apply its effect to the game." },
    ] },
  ],
};

export const SCHEDULE_EVENT_MODAL_WALKTHROUGH: ToolWalkthrough = {
  id: "schedule-event-form", toolName: "Schedule Game", subtitle: "Add or update a game on the league calendar",
  steps: [
    { id: "overview", targetSelector: "", title: "Schedule or Edit a Game", category: "Overview", description: "Enter the matchup, week, date, time, and venue. When editing an existing game, you can also update the score and status." },
    { id: "event-basics", targetSelector: '[data-tour="schedule-event-basics"]', title: "Matchup & Kickoff", category: "Game Details", description: "Set the teams and schedule details for this game.", details: [
      { label: "Week Title", text: "Choose the label used to group this game on the calendar." },
      { label: "Home Team", text: "Choose the home team. Playoff games can remain To be decided." },
      { label: "Away Team", text: "Choose the away team. Playoff games can remain To be decided." },
      { label: "Date", text: "Enter the game date, such as 2026-10-18." },
      { label: "Time", text: "Enter the kickoff time." },
      { label: "Location", text: "Enter the field or venue." },
    ] },
    { id: "event-score", targetSelector: '[data-tour="schedule-event-score"]', title: "Score & Status", category: "Game Details", description: "When editing a game, update its score and game status.", details: [
      { label: "Home Score", text: "Update the home team's score." },
      { label: "Away Score", text: "Update the away team's score." },
      { label: "Status", text: "Choose Scheduled, In Progress, or Completed." },
    ] },
    { id: "event-save", targetSelector: '[data-tour="schedule-event-actions"]', title: "Save or Close", category: "Finish", description: "Save your game details or close the form.", details: [
      { label: "Delete Event", text: "Remove this game from the calendar." },
      { label: "Cancel", text: "Close the form without saving changes." },
      { label: "Schedule Game", text: "Add the new game to the schedule." },
      { label: "Save Changes", text: "Save changes to an existing game." },
      { label: "Close", text: "Dismiss the game form." },
    ] },
  ],
};

export const MATCH_EDIT_MODAL_WALKTHROUGH: ToolWalkthrough = {
  id: "match-edit-event", toolName: "Edit Game Details", subtitle: "Update this matchup's schedule and result",
  steps: [
    { id: "overview", targetSelector: "", title: "Edit Game Details", category: "Overview", description: "Update the matchup information and, when needed, correct the score or status." },
    { id: "edit-fields", targetSelector: '[data-tour="match-edit-fields"]', title: "Game Information", category: "Game Details", description: "Edit the teams and kickoff details for this game.", details: [
      { label: "Week", text: "Change the week or round label." },
      { label: "Home Team", text: "Choose the home team." },
      { label: "Away Team", text: "Choose the away team." },
      { label: "Date", text: "Change the game date." },
      { label: "Time", text: "Change the kickoff time." },
      { label: "Location", text: "Change the field or venue." },
      { label: "Home Score / Away Score", text: "Correct the score recorded for each team." },
      { label: "Status", text: "Set the game to Scheduled, In Progress, or Completed." },
      { label: "Mark as Preseason Game", text: "Mark this matchup as a preseason event." },
    ] },
    { id: "edit-actions", targetSelector: '[data-tour="match-edit-actions"]', title: "Save or Cancel", category: "Finish", description: "Save the updated event or close without saving.", details: [
      { label: "Delete Event", text: "Remove the game from the schedule." },
      { label: "Cancel", text: "Close without saving your edits." },
      { label: "Save Changes", text: "Save the updated game details." },
      { label: "Close", text: "Dismiss the edit dialog." },
    ] },
  ],
};

export const RESET_GAME_MODAL_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper-reset", toolName: "Reset Game", subtitle: "Review what will be cleared before confirming",
  steps: [
    { id: "overview", targetSelector: "", title: "Reset the Game?", category: "Confirmation", description: "Resetting permanently deletes the game's live plays and stats, clears the score and clock, and returns the game to Scheduled." },
    { id: "reset-actions", targetSelector: '[data-tour="reset-game-actions"]', title: "Keep or Reset", category: "Confirmation", description: "Choose whether to leave the game unchanged or permanently reset it.", details: [
      { label: "Cancel / Keep Game", text: "Close this confirmation and keep the current game and its stats." },
      { label: "Permanently Reset", text: "Erase the live session and return the game to its pre-game state." },
    ] },
  ],
};

export const ADD_SUB_MODAL_WALKTHROUGH: ToolWalkthrough = {
  id: "stat-keeper-substitution", toolName: "Add Sub", subtitle: "Add an eligible player to a game roster",
  steps: [
    { id: "overview", targetSelector: "", title: "Add a Substitute", category: "Roster", description: "Choose the team, then choose a player who is not already in that team's game roster." },
    { id: "sub-team", targetSelector: '[data-tour="sub-modal-content"]', title: "Choose a Team or Player", category: "Roster", description: "Choose a side, then select the substitute to add.", details: [
      { label: "Home team name", text: "Show the available players for the home team." },
      { label: "Away team name", text: "Show the available players for the away team." },
      { label: "Back", text: "Return to choose the team." },
      { label: "Player name", text: "Add that player to the selected game's roster." },
      { label: "Close", text: "Dismiss the substitute picker." },
    ] },
  ],
};
