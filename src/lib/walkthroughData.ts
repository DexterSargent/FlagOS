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
{"id": "designer-overview", "targetSelector": "", "title": "Build and teach a play", "description": "Coaches can rename plays, position players and change assignments. Rostered players study a read-only view with playback, position notes and Coach Q&A. Open a tool first to guide its expanded controls."},
    {
      id: "studio-toolbar",
      targetSelector: '[data-testid="designer-toolbar"]',
      title: "Studio Toolbar",
      category: "Navigation",
      description: "The bar across the top of the designer handles everything about the play as a whole.",
      details: [
        { label: "Back to Plays", text: "Returns to the play list for this formation. Changes auto-save; check the save status before leaving." },
        { label: "Formation dropdown", text: "Changes this play's formation or category; it does not open a different play." },
        { label: "Coach Q&A", text: "Opens the coaching notes / question log your staff and players can read." },
        { label: "Save status", text: "Shows Saving… / Saved so you always know your changes are stored." },
        { label: "More (⋯) on phones", text: "On small screens the opponent look, coach notes, and Q&A live behind the ⋯ button so the field gets the room." },
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
        { label: "Situation", text: "Tags the play for a game situation (e.g. Red Zone, 3rd & Short) to explain when to call it." },
        { label: "Notes icon", text: "Adds a free-form coaching note to the play." },
        { label: "Q&A icon", text: "Opens questions and answers attached to this specific play." },
        { label: "Save playbook", text: "Shows save progress; click when changes are unsaved to sync them immediately." },
      ],
    },
    {
      id: "opponent-toggle",
      targetSelector: '[data-tour="opponent-toggle"]',
      title: "Show Opponent",
      category: "Field View",
      description: "Overlays the opposing side on the field so you can design against a look.",
      details: [
        { label: "Toggle", text: "Shows or hides the opposing side on the field; choose an opponent scheme to test the play against a particular look." },
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
        { label: "Reset / Clear Opponent", text: "Clears the chosen opposing scheme and restores the default alignment." },
        { label: "Close opponent plays", text: "Closes the scheme menu without clearing the selected look." },
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
      description: "This is where you build the play. Coaches can drag editable players, route points and zones here.",
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
      description: "One row of tools for the selected player. Buttons stay in place and grey out when they don't apply.",
      details: [
        { label: "Routes", text: "Opens the route library for the selected receiver." },
        { label: "Motion", text: "Adds or edits this player's pre-snap motion." },
        { label: "Draw / Done", text: "Enter draw mode to tap out a custom route; tap Done to finish." },
        { label: "Undo", text: "Removes only the last route node. The earlier nodes and pre-snap motion stay intact." },
        { label: "Clear", text: "Removes the selected player's route or assignment." },
        { label: "Notes", text: "Opens the install sheet: one note per position explaining their job on this play." },
        { label: "Save", text: "Saves the current route as a custom preset you can reuse on other plays." },
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
    {"id": "route-catalog", "targetSelector": "[data-tour=\"route-catalog\"]", "title": "Route Tree & Presets", "description": "Open Routes to guide the expanded catalog.", "details": [{"label": "Standard Route Tree", "text": "Tap a named route to apply it to the selected player; its description explains the path."}, {"label": "Custom Team Presets", "text": "Apply a route previously saved by your team."}, {"label": "Delete preset", "text": "Remove a saved team route when the delete control is available."}, {"label": "Save Current Route as Preset", "text": "Open the naming dialog for the selected player's route."}, {"label": "Position pills", "text": "Choose a different player without closing the catalog."}, {"label": "Close route catalog", "text": "Close the library without clearing the route."}]},
    {"id": "route-depth", "targetSelector": "[data-testid=\"route-depth-rail\"]", "title": "Route depth rail", "description": "The sideline rail changes the break depth of the selected preset route.", "details": [{"label": "Increase route depth / Decrease route depth", "text": "Move the break deeper or shallower by a yard."}, {"label": "Route depth in yards", "text": "Drag the rail or use arrow keys. Home and End choose its minimum and maximum."}]},
    {"id": "motion-options", "targetSelector": "[data-tour=\"motion-options\"]", "title": "Choose pre-snap motion", "description": "Open Motion to choose a named preset for the selected player.", "details": [{"label": "Motion preset buttons", "text": "Apply the named motion; the description explains its path."}, {"label": "Remove Motion", "text": "Clear this player's pre-snap motion."}, {"label": "Position pills", "text": "Choose which player receives the motion."}, {"label": "Close motion menu", "text": "Close the picker without choosing a different motion."}]},
    {"id": "man-matchup", "targetSelector": "[data-testid=\"man-coverage-controls\"]", "title": "Man coverage matchup", "description": "Choose Man with a defender selected to see these controls.", "details": [{"label": "1. Choose Receiver to Cover", "text": "Tap a receiver button or its circle on the field."}, {"label": "Inside Shade", "text": "Start with inside leverage."}, {"label": "Head Up", "text": "Line up directly over the receiver."}, {"label": "Outside Shade", "text": "Start with outside leverage."}]},
    {"id": "defensive-cushion", "targetSelector": "[data-testid=\"cushion-depth-controls\"]", "title": "Defensive cushion", "description": "Set the defender's starting distance from the receiver.", "details": [{"label": "Press / Tight / Standard / Soft / Deep", "text": "Choose a 1, 3, 5, 7 or 10 yard preset."}, {"label": "Decrease cushion depth / Increase cushion depth", "text": "Adjust one yard at a time."}, {"label": "Defensive cushion depth in yards", "text": "Drag the slider from 1 to 12 yards."}]},
    {
      id: "animation-controls",
      targetSelector: '[data-tour="play-animation-controls"]',
      title: "Play Animation",
      category: "Playback",
      description: "Watch the play run so you can check timing and spacing.",
      details: [
        { label: "Run Play / Pause / Replay", text: "Starts, pauses or replays the animation." },
        { label: "Reset", text: "Puts every player back at the pre-snap alignment." },
        { label: "Speed dropdown", text: "Choose 0.5x, 1x or 1.5x. Slow it down to teach timing." },
        { label: "Timeline slider", text: "Scrub to any moment of the play." },
      ],
      actionHint: "Press Run Play to watch your play.",
    },
  ],
};

export const PLAYBOOK_STUDIO_WALKTHROUGH: ToolWalkthrough = {
  "id": "playbook-studio",
  "toolName": "Playbook Studio",
  "subtitle": "This team's coaches create and edit plays; rostered players can study and print them without editing. Visitors and unrelated coaches cannot see this private material. Open a book, formation or play, then reopen Guide for the controls on that level.",
  "steps": [
    {
      "id": "studio-overview",
      "targetSelector": "",
      "title": "Books, formations and plays",
      "description": "This team's coaches create and edit plays; rostered players can study and print them without editing. Visitors and unrelated coaches cannot see this private material. Open a book, formation or play, then reopen Guide for the controls on that level."
    },
    {
      "id": "team-navigation",
      "targetSelector": "[data-tour=\"team-navigation\"]",
      "title": "Team navigation",
      "description": "Keep your place in the team portal.",
      "details": [
        {
          "label": "Overview / Home",
          "text": "Return to the team hub."
        },
        {
          "label": "Schedule / Games",
          "text": "Open the game schedule."
        },
        {
          "label": "Roster",
          "text": "Open players and depth charts."
        },
        {
          "label": "Stats",
          "text": "Open season leaders."
        },
        {
          "label": "Playbook / Plays",
          "text": "Return to this private studio."
        }
      ]
    },
    {
      "id": "playbook-access",
      "targetSelector": "[data-tour=\"playbook-access\"]",
      "title": "Private team material",
      "description": "Access depends on your relationship to this team.",
      "details": [
        {
          "label": "Back to Team",
          "text": "Return to the public team overview."
        },
        {
          "label": "Sign In",
          "text": "When offered, sign in with the email your coach linked to your roster record."
        }
      ]
    },
    {
      "id": "create-playbook-btn",
      "targetSelector": "[data-tour=\"create-playbook-btn\"]",
      "title": "Create a Playbook",
      "description": "Coaches start a separate collection for each side of the ball.",
      "details": [
        {
          "label": "Create a Playbook",
          "text": "Open the form for type, name, description and player count; it has its own Guide."
        }
      ]
    },
    {
      "id": "playbook-cards-grid",
      "targetSelector": "[data-tour=\"playbook-cards-grid\"]",
      "title": "Your playbooks",
      "description": "Each card shows its side, player count, description, formations and play count.",
      "details": [
        {
          "label": "Open / Playbook card",
          "text": "Open this playbook's formations."
        },
        {
          "label": "Edit playbook details",
          "text": "Coaches update the book's settings."
        },
        {
          "label": "Delete playbook",
          "text": "Authorized primary admins delete the book after confirmation."
        }
      ]
    },
    {
      "id": "create-formation-btn",
      "targetSelector": "[data-tour=\"create-formation-btn\"]",
      "title": "Create Formation",
      "description": "Coaches define an alignment before adding plays.",
      "details": [
        {
          "label": "Create Formation",
          "text": "Open the formation editor and its Guide."
        }
      ]
    },
    {
      "id": "formations-toolbar",
      "targetSelector": "[data-tour=\"formations-toolbar\"]",
      "title": "Formation navigation",
      "description": "Move between books and preview the opposition.",
      "details": [
        {
          "label": "All Playbooks",
          "text": "Return to the playbook list."
        },
        {
          "label": "Edit playbook details",
          "text": "Open the selected book's settings."
        },
        {
          "label": "Show / Hide Opposing Defense / Offense",
          "text": "Toggle the opposing side in formation previews."
        },
        {
          "label": "Add Formation",
          "text": "Coaches open a new formation alignment."
        }
      ]
    },
    {
      "id": "formation-cards-grid",
      "targetSelector": "[data-tour=\"formation-cards-grid\"]",
      "title": "Formation cards",
      "description": "The preview shows the pre-snap positions.",
      "details": [
        {
          "label": "Formation card",
          "text": "Open the plays in this formation."
        },
        {
          "label": "Edit player alignment spots",
          "text": "Coaches reopen the alignment designer."
        },
        {
          "label": "Delete formation",
          "text": "Authorized admins remove this formation after confirmation."
        }
      ]
    },
    {
      "id": "plays-navigation",
      "targetSelector": "[data-tour=\"plays-navigation\"]",
      "title": "Formation plays",
      "description": "Return to the parent level or edit the book.",
      "details": [
        {
          "label": "Formations",
          "text": "Return to this book's formations."
        },
        {
          "label": "Edit playbook details",
          "text": "Open playbook settings when the pencil is available."
        }
      ]
    },
    {
      "id": "new-play-btn",
      "targetSelector": "[data-tour=\"new-play-btn\"]",
      "title": "New Play",
      "description": "Coaches create a play in the selected formation.",
      "details": [
        {
          "label": "New Play",
          "text": "Open a blank play in the designer. Its Guide explains routes, coverage and playback."
        }
      ]
    },
    {
      "id": "play-cards-grid",
      "targetSelector": "[data-tour=\"play-cards-grid\"]",
      "title": "Choose a play",
      "description": "Mini diagrams let players review the play before opening it.",
      "details": [
        {
          "label": "Play card",
          "text": "Coaches open the editor; players open the read-only viewer."
        },
        {
          "label": "Move to formation",
          "text": "Coaches move the play to another formation using the dropdown."
        },
        {
          "label": "Duplicate",
          "text": "Make an editable copy of the play."
        },
        {
          "label": "Delete",
          "text": "Authorized admins remove the play after confirmation."
        }
      ]
    },
    {
      "id": "print-armband-btn",
      "targetSelector": "[data-tour=\"print-armband-btn\"]",
      "title": "Print Armbands",
      "description": "Build paper references for game day.",
      "details": [
        {
          "label": "Print Armbands",
          "text": "Open Armband Inserts, Gameday Call Sheet or Complete Playbook; the print dialog has its own Guide."
        }
      ]
    },
    {
      "id": "autosave-status",
      "targetSelector": "[data-tour=\"autosave-status\"]",
      "title": "Save status",
      "description": "Coaches should check this before leaving after an edit.",
      "details": [
        {
          "label": "Saved / Saving...",
          "text": "Your book has synced or is syncing."
        },
        {
          "label": "Unsaved changes / Unsaved",
          "text": "Click the status to try syncing now."
        },
        {
          "label": "Offline",
          "text": "Changes cannot reach the server yet; wait for a connection."
        }
      ]
    }
  ]
};

export const TEAM_ROSTER_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-roster",
  "toolName": "Team Roster",
  "subtitle": "Everyone can view the roster and recorded player stats. Coaches can add and edit players; deletion is restricted to authorized primary admins. Depth charts are coach-only until shared with rostered players.",
  "steps": [
    {
      "id": "roster-overview",
      "targetSelector": "",
      "title": "Meet the roster",
      "description": "Everyone can view the roster and recorded player stats. Coaches can add and edit players; deletion is restricted to authorized primary admins. Depth charts are coach-only until shared with rostered players."
    },
    {
      "id": "team-navigation",
      "targetSelector": "[data-tour=\"team-navigation\"]",
      "title": "Move around your team",
      "description": "The same navigation follows you through the team portal.",
      "details": [
        {
          "label": "Overview / Home",
          "text": "Return to the team overview."
        },
        {
          "label": "Schedule / Games",
          "text": "See upcoming games and past results."
        },
        {
          "label": "Roster",
          "text": "See players and, when shared, depth charts."
        },
        {
          "label": "Stats",
          "text": "See season leaders."
        },
        {
          "label": "Playbook / Plays",
          "text": "Open private plays if you coach this team or are on its roster."
        },
        {
          "label": "Guide",
          "text": "Open the guide for the current page or dialog."
        },
        {
          "label": "Theme",
          "text": "Switch the site appearance; other site controls depend on your sign-in."
        }
      ]
    },
    {
      "id": "add-player-btn",
      "targetSelector": "[data-tour=\"add-player-btn\"]",
      "title": "Add a teammate",
      "description": "Coaches add roster records and link a player's sign-in emails.",
      "details": [
        {
          "label": "Add Player",
          "text": "Open the player form and its own Guide."
        },
        {
          "label": "Roster Full",
          "text": "The roster limit prevents another addition."
        }
      ]
    },
    {
      "id": "roster-tabs",
      "targetSelector": "[data-tour=\"roster-tabs\"]",
      "title": "Choose the view",
      "description": "Switch between the player table and positional lineups.",
      "details": [
        {
          "label": "Roster Table",
          "text": "Show the full list of players."
        },
        {
          "label": "Depth Chart",
          "text": "Open formation-based depth charts."
        },
        {
          "label": "Show Stats / Hide Stats",
          "text": "Show or hide season stat columns in the current view."
        }
      ]
    },
    {
      "id": "roster-list-table",
      "targetSelector": "[data-tour=\"roster-list-table\"]",
      "title": "Player table",
      "description": "Scroll sideways on a phone to see more columns.",
      "details": [
        {
          "label": "Player name",
          "text": "Open that player's season totals."
        },
        {
          "label": "View Player Stats",
          "text": "The activity icon opens the same stats dialog."
        },
        {
          "label": "Edit Player Details",
          "text": "Coaches change name, jersey number, linked emails and positions."
        },
        {
          "label": "Remove Player from Team",
          "text": "Authorized admins remove the player after confirmation."
        },
        {
          "label": "GP / Pass TD / Rec TD / Flags / INT",
          "text": "Extra columns appear with Show Stats; these summarize recorded games."
        }
      ]
    },
    {
      "id": "depth-chart-section",
      "targetSelector": "[data-tour=\"depth-chart-section\"]",
      "title": "Depth charts",
      "description": "Choose a named chart to view its lineup. Changes use buttons and dropdowns, not drag-and-drop.",
      "details": [
        {
          "label": "Chart buttons",
          "text": "Switch between saved depth charts."
        },
        {
          "label": "Allow rostered players to view depth charts",
          "text": "Coaches decide whether their players can see the lineups."
        },
        {
          "label": "Save Depth Charts",
          "text": "Persist edits and visibility changes; unsaved edits are not published."
        },
        {
          "label": "Retry depth charts",
          "text": "Reload if depth-chart loading failed."
        }
      ]
    },
    {
      "id": "depth-chart-creation",
      "targetSelector": "[data-tour=\"depth-chart-section\"] fieldset",
      "title": "Create a chart",
      "description": "Coaches can build up to 20 charts from available formations.",
      "details": [
        {
          "label": "Chart name",
          "text": "Name the lineup."
        },
        {
          "label": "Formation",
          "text": "Choose its positions from a playbook formation or a default formation."
        },
        {
          "label": "Create Depth Chart",
          "text": "Add the chart, then use Save Depth Charts to store it."
        }
      ]
    },
    {
      "id": "depth-chart-lineup",
      "targetSelector": "[data-tour=\"depth-chart-section\"] [role=\"group\"]",
      "title": "Set the player order",
      "description": "The first name at each position is the starter.",
      "details": [
        {
          "label": "Add player to [position]",
          "text": "Choose a rostered player for that position."
        },
        {
          "label": "Move up / Move down",
          "text": "Raise or lower a player's priority."
        },
        {
          "label": "Remove player",
          "text": "Remove this assignment, not the roster record."
        },
        {
          "label": "Delete chart",
          "text": "Delete the selected lineup, then save the depth charts."
        }
      ]
    }
  ]
};

export const TEAM_HUB_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-hub",
  "toolName": "Team Hub",
  "subtitle": "Players and visitors can browse the team, schedule, roster and stats. This team's coaches can edit its identity, manage staff and schedule games; private playbooks are for its coaches and rostered players.",
  "steps": [
    {
      "id": "hub-overview",
      "targetSelector": "",
      "title": "Your team at a glance",
      "description": "Players and visitors can browse the team, schedule, roster and stats. This team's coaches can edit its identity, manage staff and schedule games; private playbooks are for its coaches and rostered players."
    },
    {
      "id": "team-navigation",
      "targetSelector": "[data-tour=\"team-navigation\"]",
      "title": "Move around your team",
      "description": "The same navigation follows you through the team portal.",
      "details": [
        {
          "label": "Overview / Home",
          "text": "Return to the team overview."
        },
        {
          "label": "Schedule / Games",
          "text": "See upcoming games and past results."
        },
        {
          "label": "Roster",
          "text": "See players and, when shared, depth charts."
        },
        {
          "label": "Stats",
          "text": "See season leaders."
        },
        {
          "label": "Playbook / Plays",
          "text": "Open private plays if you coach this team or are on its roster."
        },
        {
          "label": "Guide",
          "text": "Open the guide for the current page or dialog."
        },
        {
          "label": "Theme",
          "text": "Switch the site appearance; other site controls depend on your sign-in."
        }
      ]
    },
    {
      "id": "team-header-identity",
      "targetSelector": "[data-tour=\"team-header-identity\"]",
      "title": "Team identity",
      "description": "Your name, logo and colours identify the team.",
      "details": [
        {
          "label": "Add Logo / Change Logo",
          "text": "Coaches open Edit Team Details to upload or change the emblem."
        }
      ]
    },
    {
      "id": "team-schedule-game-btn",
      "targetSelector": "[data-tour=\"team-schedule-game-btn\"]",
      "title": "Schedule Game",
      "description": "Coaches can create an untimed exhibition game against a custom opponent.",
      "details": [
        {
          "label": "Schedule Game",
          "text": "Open the scheduling dialog; use its own Guide for every field."
        }
      ]
    },
    {
      "id": "team-staff-btn",
      "targetSelector": "[data-tour=\"team-staff-btn\"]",
      "title": "Coaches & Admins",
      "description": "Manage the people who help run this team.",
      "details": [
        {
          "label": "Coaches & Admins",
          "text": "Open the staff dialog. Only the primary admin can remove staff."
        }
      ]
    },
    {
      "id": "edit-team-btn",
      "targetSelector": "[data-tour=\"edit-team-btn\"]",
      "title": "Edit Team Info",
      "description": "Coaches can update the team's public identity.",
      "details": [
        {
          "label": "Edit Team Info",
          "text": "Open the name, shortcode, colours and logo editor. Its Guide explains the form."
        }
      ]
    },
    {
      "id": "team-archive",
      "targetSelector": "[data-tour=\"team-archive\"]",
      "title": "Conclude or reopen a season",
      "description": "Only independent non-demo teams show these season controls.",
      "details": [
        {
          "label": "Conclude & Archive Season",
          "text": "Freeze roster, schedule and stats editing for the completed season."
        },
        {
          "label": "Reopen Season",
          "text": "Restore editing for an archived team season."
        }
      ]
    },
    {
      "id": "team-record-badge",
      "targetSelector": "[data-tour=\"team-record-badge\"]",
      "title": "Record and team stats",
      "description": "Headline numbers summarize the team's season.",
      "details": [
        {
          "label": "Customize Stats",
          "text": "Choose which recorded numbers are displayed, without changing the underlying stats."
        },
        {
          "label": "Choose stats to show",
          "text": "When no stats are selected, reopen the customizer to choose some."
        }
      ]
    },
    {
      "id": "team-stats-retry",
      "targetSelector": "[data-tour=\"team-stats-retry\"]",
      "title": "Stats not loading?",
      "description": "A failed stats request does not mean your stats were erased.",
      "details": [
        {
          "label": "Retry",
          "text": "Try loading the team summary again."
        }
      ]
    },
    {
      "id": "team-quick-links",
      "targetSelector": "[data-tour=\"team-quick-links\"]",
      "title": "Choose your next stop",
      "description": "Large cards take you straight to the main team areas.",
      "details": [
        {
          "label": "Schedule",
          "text": "Upcoming games and completed results."
        },
        {
          "label": "Roster",
          "text": "Player list and depth charts."
        },
        {
          "label": "Stat Leaders",
          "text": "Offensive and defensive season leaders."
        },
        {
          "label": "Playbooks",
          "text": "Private formations and plays, visible only to this team's coaches and rostered players."
        }
      ]
    }
  ]
};


export const TEAM_SCHEDULE_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-schedule",
  "toolName": "Team Schedule",
  "subtitle": "Players and visitors can watch games and review results. Coaches can schedule and track games. Only authorized primary admins can delete events; archived seasons are read-only.",
  "steps": [
    {
      "id": "schedule-overview",
      "targetSelector": "",
      "title": "Follow your season",
      "description": "Players and visitors can watch games and review results. Coaches can schedule and track games. Only authorized primary admins can delete events; archived seasons are read-only."
    },
    {
      "id": "team-navigation",
      "targetSelector": "[data-tour=\"team-navigation\"]",
      "title": "Move around your team",
      "description": "The same navigation follows you through the team portal.",
      "details": [
        {
          "label": "Overview / Home",
          "text": "Return to the team overview."
        },
        {
          "label": "Schedule / Games",
          "text": "See upcoming games and past results."
        },
        {
          "label": "Roster",
          "text": "See players and, when shared, depth charts."
        },
        {
          "label": "Stats",
          "text": "See season leaders."
        },
        {
          "label": "Playbook / Plays",
          "text": "Open private plays if you coach this team or are on its roster."
        },
        {
          "label": "Guide",
          "text": "Open the guide for the current page or dialog."
        },
        {
          "label": "Theme",
          "text": "Switch the site appearance; other site controls depend on your sign-in."
        }
      ]
    },
    {
      "id": "team-schedule-actions",
      "targetSelector": "[data-tour=\"team-schedule-actions\"]",
      "title": "Schedule a game",
      "description": "Team-created games are untimed and support a custom opponent.",
      "details": [
        {
          "label": "Schedule Game",
          "text": "Open the exhibition scheduling form and its Guide."
        }
      ]
    },
    {
      "id": "team-upcoming",
      "targetSelector": "[data-tour=\"team-upcoming\"]",
      "title": "Upcoming and active games",
      "description": "Each card shows the opponent, date, start time and venue.",
      "details": [
        {
          "label": "Record Stats",
          "text": "Coaches open the clockless stat keeper for an untimed game."
        },
        {
          "label": "Track Game",
          "text": "Coaches open timed tracking for a league game."
        },
        {
          "label": "Watch Game",
          "text": "Players and visitors follow game activity without editing."
        },
        {
          "label": "Delete Event",
          "text": "Authorized admins remove a scheduled event after confirmation."
        },
        {
          "label": "LIVE NOW / PAUSED / Untimed",
          "text": "These badges show activity and whether a clock is used."
        }
      ]
    },
    {
      "id": "team-past-results",
      "targetSelector": "[data-tour=\"team-past-results\"]",
      "title": "Past Results & Box Scores",
      "description": "Completed games show your score, the opponent's score and the result.",
      "details": [
        {
          "label": "Result card",
          "text": "Open the game recap or untimed stat keeper."
        },
        {
          "label": "Delete Event",
          "text": "Authorized admins can remove an event after confirmation; check carefully before deleting."
        }
      ]
    }
  ]
};


export const TEAM_STATS_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-stats",
  "toolName": "Team Stat Leaders",
  "subtitle": "Coaches, players and visitors can compare the team's top three players in each category. Only completed, non-hidden games with tracked plays contribute here; this page does not edit stats.",
  "steps": [
    {
      "id": "stats-overview",
      "targetSelector": "",
      "title": "Season leaders",
      "description": "Coaches, players and visitors can compare the team's top three players in each category. Only completed, non-hidden games with tracked plays contribute here; this page does not edit stats."
    },
    {
      "id": "team-navigation",
      "targetSelector": "[data-tour=\"team-navigation\"]",
      "title": "Move around your team",
      "description": "The same navigation follows you through the team portal.",
      "details": [
        {
          "label": "Overview / Home",
          "text": "Return to the team overview."
        },
        {
          "label": "Schedule / Games",
          "text": "See upcoming games and past results."
        },
        {
          "label": "Roster",
          "text": "See players and, when shared, depth charts."
        },
        {
          "label": "Stats",
          "text": "See season leaders."
        },
        {
          "label": "Playbook / Plays",
          "text": "Open private plays if you coach this team or are on its roster."
        },
        {
          "label": "Guide",
          "text": "Open the guide for the current page or dialog."
        },
        {
          "label": "Theme",
          "text": "Switch the site appearance; other site controls depend on your sign-in."
        }
      ]
    },
    {
      "id": "team-stats-summary",
      "targetSelector": "[data-tour=\"team-stats-summary\"]",
      "title": "Season snapshot",
      "description": "The header identifies the team and counts completed games. Leaders below require tracked plays.",
      "details": [
        {
          "label": "Season Leaderboards",
          "text": "These are season totals, not live game statistics."
        },
        {
          "label": "Completed games",
          "text": "The count summarizes completed games contributing to the season."
        },
        {
          "label": "No stats yet",
          "text": "Complete a game with recorded plays to populate leaders."
        }
      ]
    },
    {
      "id": "team-stats-offense",
      "targetSelector": "[data-tour=\"team-stats-offense\"]",
      "title": "Offense leaders",
      "description": "Each card ranks up to three players with a positive recorded total.",
      "details": [
        {
          "label": "Total Touchdowns",
          "text": "Rushing, receiving and defensive scoring credits."
        },
        {
          "label": "Passing TDs",
          "text": "Touchdown passes thrown."
        },
        {
          "label": "Completions",
          "text": "Completed passes by the quarterback."
        },
        {
          "label": "Receptions",
          "text": "Completed catches."
        },
        {
          "label": "Receiving TDs",
          "text": "Touchdown catches."
        },
        {
          "label": "Rushing TDs",
          "text": "Touchdowns scored on a run."
        }
      ]
    },
    {
      "id": "team-stats-defense",
      "targetSelector": "[data-tour=\"team-stats-defense\"]",
      "title": "Defense leaders",
      "description": "Read the first-place total and compare the bars beneath it.",
      "details": [
        {
          "label": "Flags Pulled",
          "text": "Credited flag pulls, including sacks where counted."
        },
        {
          "label": "Sacks",
          "text": "Quarterback sacks."
        },
        {
          "label": "Interceptions",
          "text": "Intercepted passes."
        },
        {
          "label": "Pass Breakups",
          "text": "Credited passes defended without an interception."
        },
        {
          "label": "No recorded stats yet",
          "text": "Nobody has a positive total in this category."
        }
      ]
    },
    {
      "id": "team-stats-error",
      "targetSelector": "[data-tour=\"team-stats-error\"]",
      "title": "Recover from a loading error",
      "description": "If the stats could not load, try again rather than entering replacement data.",
      "details": [
        {
          "label": "Retry",
          "text": "Reload the stats request."
        },
        {
          "label": "Back to Team",
          "text": "Return to the team overview."
        }
      ]
    }
  ]
};

export const TEAM_EDIT_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-edit",
  "toolName": "Edit Team Details",
  "subtitle": "Team coaches can change the public team identity. Changes take effect after Save Changes; Cancel or Close leaves the form without saving.",
  "steps": [
    {
      "id": "edit-overview",
      "targetSelector": "",
      "title": "Update the team identity",
      "description": "Team coaches can change the public team identity. Changes take effect after Save Changes; Cancel or Close leaves the form without saving."
    },
    {
      "id": "team-edit-names",
      "targetSelector": "[data-tour=\"team-edit-names\"]",
      "title": "Name and abbreviation",
      "description": "Use names your players will recognize.",
      "details": [
        {
          "label": "Team Name",
          "text": "The required public team name."
        },
        {
          "label": "Shortcode (Abbreviation)",
          "text": "Up to five characters for scoreboards, tables and badges."
        }
      ]
    },
    {
      "id": "team-edit-colours",
      "targetSelector": "[data-tour=\"team-edit-colours\"]",
      "title": "Team Colours",
      "description": "Pick a preset or tune each colour.",
      "details": [
        {
          "label": "Quick Colour Presets",
          "text": "Apply one of the named palettes."
        },
        {
          "label": "Primary Colour",
          "text": "Choose a colour with the picker or enter a six-digit hex code."
        },
        {
          "label": "Secondary Colour",
          "text": "Set the secondary accent with either input."
        },
        {
          "label": "Tertiary Colour",
          "text": "Set highlights with the picker or hex field."
        }
      ]
    },
    {
      "id": "team-edit-logo",
      "targetSelector": "[data-tour=\"team-edit-logo\"]",
      "title": "Team Logo & Emblem",
      "description": "Preview your logo before saving.",
      "details": [
        {
          "label": "Upload Logo from Device",
          "text": "Choose a logo image from your device."
        },
        {
          "label": "Remove Custom Logo",
          "text": "Clear the uploaded or linked logo."
        },
        {
          "label": "Or Paste Image URL (Optional)",
          "text": "Use a hosted image instead of uploading."
        },
        {
          "label": "Or Choose Vector Icon (when no image uploaded)",
          "text": "Pick a named emblem when no custom image is used."
        },
        {
          "label": "Customize Stats",
          "text": "Leave this editor and open the separate stats display customizer."
        }
      ]
    },
    {
      "id": "team-edit-save",
      "targetSelector": "[data-tour=\"team-edit-save\"]",
      "title": "Finish editing",
      "description": "Check the preview and fields first.",
      "details": [
        {
          "label": "Cancel",
          "text": "Close without saving these edits."
        },
        {
          "label": "Save Changes / Saving...",
          "text": "Save the new team details; wait for the operation to finish."
        },
        {
          "label": "Close",
          "text": "The X at the top also dismisses the editor."
        }
      ]
    }
  ]
};


export const TEAM_STAFF_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-staff",
  "toolName": "Coaches & Team Admins",
  "subtitle": "Authorized team admins can invite coaches. Only the primary team admin can remove other admins; the first coach keeps primary ownership.",
  "steps": [
    {
      "id": "staff-overview",
      "targetSelector": "",
      "title": "Share team management",
      "description": "Authorized team admins can invite coaches. Only the primary team admin can remove other admins; the first coach keeps primary ownership."
    },
    {
      "id": "team-staff-permissions",
      "targetSelector": "[data-tour=\"team-staff-permissions\"]",
      "title": "Understand access",
      "description": "A person can have multiple connected sign-in emails.",
      "details": [
        {
          "label": "Manage my connected emails",
          "text": "Open your account to connect verified sign-in addresses."
        },
        {
          "label": "Primary Admin (Head Coach)",
          "text": "Identifies the account with deletion privileges."
        }
      ]
    },
    {
      "id": "team-staff-list",
      "targetSelector": "[data-tour=\"team-staff-list\"]",
      "title": "Current Team Admins",
      "description": "People are listed once with their sign-in addresses.",
      "details": [
        {
          "label": "Remove",
          "text": "Primary admins revoke a non-primary coach's access; check the confirmation."
        },
        {
          "label": "Email addresses",
          "text": "These are the sign-in addresses connected to each admin."
        }
      ]
    },
    {
      "id": "team-staff-invite",
      "targetSelector": "[data-tour=\"team-staff-invite\"]",
      "title": "Invite another coach",
      "description": "Use the email they will sign in with.",
      "details": [
        {
          "label": "Add Coach as Team Admin",
          "text": "Enter the new coach's email."
        },
        {
          "label": "Add Admin",
          "text": "Grant team management access; wait for the success or error message."
        },
        {
          "label": "Close",
          "text": "The X dismisses the staff dialog."
        }
      ]
    }
  ]
};


export const TEAM_SCHEDULE_GAME_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-schedule-game",
  "toolName": "Schedule Exhibition Game",
  "subtitle": "Coaches can schedule a game against an opponent outside the league. These games use halves, not clocks or timeouts.",
  "steps": [
    {
      "id": "schedule-game-overview",
      "targetSelector": "",
      "title": "Create an untimed game",
      "description": "Coaches can schedule a game against an opponent outside the league. These games use halves, not clocks or timeouts."
    },
    {
      "id": "team-game-opponent",
      "targetSelector": "[data-tour=\"team-game-opponent\"]",
      "title": "Opponent and hosting",
      "description": "Name the other side and decide who is home.",
      "details": [
        {
          "label": "Opponent Team Name",
          "text": "Enter the required opponent name."
        },
        {
          "label": "Home Team",
          "text": "Make your team the home side."
        },
        {
          "label": "Away / Visiting Team",
          "text": "Make your team the visiting side."
        }
      ]
    },
    {
      "id": "team-game-details",
      "targetSelector": "[data-tour=\"team-game-details\"]",
      "title": "When and where",
      "description": "Choose the details players will see on the schedule.",
      "details": [
        {
          "label": "Game Type",
          "text": "Choose Regular season, Playoff game or Championship game."
        },
        {
          "label": "Date",
          "text": "Set the game date."
        },
        {
          "label": "Time",
          "text": "Set the advertised start time even though tracking is untimed."
        },
        {
          "label": "Field / Venue Location",
          "text": "Enter the meeting location; blank uses Field 1."
        }
      ]
    },
    {
      "id": "team-game-save",
      "targetSelector": "[data-tour=\"team-game-save\"]",
      "title": "Confirm the matchup",
      "description": "Check the date and opponent before creating the game.",
      "details": [
        {
          "label": "Confirm & Schedule Game / Scheduling...",
          "text": "Save the game and return to the schedule."
        },
        {
          "label": "Close",
          "text": "The X closes without creating a game."
        }
      ]
    }
  ]
};


export const TEAM_ADD_PLAYER_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-add-player",
  "toolName": "Add Player",
  "subtitle": "Coaches manage roster records and linked player sign-ins. Private emails are not public roster information. Close or Cancel leaves without saving.",
  "steps": [
    {
      "id": "team-add-player-overview",
      "targetSelector": "",
      "title": "Add Player",
      "description": "Coaches manage roster records and linked player sign-ins. Private emails are not public roster information. Close or Cancel leaves without saving."
    },
    {
      "id": "team-add-player-identity",
      "targetSelector": "[data-tour=\"team-add-player-identity\"]",
      "title": "Player identity",
      "description": "Use the name and jersey number you want displayed on the roster.",
      "details": [
        {
          "label": "Player Name *",
          "text": "Enter the required player name."
        },
        {
          "label": "Jersey Number",
          "text": "Set a jersey number; check for duplicates on your roster."
        }
      ]
    },
    {
      "id": "team-add-player-access",
      "targetSelector": "[data-tour=\"team-add-player-access\"]",
      "title": "Player sign-in and positions",
      "description": "Link the right person and mark the positions they can play.",
      "details": [
        {
          "label": "Player Emails",
          "text": "Enter one or more sign-in emails separated by commas; linked players can access their team playbook and stats."
        },
        {
          "label": "Positions (select all that apply)",
          "text": "Toggle position buttons, keeping at least one and no more than ten selected."
        }
      ]
    },
    {
      "id": "team-add-player-save",
      "targetSelector": "[data-tour=\"team-add-player-save\"]",
      "title": "Save the player",
      "description": "Review names and emails carefully.",
      "details": [
        {
          "label": "Cancel",
          "text": "Close the form without saving."
        },
        {
          "label": "Add Player",
          "text": "Save this roster record; the button shows progress while saving."
        },
        {
          "label": "Close",
          "text": "The X at the top dismisses the form."
        }
      ]
    }
  ]
};


export const TEAM_EDIT_PLAYER_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-edit-player",
  "toolName": "Edit Player Details",
  "subtitle": "Coaches manage roster records and linked player sign-ins. Private emails are not public roster information. Close or Cancel leaves without saving.",
  "steps": [
    {
      "id": "team-edit-player-overview",
      "targetSelector": "",
      "title": "Edit Player Details",
      "description": "Coaches manage roster records and linked player sign-ins. Private emails are not public roster information. Close or Cancel leaves without saving."
    },
    {
      "id": "team-edit-player-identity",
      "targetSelector": "[data-tour=\"team-edit-player-identity\"]",
      "title": "Player identity",
      "description": "Use the name and jersey number you want displayed on the roster.",
      "details": [
        {
          "label": "Player Name *",
          "text": "Enter the required player name."
        },
        {
          "label": "Jersey Number",
          "text": "Set a jersey number; check for duplicates on your roster."
        }
      ]
    },
    {
      "id": "team-edit-player-access",
      "targetSelector": "[data-tour=\"team-edit-player-access\"]",
      "title": "Player sign-in and positions",
      "description": "Link the right person and mark the positions they can play.",
      "details": [
        {
          "label": "Player Emails",
          "text": "Enter one or more sign-in emails separated by commas; linked players can access their team playbook and stats."
        },
        {
          "label": "Positions (select all that apply)",
          "text": "Toggle position buttons, keeping at least one and no more than ten selected."
        }
      ]
    },
    {
      "id": "team-edit-player-save",
      "targetSelector": "[data-tour=\"team-edit-player-save\"]",
      "title": "Save the player",
      "description": "Review names and emails carefully.",
      "details": [
        {
          "label": "Cancel",
          "text": "Close the form without saving."
        },
        {
          "label": "Save Details",
          "text": "Save this roster record; the button shows progress while saving."
        },
        {
          "label": "Close",
          "text": "The X at the top dismisses the form."
        }
      ]
    }
  ]
};


export const TEAM_PLAYER_STATS_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-player-stats",
  "toolName": "Player Stats",
  "subtitle": "Coaches, players and visitors can read recorded player totals here. This dialog is for viewing; use the authorized stat keeper to correct game records.",
  "steps": [
    {
      "id": "player-stats-overview",
      "targetSelector": "",
      "title": "Player season totals",
      "description": "Coaches, players and visitors can read recorded player totals here. This dialog is for viewing; use the authorized stat keeper to correct game records."
    },
    {
      "id": "team-player-stats-totals",
      "targetSelector": "[data-tour=\"team-player-stats-totals\"]",
      "title": "Season totals",
      "description": "The player's jersey and positions appear above their recorded numbers.",
      "details": [
        {
          "label": "Season totals",
          "text": "Read passing, receiving, rushing and defensive credits shown in this dialog."
        },
        {
          "label": "Close",
          "text": "The X returns to the roster."
        }
      ]
    }
  ]
};

export const TEAM_STATS_CUSTOMIZER_WALKTHROUGH: ToolWalkthrough = {
  "id": "team-stats-customizer",
  "toolName": "Choose Team Stats",
  "subtitle": "Coaches choose which stats appear on the team overview. This changes the display only; all stats continue to be recorded.",
  "steps": [
    {
      "id": "customizer-overview",
      "targetSelector": "",
      "title": "Choose the team summary",
      "description": "Coaches choose which stats appear on the team overview. This changes the display only; all stats continue to be recorded."
    },
    {
      "id": "team-stats-presets",
      "targetSelector": "[data-tour=\"team-stats-presets\"]",
      "title": "Quick selections",
      "description": "Use a preset as a starting point.",
      "details": [
        {
          "label": "Reset to Default",
          "text": "Select the standard record and scoring stats."
        },
        {
          "label": "Select All",
          "text": "Select every available stat, not just the filtered category."
        },
        {
          "label": "Clear All",
          "text": "Deselect all stats."
        },
        {
          "label": "Selected",
          "text": "Shows the number currently selected."
        }
      ]
    },
    {
      "id": "team-stats-filters",
      "targetSelector": "[data-tour=\"team-stats-filters\"]",
      "title": "Filter the available stats",
      "description": "Category tabs narrow the choices without clearing your selection.",
      "details": [
        {
          "label": "All Categories",
          "text": "Show all stat choices without changing the selection."
        },
        {
          "label": "Record & Scoring Overview",
          "text": "Show wins, losses and scoring choices."
        },
        {
          "label": "Situational & Downs Efficiency",
          "text": "Show first-down and conversion-efficiency choices."
        },
        {
          "label": "PAT Conversion Efficiency",
          "text": "Show extra-point choices."
        },
        {
          "label": "Offensive Scoring & Execution",
          "text": "Show offensive production choices."
        },
        {
          "label": "Defensive Playmaking",
          "text": "Show defensive production choices."
        },
        {
          "label": "Turnover Margin & Discipline",
          "text": "Show turnovers and penalty choices."
        }
      ]
    },
    {
      "id": "team-stats-choices",
      "targetSelector": "[data-tour=\"team-stats-choices\"]",
      "title": "Choose individual stats",
      "description": "Scroll the list to see each category.",
      "details": [
        {
          "label": "Stat card",
          "text": "Toggle whether that stat appears on the team overview."
        },
        {
          "label": "Stat description and current value",
          "text": "Explain what is measured and preview the recorded number."
        }
      ]
    },
    {
      "id": "team-stats-customizer-save",
      "targetSelector": "[data-tour=\"team-stats-customizer-save\"]",
      "title": "Save the display",
      "description": "Review the number selected before applying.",
      "details": [
        {
          "label": "Cancel",
          "text": "Discard these selection edits."
        },
        {
          "label": "Save Stats",
          "text": "Save the display configuration."
        },
        {
          "label": "Close customizer",
          "text": "The X closes without applying unsaved changes."
        }
      ]
    }
  ]
};


export const FORMATION_EDITOR_WALKTHROUGH: ToolWalkthrough = {
  "id": "formation-editor",
  "toolName": "Formation Alignment",
  "subtitle": "Coaches create or edit a formation here. Drag the players you control, review alignment warnings, and save. Routes and coverage assignments belong in the play designer, not this dialog.",
  "steps": [
    {
      "id": "formation-overview",
      "targetSelector": "",
      "title": "Design the pre-snap alignment",
      "description": "Coaches create or edit a formation here. Drag the players you control, review alignment warnings, and save. Routes and coverage assignments belong in the play designer, not this dialog."
    },
    {
      "id": "formation-settings",
      "targetSelector": "[data-tour=\"formation-settings\"]",
      "title": "Name and squad size",
      "description": "Use a clear formation name and check the league player count.",
      "details": [
        {
          "label": "Formation / Alignment Name",
          "text": "Enter the name used in this playbook."
        },
        {
          "label": "Squad Format: 4v4 / 5v5 / 6v6 / 7v7 / 8v8",
          "text": "Switch the number of players in the alignment."
        },
        {
          "label": "League Rule / Rule",
          "text": "Marks the league's configured player count."
        },
        {
          "label": "Preset Template",
          "text": "Apply one of the named starting alignments, replacing the current positioning."
        }
      ]
    },
    {
      "id": "formation-field",
      "targetSelector": "[data-tour=\"formation-field\"]",
      "title": "Place the players",
      "description": "Drag circles on the field to position your unit.",
      "details": [
        {
          "label": "Player circles",
          "text": "Drag your offense or defense to its pre-snap spots."
        },
        {
          "label": "Show / Hide Opposing Defense / Offense",
          "text": "Toggle the other side for reference."
        },
        {
          "label": "100% Legal Alignment / Alignment Warning",
          "text": "Review the alignment check before saving."
        }
      ]
    },
    {
      "id": "formation-save",
      "targetSelector": "[data-tour=\"formation-save\"]",
      "title": "Finish the alignment",
      "description": "Save after reviewing the name and positions.",
      "details": [
        {
          "label": "Cancel",
          "text": "Close without saving."
        },
        {
          "label": "Save Formation Alignment",
          "text": "Save this formation; any error appears above the controls."
        },
        {
          "label": "Close",
          "text": "The X at the top dismisses the editor."
        }
      ]
    }
  ]
};


export const PRINT_ARMBAND_WALKTHROUGH: ToolWalkthrough = {
  "id": "print-armband",
  "toolName": "Print Armbands & Playbooks",
  "subtitle": "Coaches and rostered players can print plays they can access. Choose the layout and included plays, then use the browser print dialog to print or save a PDF.",
  "steps": [
    {
      "id": "print-overview",
      "targetSelector": "",
      "title": "Take plays to the field",
      "description": "Coaches and rostered players can print plays they can access. Choose the layout and included plays, then use the browser print dialog to print or save a PDF."
    },
    {
      "id": "print-actions",
      "targetSelector": "[data-tour=\"print-actions\"]",
      "title": "Print or export",
      "description": "The print preview updates as you choose settings.",
      "details": [
        {
          "label": "Print / Save PDF",
          "text": "Open your browser print dialog; select a printer or PDF destination there."
        },
        {
          "label": "Close modal",
          "text": "Return to the playbook without printing."
        }
      ]
    },
    {
      "id": "print-layout",
      "targetSelector": "[data-tour=\"print-layout\"]",
      "title": "Choose a layout",
      "description": "Pick the format that fits your game-day reference.",
      "details": [
        {
          "label": "Armband Inserts",
          "text": "Compact numbered play diagrams for wristbands."
        },
        {
          "label": "Gameday Call Sheet",
          "text": "A calling reference for the sideline."
        },
        {
          "label": "Complete Playbook",
          "text": "A full-page teaching reference."
        },
        {
          "label": "Plays per Card: 1 / 2 / 4 / 8",
          "text": "In Armband Inserts, choose how many plays share each insert."
        },
        {
          "label": "Opponents: Shown / Opponents: Hidden",
          "text": "Include or hide opposing players in the diagrams."
        }
      ]
    },
    {
      "id": "print-filter",
      "targetSelector": "[data-tour=\"print-filter\"]",
      "title": "Choose the included plays",
      "description": "Use only the plays you want to carry.",
      "details": [
        {
          "label": "Filter Included Plays",
          "text": "Expand or collapse the play selection list; the count shows what is included."
        },
        {
          "label": "Select All Plays",
          "text": "Include all plays in this book when the filter is open."
        }
      ]
    },
    {
      "id": "print-play-choices",
      "targetSelector": "[data-tour=\"print-play-choices\"]",
      "title": "Include individual plays",
      "description": "Each play's button acts as a checkbox.",
      "details": [
        {
          "label": "Play name",
          "text": "Toggle whether this play appears in the printed output."
        }
      ]
    },
    {
      "id": "print-preview",
      "targetSelector": "[data-tour=\"print-preview\"]",
      "title": "Check the preview",
      "description": "Scroll through the printable pages and check numbering, diagrams and cut lines before printing."
    }
  ]
};


export const CREATE_PLAYBOOK_WALKTHROUGH: ToolWalkthrough = {
  "id": "create-playbook",
  "toolName": "Create a Playbook",
  "subtitle": "Coaches choose the book's identity and squad size here. Players can study the resulting plays but cannot change these settings.",
  "steps": [
    {
      "id": "create-playbook-overview",
      "targetSelector": "",
      "title": "Create a Playbook",
      "description": "Coaches choose the book's identity and squad size here. Players can study the resulting plays but cannot change these settings."
    },
    {
      "id": "create-playbook-fields",
      "targetSelector": "[data-tour=\"create-playbook-fields\"]",
      "title": "Book settings",
      "description": "Check the side and player count before saving.",
      "details": [
        {
          "label": "Offensive Playbook / Defensive Playbook",
          "text": "Choose the side of the ball; this sets the tools available in its plays."
        },
        {
          "label": "Playbook Title",
          "text": "Enter the name shown on the card."
        },
        {
          "label": "Description / Philosophy (Optional)",
          "text": "Describe the scheme or teaching purpose."
        },
        {
          "label": "Squad Format (Players Per Side): 4v4 / 5v5 / 6v6 / 7v7 / 8v8",
          "text": "Choose the player count; future new formations use the selected size."
        }
      ]
    },
    {
      "id": "create-playbook-save",
      "targetSelector": "[data-tour=\"create-playbook-save\"]",
      "title": "Finish the book",
      "description": "Errors are shown in the form.",
      "details": [
        {
          "label": "Cancel",
          "text": "Dismiss without saving."
        },
        {
          "label": "Create Playbook",
          "text": "Save the book settings."
        },
        {
          "label": "Close",
          "text": "The X dismisses this dialog."
        }
      ]
    }
  ]
};


export const EDIT_PLAYBOOK_WALKTHROUGH: ToolWalkthrough = {
  "id": "edit-playbook",
  "toolName": "Edit Playbook Details",
  "subtitle": "Coaches choose the book's identity and squad size here. Players can study the resulting plays but cannot change these settings.",
  "steps": [
    {
      "id": "edit-playbook-overview",
      "targetSelector": "",
      "title": "Edit Playbook Details",
      "description": "Coaches choose the book's identity and squad size here. Players can study the resulting plays but cannot change these settings."
    },
    {
      "id": "edit-playbook-fields",
      "targetSelector": "[data-tour=\"edit-playbook-fields\"]",
      "title": "Book settings",
      "description": "Check the side and player count before saving.",
      "details": [
        {
          "label": "Offensive Playbook / Defensive Playbook",
          "text": "Choose the side of the ball; this sets the tools available in its plays."
        },
        {
          "label": "Playbook Title",
          "text": "Enter the name shown on the card."
        },
        {
          "label": "Description / Philosophy (Optional)",
          "text": "Describe the scheme or teaching purpose."
        },
        {
          "label": "Squad Format (Players Per Side): 4v4 / 5v5 / 6v6 / 7v7 / 8v8",
          "text": "Choose the player count; future new formations use the selected size."
        }
      ]
    },
    {
      "id": "edit-playbook-save",
      "targetSelector": "[data-tour=\"edit-playbook-save\"]",
      "title": "Finish the book",
      "description": "Errors are shown in the form.",
      "details": [
        {
          "label": "Cancel",
          "text": "Dismiss without saving."
        },
        {
          "label": "Save Changes",
          "text": "Save the book settings."
        },
        {
          "label": "Close",
          "text": "The X dismisses this dialog."
        }
      ]
    }
  ]
};


export const PLAY_VIEWER_WALKTHROUGH: ToolWalkthrough = {
  "id": "play-viewer",
  "toolName": "Player Play Viewer",
  "subtitle": "Rostered players have a read-only view. You can select positions, read coaching notes, ask questions and replay the play, but cannot move players or change routes.",
  "steps": [
    {
      "id": "viewer-overview",
      "targetSelector": "",
      "title": "Study your assignment",
      "description": "Rostered players have a read-only view. You can select positions, read coaching notes, ask questions and replay the play, but cannot move players or change routes."
    },
    {
      "id": "play-command-bar",
      "targetSelector": "[data-tour=\"play-command-bar\"]",
      "title": "Play context",
      "description": "The name, formation and situation explain which play you are studying.",
      "details": [
        {
          "label": "Plays",
          "text": "Go back to this formation's play cards."
        },
        {
          "label": "Coach notes",
          "text": "Read general scheme notes."
        },
        {
          "label": "Coach Q&A",
          "text": "Read discussion or ask a question about this play."
        },
        {
          "label": "More play tools",
          "text": "On narrow screens, open the extra opponent, notes and Q&A controls."
        }
      ]
    },
    {
      "id": "opponent-toggle",
      "targetSelector": "[data-tour=\"opponent-toggle\"]",
      "title": "See the opponent",
      "description": "An opponent look helps you understand spacing.",
      "details": [
        {
          "label": "Show opponent / Hide opponent",
          "text": "Toggle the opposing side when permitted by this play."
        }
      ]
    },
    {
      "id": "opponent-scheme-selector",
      "targetSelector": "[data-tour=\"opponent-scheme-selector\"]",
      "title": "Opponent plays",
      "description": "Choose a reference look if the selector is available.",
      "details": [
        {
          "label": "Opponent play",
          "text": "Choose a play from the available books or standard schemes; this is a viewing preview."
        }
      ]
    },
    {
      "id": "play-field",
      "targetSelector": "[data-tour=\"play-field\"]",
      "title": "Read the diagram",
      "description": "Solid paths show routes; dashed paths show pre-snap motion. Defensive zones and matchups show responsibilities. Viewing does not change the saved play."
    },
    {
      "id": "play-animation-controls",
      "targetSelector": "[data-tour=\"play-animation-controls\"]",
      "title": "Watch the timing",
      "description": "Playback works without editing the play.",
      "details": [
        {
          "label": "Run Play / Pause / Replay",
          "text": "Start, stop or replay the animation."
        },
        {
          "label": "Reset Timeline",
          "text": "Return to the pre-snap alignment."
        },
        {
          "label": "0.5x / 1x / 1.5x",
          "text": "Change playback speed."
        },
        {
          "label": "Animation timeline",
          "text": "Scrub to a particular moment."
        }
      ]
    },
    {
      "id": "player-pills",
      "targetSelector": "[data-tour=\"player-pills\"]",
      "title": "Choose your position",
      "description": "Select a position even when its circle is hard to reach.",
      "details": [
        {
          "label": "Position pill",
          "text": "Show that position's assignment and coaching note."
        },
        {
          "label": "Note / motion markers",
          "text": "Identify positions with notes and pre-snap motion."
        }
      ]
    },
    {
      "id": "player-view-assignment",
      "targetSelector": "[data-tour=\"player-view-assignment\"]",
      "title": "Your job on this play",
      "description": "Read the selected player's route or defensive responsibility and any coaching notes."
    }
  ]
};


export const ASYNC_STAT_KEEPER_WALKTHROUGH: ToolWalkthrough = {
  "id": "async-stat-keeper",
  "toolName": "Untimed Stat Keeper",
  "subtitle": "Authorized coaches record plays, change possession and finalize the result. Players and visitors can read the Play Log, Box Score and Team Stats without entering plays. Only controls available in your current tab and play-entry stage are highlighted; reopen Guide after advancing.",
  "steps": [
    {
      "id": "async-overview",
      "targetSelector": "",
      "title": "Record a game without a clock",
      "description": "Authorized coaches record plays, change possession and finalize the result. Players and visitors can read the Play Log, Box Score and Team Stats without entering plays. Only controls available in your current tab and play-entry stage are highlighted; reopen Guide after advancing."
    },
    {
      "id": "async-navigation",
      "targetSelector": "[data-tour=\"async-navigation\"]",
      "title": "Choose the view",
      "description": "Switch tabs without leaving the game.",
      "details": [
        {
          "label": "Exit / Exit Stat Keeper",
          "text": "Return to the schedule or parent game page."
        },
        {
          "label": "Stat Keeper",
          "text": "Authorized coaches enter plays here."
        },
        {
          "label": "Play Log",
          "text": "Review saved plays in order."
        },
        {
          "label": "Box Score",
          "text": "Compare individual player totals."
        },
        {
          "label": "Team Stats",
          "text": "Compare team totals."
        }
      ]
    },
    {
      "id": "async-scoreboard",
      "targetSelector": "[data-tour=\"async-scoreboard\"]",
      "title": "Score and period",
      "description": "The scoreboard updates from recorded plays.",
      "details": [
        {
          "label": "Possession dot",
          "text": "Shows which side has the ball."
        },
        {
          "label": "First Half / Second Half / Final",
          "text": "Shows the game phase without a running clock."
        },
        {
          "label": "Down",
          "text": "Shows the current down in the series."
        }
      ]
    },
    {
      "id": "async-controls",
      "targetSelector": "[data-tour=\"async-controls\"]",
      "title": "Prepare the next play",
      "description": "Check possession and down before entering a play.",
      "details": [
        {
          "label": "Possession: team buttons",
          "text": "Choose the offense."
        },
        {
          "label": "1st / 2nd / 3rd / 4th Down",
          "text": "Set the current down; available downs follow league rules."
        },
        {
          "label": "Halftime (2nd Half)",
          "text": "Move the game to its second half."
        },
        {
          "label": "Game Over",
          "text": "Open the finalization step; do not use this just to leave the page."
        },
        {
          "label": "Undo",
          "text": "Remove the last saved play after confirmation."
        },
        {
          "label": "Add Player",
          "text": "Open Add Player / Sub to make a missing player available."
        }
      ]
    },
    {
      "id": "async-start",
      "targetSelector": "[data-tour=\"async-start\"]",
      "title": "Start the next play",
      "description": "The Last Play summary helps you avoid entering the same play twice.",
      "details": [
        {
          "label": "START NEXT PLAY",
          "text": "Open the play-type chooser."
        }
      ]
    },
    {
      "id": "async-entry",
      "targetSelector": "[data-tour=\"async-type\"] > div",
      "title": "Choose the play type",
      "description": "After START NEXT PLAY choose the action you need.",
      "details": [
        {
          "label": "Pass Play",
          "text": "Enter a pass outcome and participating players."
        },
        {
          "label": "Run Play",
          "text": "Enter a rushing outcome and ball carrier."
        },
        {
          "label": "Penalty",
          "text": "Record the penalty, team, player and enforcement using the penalty wizard."
        },
        {
          "label": "Cancel",
          "text": "Leave the entry without recording a play."
        }
      ]
    },
    {
      "id": "async-outcome",
      "targetSelector": "[data-tour=\"async-outcome\"]",
      "title": "Describe the outcome",
      "description": "Choose one outcome; use its summary to reopen the choice.",
      "details": [
        {
          "label": "Complete",
          "text": "Credit a completed pass."
        },
        {
          "label": "Incomplete",
          "text": "Record a pass that was not caught."
        },
        {
          "label": "Pass Breakup (PBU)",
          "text": "Record a defended pass."
        },
        {
          "label": "Interception",
          "text": "Credit the turnover and eligible interceptor."
        },
        {
          "label": "Sack",
          "text": "Credit a quarterback sack."
        },
        {
          "label": "Flag Guarding / FFL",
          "text": "Record the shown flag-related loss outcome."
        },
        {
          "label": "Positive Gain / Loss of Yards",
          "text": "Choose the result direction for a run."
        }
      ]
    },
    {
      "id": "async-players",
      "targetSelector": "[data-tour=\"async-players\"]",
      "title": "Credit the players",
      "description": "Tap a summary or its Change control to reopen a collapsed section.",
      "details": [
        {
          "label": "Quarterback / Ball Carrier",
          "text": "Choose the passer or runner."
        },
        {
          "label": "Receiver",
          "text": "Choose the eligible targeted or catching player; the passer is excluded."
        },
        {
          "label": "Pass Breakup / Interceptor(s) / Sacker(s) / Flagger(s)",
          "text": "Choose defenders for the outcome shown."
        },
        {
          "label": "Flagger(s) on Interception Return",
          "text": "Credit an offensive player's pull on the return when relevant."
        },
        {
          "label": "TEAM",
          "text": "Use team credit when offered instead of assigning an individual."
        },
        {
          "label": "Cancel play",
          "text": "The X discards this entry."
        }
      ]
    },
    {
      "id": "penalty-side",
      "targetSelector": "[data-tour=\"penalty-side\"]",
      "title": "Penalty: who committed it?",
      "description": "The penalty wizard has three stages; reopen Guide in each stage.",
      "details": [
        {
          "label": "Defense / Offense",
          "text": "Select the penalized side."
        },
        {
          "label": "Back to Play Type",
          "text": "Cancel this penalty entry and return to play selection."
        }
      ]
    },
    {
      "id": "penalty-infraction",
      "targetSelector": "[data-tour=\"penalty-infraction\"]",
      "title": "Penalty: select the infraction",
      "description": "Each named infraction shows its default yardage and down impact.",
      "details": [
        {
          "label": "Infraction buttons",
          "text": "Choose the actual foul committed; defaults fill the enforcement stage."
        },
        {
          "label": "Continue to enforcement",
          "text": "Review yardage, acceptance and down impact next."
        }
      ]
    },
    {
      "id": "penalty-enforcement",
      "targetSelector": "[data-tour=\"penalty-enforcement\"]",
      "title": "Penalty: enforcement",
      "description": "Adjust the ruling to match the official decision.",
      "details": [
        {
          "label": "Accepted / Declined / Offset",
          "text": "Choose whether and how the penalty applies."
        },
        {
          "label": "Yardage buttons",
          "text": "Choose the displayed enforcement distance."
        },
        {
          "label": "Auto 1st / Replay / Loss Down",
          "text": "Set the effect on the down."
        },
        {
          "label": "Back / Back to infraction",
          "text": "Return to the previous stage."
        },
        {
          "label": "Continue to player",
          "text": "Choose optional individual responsibility next."
        }
      ]
    },
    {
      "id": "penalty-player",
      "targetSelector": "[data-tour=\"penalty-player\"]",
      "title": "Penalty: responsible player",
      "description": "Review the live penalty statement before applying it.",
      "details": [
        {
          "label": "TEAM Infraction",
          "text": "Record team responsibility without an individual."
        },
        {
          "label": "Athlete buttons",
          "text": "Optionally select the responsible player."
        },
        {
          "label": "Back / Back to enforcement",
          "text": "Review enforcement again."
        },
        {
          "label": "Enforce penalty",
          "text": "Save the penalty and apply the ruling."
        }
      ]
    },
    {
      "id": "async-save",
      "targetSelector": "[data-tour=\"async-save\"]",
      "title": "Save the play result",
      "description": "The available result buttons depend on outcome and required player selections.",
      "details": [
        {
          "label": "TOUCHDOWN (+6) / PICK 6 (+6)",
          "text": "Save the scoring play, then enter the conversion."
        },
        {
          "label": "FIRST DOWN / SHORT OF LINE",
          "text": "Save the gain and set the next down correctly."
        },
        {
          "label": "OUT OF BOUNDS",
          "text": "Show the OOB follow-up choices."
        },
        {
          "label": "OOB - FIRST DOWN / OOB - SHORT",
          "text": "Save the out-of-bounds gain with its down result."
        },
        {
          "label": "FLAGGED (Save Turnover) / OOB / DOWNED (Save Turnover)",
          "text": "Save the interception return result and flip possession."
        },
        {
          "label": "SAVE & NEXT DOWN",
          "text": "Save a non-scoring outcome and advance."
        },
        {
          "label": "LOSS OF YARDS / SAFETY (+2 DEF)",
          "text": "Save the loss or credit a defensive safety."
        },
        {
          "label": "Missing players message",
          "text": "Choose required participants to enable result buttons."
        }
      ]
    },
    {
      "id": "async-conversion",
      "targetSelector": "[data-tour=\"async-conversion\"] > div",
      "title": "After a touchdown",
      "description": "Complete the conversion before starting the next possession.",
      "details": [
        {
          "label": "1 POINT / 2 POINTS",
          "text": "Choose the conversion value."
        },
        {
          "label": "GOOD (+1 PTS) / GOOD (+2 PTS) / NO GOOD (0 PTS)",
          "text": "Record whether the conversion scored."
        },
        {
          "label": "Conversion Passer / Runner",
          "text": "Choose the player responsible for a successful conversion."
        },
        {
          "label": "Conversion Receiver",
          "text": "Choose a receiver for a completed conversion pass."
        },
        {
          "label": "Confirm Conversion & Flip Possession",
          "text": "Save the conversion and move the ball to the other team."
        }
      ]
    },
    {
      "id": "async-finalize",
      "targetSelector": "[data-tour=\"async-finalize\"]",
      "title": "Finalize Game",
      "description": "Review the displayed final score before confirming.",
      "details": [
        {
          "label": "Confirm Final Score",
          "text": "Complete the game and save the final result."
        },
        {
          "label": "Resume Game",
          "text": "Return to the game without finalizing."
        }
      ]
    },
    {
      "id": "async-log",
      "targetSelector": "[data-tour=\"async-log\"]",
      "title": "Game Play Log",
      "description": "Read each saved play and its scoring or possession outcome. Scroll within this panel to see older entries."
    },
    {
      "id": "async-box-score",
      "targetSelector": "[data-tour=\"async-box-score\"]",
      "title": "Player Box Score",
      "description": "The individual stats update from recorded plays.",
      "details": [
        {
          "label": "Team buttons",
          "text": "Choose which team's player totals to display."
        },
        {
          "label": "Player rows",
          "text": "Read passing, rushing, receiving and defensive totals; these are not editable cells."
        }
      ]
    },
    {
      "id": "async-team-stats",
      "targetSelector": "[data-tour=\"async-team-stats\"] > div",
      "title": "Team Stats",
      "description": "Compare the team-level totals generated from recorded plays."
    },
    {
      "id": "async-notices",
      "targetSelector": "[data-tour=\"async-notices\"]",
      "title": "Check save notices",
      "description": "A failed request is not a successful save.",
      "details": [
        {
          "label": "Retry",
          "text": "Reload the play log after a loading failure."
        },
        {
          "label": "Dismiss",
          "text": "Hide the displayed notice; it does not retry a failed save."
        }
      ]
    }
  ]
};


export const ASYNC_ADD_PLAYER_WALKTHROUGH: ToolWalkthrough = {
  "id": "async-add-player",
  "toolName": "Add Player / Sub",
  "subtitle": "Authorized scorekeepers can add a player name for game stat tracking. Pick the correct side before adding.",
  "steps": [
    {
      "id": "sub-overview",
      "targetSelector": "",
      "title": "Add a missing player",
      "description": "Authorized scorekeepers can add a player name for game stat tracking. Pick the correct side before adding."
    },
    {
      "id": "async-add-player",
      "targetSelector": "[data-tour=\"async-add-player\"]",
      "title": "Choose the side and name",
      "description": "Check for an existing roster name first to avoid duplicate stat credits.",
      "details": [
        {
          "label": "Team buttons",
          "text": "Choose the home or away roster."
        },
        {
          "label": "Player Name (e.g. John Doe)",
          "text": "Enter the player's name."
        },
        {
          "label": "Add Player to Roster",
          "text": "Add the name to the chosen side for stat selection."
        },
        {
          "label": "Close",
          "text": "The X returns without adding another player."
        }
      ]
    }
  ]
};

export const PLAY_QUESTIONS_WALKTHROUGH: ToolWalkthrough = {
  "id": "play-questions",
  "toolName": "Coach Q&A",
  "subtitle": "Rostered players and coaches can post play-specific questions. Coaches can answer and edit responses; deletion is limited to the controls available to you.",
  "steps": [
    {
      "id": "questions-overview",
      "targetSelector": "",
      "title": "Talk through this play",
      "description": "Rostered players and coaches can post play-specific questions. Coaches can answer and edit responses; deletion is limited to the controls available to you."
    },
    {
      "id": "play-question-form",
      "targetSelector": "[data-tour=\"play-question-form\"]",
      "title": "Ask or clarify",
      "description": "Keep questions specific to this play.",
      "details": [
        {
          "label": "Ask Your Coach a Question / Post a Coaching Clarification / Question",
          "text": "Write the question or coaching prompt in the text box."
        },
        {
          "label": "Quick Prompts",
          "text": "Players can fill the text box with a suggested question, then edit it."
        },
        {
          "label": "Post Question",
          "text": "Post your text to this play discussion."
        }
      ]
    },
    {
      "id": "play-question-discussion",
      "targetSelector": "[data-tour=\"play-question-discussion\"]",
      "title": "Discussion & Coaching Answers",
      "description": "Read the coaching response beneath each answered question.",
      "details": [
        {
          "label": "Pending Coach / Answered",
          "text": "The badge shows whether the question has a coaching answer."
        },
        {
          "label": "Delete question",
          "text": "Remove an allowed question after confirmation."
        },
        {
          "label": "Reply to Player / Edit Coach Response",
          "text": "Coaches open the response editor."
        },
        {
          "label": "Reply text box",
          "text": "Write or revise the answer."
        },
        {
          "label": "Cancel",
          "text": "Discard the response edit."
        },
        {
          "label": "Submit Answer",
          "text": "Save the coach response."
        }
      ]
    },
    {
      "id": "play-question-close",
      "targetSelector": "[data-tour=\"play-question-close\"]",
      "title": "Return to the play",
      "description": "Close the discussion when you are ready to study the diagram.",
      "details": [
        {
          "label": "Close / Close dialog",
          "text": "Dismiss this dialog using the footer button or header X."
        }
      ]
    }
  ]
};

export const SAVE_ROUTE_PRESET_WALKTHROUGH: ToolWalkthrough = {
  "id": "save-route-preset",
  "toolName": "Save Route Preset",
  "subtitle": "Coaches can reuse a drawn route across this team. Demo presets last only in session memory and clear when the tab refreshes.",
  "steps": [
    {
      "id": "save-route-preset-overview",
      "targetSelector": "",
      "title": "Save Route Preset",
      "description": "Coaches can reuse a drawn route across this team. Demo presets last only in session memory and clear when the tab refreshes."
    },
    {
      "id": "save-route-preset-fields",
      "targetSelector": "[data-tour=\"save-route-preset-fields\"]",
      "title": "Notes and actions",
      "description": "Use the controls in this dialog.",
      "details": [
        {
          "label": "Preset Name",
          "text": "Name this route before saving."
        },
        {
          "label": "Waypoints",
          "text": "Check the number of saved cuts and points."
        },
        {
          "label": "Save to Team",
          "text": "Save the named route; the counter shows the team limit of 20."
        },
        {
          "label": "Cancel / Close",
          "text": "Dismiss without saving a preset."
        }
      ]
    }
  ]
};

export const POSITION_NOTES_WALKTHROUGH: ToolWalkthrough = {
  "id": "position-notes",
  "toolName": "Position Notes",
  "subtitle": "Coaches write a job and read progression for each position. Players can read notes when granted a read-only view.",
  "steps": [
    {
      "id": "position-notes-overview",
      "targetSelector": "",
      "title": "Position Notes",
      "description": "Coaches write a job and read progression for each position. Players can read notes when granted a read-only view."
    },
    {
      "id": "position-notes-fields",
      "targetSelector": "[data-tour=\"position-notes-fields\"]",
      "title": "Notes and actions",
      "description": "Use the controls in this dialog.",
      "details": [
        {
          "label": "Position label / Assignment",
          "text": "Identify the player and its current route or coverage."
        },
        {
          "label": "Position text boxes",
          "text": "Coaches edit the install notes for each position; read-only viewers cannot type."
        },
        {
          "label": "Done / Close",
          "text": "Return to the field; edits follow the playbook save process."
        }
      ]
    }
  ]
};

export const PLAY_NOTES_WALKTHROUGH: ToolWalkthrough = {
  "id": "play-notes",
  "toolName": "Coach Scheme Notes",
  "subtitle": "Coaches can write general scheme notes; rostered players can read them without editing.",
  "steps": [
    {
      "id": "play-notes-overview",
      "targetSelector": "",
      "title": "Coach Scheme Notes",
      "description": "Coaches can write general scheme notes; rostered players can read them without editing."
    },
    {
      "id": "play-notes-fields",
      "targetSelector": "[data-tour=\"play-notes-fields\"]",
      "title": "Notes and actions",
      "description": "Use the controls in this dialog.",
      "details": [
        {
          "label": "Scheme notes text box",
          "text": "Write or read the overall coaching concept and progression."
        },
        {
          "label": "Save Notes / Close",
          "text": "Return to the play; editable notes follow the playbook save process."
        }
      ]
    }
  ]
};
