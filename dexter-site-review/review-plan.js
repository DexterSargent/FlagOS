/* Human review scenarios, separate from the generated source inventory. */
window.FLAGOS_REVIEW_PLAN = {
  pages: {
    "/": ["Home & signed-in landing", "Public & account", ["Visitor", "Coach", "Player", "Platform admin"], [
      "Signed out: review hero, pricing/demo/story links, embedded previews, feature claims and footer.",
      "Signed in: verify memberships, correct league/team destinations, empty-membership state and account menu.",
      "Demo embeds: explore controls without leaking state or edits into a real team."
    ]],
    "/my-story": ["Founder story", "Public & account", ["Visitor"], [
      "Review story, photos, photo viewer open/close, captions, mobile framing and calls to action."
    ]],
    "/pricing": ["Pricing & provisioning", "Public & account", ["Visitor", "Coach", "Platform admin"], [
      "Check team $40 CAD and league $40 + $20/team; adjust every capacity control and feature category.",
      "Open both setup dialogs: names, shortcode, visibility, logos, colours, validation, cancel and duplicate-submit protection.",
      "Owner account: verify complimentary creation using a disposable test entity, not a paid checkout.",
      "Non-owner with live billing disabled: see the development notice, not free entity creation.",
      "Isolated sandbox only: paid, declined, authentication-required, cancelled and paid-but-unfinished purchases; refresh must not duplicate an entity."
    ]],
    "/leagues": ["League directory", "Public & account", ["Visitor", "League admin"], [
      "Search/filter league cards; check team counts, logos, demo entry, loading/empty states and destination links.",
      "Check public/private visibility and that directory listings do not expose private league information."
    ]],
    "/login": ["Sign-in & registration", "Public & account", ["Visitor", "Player", "Coach"], [
      "Test Google and email/password sign-in, account creation, validation, password reset, verification and redirect return.",
      "Cancel or fail sign-in; verify useful errors and no endless loader or incorrect role.",
      "Local/demo role selectors must not grant production permissions; sign out and back in."
    ]],
    "/account": ["Account & connected emails", "Public & account", ["Player", "Coach", "League admin"], [
      "Verify current email, verification, connected-email request and confirmation, invalid/duplicate/expired cases.",
      "Check only verified linked addresses grant the intended memberships; test sign-out and unauthenticated access."
    ]],
    "/profile": ["Player profile", "Public & account", ["Player", "Coach", "Visitor"], [
      "Review stats, settings, rules and account tabs; verify player/team switching and season context.",
      "Check appearance changes, personal totals and team playbook links; another player cannot edit this profile.",
      "Refresh a deep link and verify the selected player is correct; inspect no-profile/loading states."
    ]],
    "/free-agents": ["Free-agent interest", "Public & account", ["Visitor", "Platform admin"], [
      "Review eligible leagues and submit a test interest form with valid consent, required fields and clear confirmation.",
      "Check invalid email, duplicate/rate-limited submission, empty leagues and API failure; verify admin interest queue."
    ]],
    "/join": ["League player registration", "League operations", ["Visitor", "Player", "League admin"], [
      "Open the chosen league's join URL; confirm identity fields, positions, teammate requests, rules and submission.",
      "Review closed-registration, full-roster, private/missing league, validation and success states.",
      "Use disposable test players; confirm registration lands in the correct league and does not duplicate on retry."
    ]],
    "/league": ["Active league redirect", "League operations", ["Visitor", "League admin"], [
      "Confirm redirect to the selected league, default/demo fallback, no redirect loop and no wrong-league flash."
    ]],
    "/league/[id]": ["League dashboard: all roles", "League operations", ["Visitor", "Player", "Coach", "League admin"], [
      "Spectator: verify standings, live/upcoming matches, teams, leaders and public player details.",
      "League admin: verify KPIs, settings/season controls and management shortcuts.",
      "Coach: verify only the managed team and correct quick-add player flow.",
      "Player: verify identity, own team, next match and personal stats.",
      "Refresh real/private/missing league URLs; demo content must not flash under a real league ID."
    ]],
    "/schedule": ["League schedule & playoffs", "League operations", ["Visitor", "League admin", "Coach"], [
      "Check date/week/season filters, completed/upcoming/live games, venue directions and match links.",
      "Test create/edit/cancel game, opponent selection, time zone, venue and validation on disposable fixtures.",
      "Exercise automated schedule builder, slot conflicts, previews and save/cancel; verify round-robin expectations.",
      "Review playoff format editor, seeding, byes, bracket connectors and winner progression.",
      "Destructive: clear schedule only in disposable data; confirm warning and no unrelated games removed."
    ]],
    "/teams": ["League teams & roster directory", "League operations", ["Visitor", "Coach", "League admin"], [
      "Filter/select teams and players; compare roster, totals, public profile and team portal links.",
      "Test add/edit/delete team with disposable data and paid capacity constraints.",
      "Test remove-team with retained slot versus subscription reduction; verify exact confirmation copy.",
      "Confirm team staff cannot manage another team's roster or league subscription."
    ]],
    "/stats": ["League stats & season history", "League operations", ["Visitor", "League admin"], [
      "Review standings tie-breakers, team/player leaderboards, sorting, categories and season selector.",
      "Open player career cards and history; compare archived and current season totals.",
      "Use one known completed game to reconcile individual stats and box score, not just final scores."
    ]],
    "/teams/[id]": ["Team hub", "Team portals", ["Visitor", "Player", "Coach", "League admin"], [
      "Compare independent and league-owned team portals; team theme, record, staff, opponents and navigation must match.",
      "Test Edit Team Info, branding, staff invitations/removal and primary-admin permissions on disposable accounts.",
      "Test depth chart ranking and player positions: explicit positions survive removal of chart-assigned positions.",
      "Test independent season archive/reopen; archived access is read-only where intended.",
      "Paid sandbox team: Manage Billing opens the correct customer. Complimentary teams are never silently billed.",
      "Known real team: verify existing playbooks, individual stats and box scores remain intact; do not modify real records."
    ]],
    "/teams/[id]/roster": ["Team roster & player details", "Team portals", ["Visitor", "Player", "Coach"], [
      "Test add/edit/remove player, jersey conflicts, positions, roster limits, staff restrictions and form validation.",
      "Review player cards, individual stat dialogs, depth charts and visibility as coach versus player/visitor.",
      "Verify chart position sorting and sync; confirm no player from another team appears in assignments."
    ]],
    "/teams/[id]/schedule": ["Team schedule", "Team portals", ["Visitor", "Coach"], [
      "Review all date/season/status filters and create-game deep link; venue and opponent naming stay accurate.",
      "Independent team: create/edit test fixture, opponent placeholders and scorer links; refresh persists correctly.",
      "League team: shared fixtures agree with league schedule and don't appear twice.",
      "Check load failure, no games and archived-season restrictions."
    ]],
    "/teams/[id]/stats": ["Team statistics", "Team portals", ["Visitor", "Coach"], [
      "Check season/category controls and customizable displayed stats; sorting and totals agree with game plays.",
      "Compare win/loss, passing, receiving, rushing, defense, conversions and penalties to one known box score.",
      "Test empty/new team and archived seasons; missing stats must not be presented as a successful zero-data load."
    ]],
    "/teams/[id]/playbook": ["Playbook & play designer", "Team portals", ["Coach", "Player", "Visitor"], [
      "Check playbook list create/edit/delete, permissions, formations, previews, saved state and reload.",
      "Designer: select/move players, draw/edit routes, undo/redo, zoom/pan, snapping and opponent schemes.",
      "Exercise formation builder, route catalogue, play questions, animation and diagram dialogs.",
      "Print armbands: selection, layout, preview and actual browser print/PDF; no clipped plays.",
      "Verify private playbooks cannot be viewed by a visitor or another team's coach; preserve real saved plays."
    ]],
    "/matches/[id]": ["Match result & box score", "Game day", ["Visitor", "Coach", "League admin"], [
      "Check teams, score, status, time/venue, team totals, player box score, scoring summary and glossary.",
      "Compare team and player totals to recorded plays, including conversions, interceptions and penalties.",
      "Test upcoming/live/completed/missing matches and links to live console, scorer access and team pages."
    ]],
    "/matches/[id]/play-by-play": ["League live scorekeeping", "Game day", ["Scorer", "Coach", "League admin", "Visitor"], [
      "Check scorer authorization/link access, viewer read-only mode and correct match/team rosters.",
      "Record pass, rush, sack, interception, return, touchdown, safety, conversion and penalty test plays.",
      "Verify clock/period, possession, downs, field position, score and timeout controls.",
      "Edit/undo/delete plays; confirm totals recalculate, reload persists and duplicate submission is prevented.",
      "Complete/reopen disposable games; verify box score, team stats and league standings agree afterward."
    ]],
    "/teams/[id]/matches/[matchId]/stat-keeper": ["Team live scorekeeping", "Game day", ["Scorer", "Coach", "Visitor"], [
      "Repeat game-day scenario with an independent team and opponent placeholder.",
      "Compare behavior with league console: same scoring rules, player attribution, editing, undo and finalization.",
      "Try expired/revoked scorer access, wrong team/match pairing, missing match and unauthorized viewer."
    ]],
    "/admin": ["Platform admin console", "Platform admin", ["Platform admin", "Coach", "Visitor"], [
      "Overview: counts reconcile to customer/team lists; refresh/loading/errors are visible.",
      "Customers: search/paging, edit league, manage admins, independent teams and subscription labels.",
      "Delete disposable league: explicitly compare delete-all-teams versus retain/detach choice and billing consequences.",
      "Finance: period filters, paid/complimentary/inactive records, ledger add/edit/delete and billing dialogs.",
      "Users: memberships, roles, linked emails and staff management; no accidental cross-account access.",
      "Activity: filtering, readable audit entries and correct actor/entity references.",
      "Free Agents: review disposable interest submission and lifecycle actions.",
      "Health and notifications panel: read-only diagnostics, queue/delivery/failure/suppression states; do not run destructive cleanup on real data.",
      "Non-admin and signed-out direct URLs must not expose admin data or actions."
    ]],
    "/admin/sandbox": ["Fake-game data tools (dangerous)", "Platform admin", ["Platform admin"], [
      "DANGER: generating fake data changes the first matches in the connected database. Never run it against production.",
      "In disposable emulator data only: verify generation, cleanup, confirmations and resulting stats.",
      "Confirm non-platform-admin users are denied direct access."
    ]]
  },
  journeys: [
    ["visitor-to-member", "Visitor → account → team", "Public & account", ["Visitor", "Coach"], [
      "Open landing → directory → pricing → sign-in → correct return destination.",
      "In isolated sandbox only: buy one team plan, finish setup, configure team, add test players and reload.",
      "Sign out: public pages remain public; private team controls and playbooks remain protected."
    ], ["/", "/leagues", "/pricing", "/login", "/teams/[id]"]],
    ["league-season", "Commissioner → full season", "League operations", ["League admin"], [
      "Create disposable league, configure branding/rules/venues and allocate teams within capacity.",
      "Open registration, add test players, build schedule, score fixtures and verify standings/playoffs.",
      "Archive and start next season; current and historical stats remain correct and no real data is purged."
    ], ["/league/[id]", "/join", "/schedule", "/stats"]],
    ["game-reconciliation", "Game → box score → season totals", "Game day", ["Scorer", "Coach"], [
      "Use a written test-game ledger with expected score and individual events.",
      "Score the game, correct one play, undo another, finish and refresh.",
      "Compare live feed, match box score, team stats, player profile and league leaderboard to that ledger."
    ], ["/matches/[id]/play-by-play", "/matches/[id]", "/teams/[id]/stats", "/profile", "/stats"]],
    ["billing-lifecycle", "Subscription lifecycle (not live-ready)", "Release gates", ["Coach", "Platform admin"], [
      "Keep live billing disabled until sandbox success/decline/3DS, signed webhooks and replay tests pass.",
      "Verify paid-but-unused recovery, exactly-once entity creation and owner complimentary bypass.",
      "Verify seat preview/payment recovery, reductions, renewal, cancellation and entity-deletion renewal stop.",
      "Resolve approved 14-day grace policy, risk-review workflow, environment isolation and tax/legal readiness."
    ], ["/pricing", "/admin"]],
    ["access-boundaries", "Permission & identity boundaries", "Release gates", ["Visitor", "Player", "Coach", "League admin", "Platform admin"], [
      "Use separate test accounts for every role; try direct URLs, not just hidden buttons.",
      "Check player, coach, coordinator and primary admin capabilities against actual memberships.",
      "Verify private leagues, team playbooks, depth charts, staff email data and admin portal access.",
      "Test email verification, linked addresses, sign-out, revoked roles and expired scorer links."
    ], ["/login", "/account", "/teams/[id]/playbook", "/admin"]],
    ["settings", "League settings: every tab", "League operations", ["League admin", "Player"], [
      "Branding: name/shortcode/logos/colors, previews, cancel/revert, persistence and readable contrast.",
      "Rules: presets, scoring, roster/field settings, clock and penalties; player view cannot edit.",
      "Subscription: capacity, team list, add/remove, paid versus complimentary and billing portal.",
      "Season: history, archive/start/reopen; distinguish season completion from subscription cancellation.",
      "Inspect every field/button and its walkthrough in phone/laptop and light/dark modes."
    ], ["/league/[id]"]],
    ["guides", "Guides, forms & accessibility", "Shared experience", ["Visitor", "Coach", "League admin"], [
      "Open the Guide on every page, dialog and settings tab; inspect every step, next/back/close and no-target behavior.",
      "Spotlights land on the correct controls and explain their current permissions/actions without generic button-map sections.",
      "Confirm FlagOS-green Guide button, fixed guide accent, readable text, keyboard navigation and reduced-motion behavior.",
      "Check labels, validation, focus visibility, modal focus/escape/return and 200% zoom.",
      "Cold load, slow network and failed fetch: loader gear rotates around football; errors are visible and retries work."
    ], ["/", "/league/[id]", "/teams/[id]"]],
    ["release", "Production launch gate", "Release gates", ["Platform admin"], [
      "No unresolved blockers in this review; export a dated report and keep known issues explicit.",
      "Recheck actual deployed revision, production billing/email flags and intended configuration.",
      "Backups/restore rehearsal, monitoring, scheduled jobs, notification delivery and rollback plan verified.",
      "Approve terms/privacy/refunds and applicable tax registrations; sandbox data/keys never enter production."
    ], ["/admin", "/pricing"]]
  ],
  resources: [
    ["Start here: reviewer workflow", "dexter-site-review/README.md", "Setup, safety, navigation, exports and progress storage."],
    ["Stripe setup & remaining gates", "docs/STRIPE-SETUP-WALKTHROUGH.md", "Sandbox configuration and unverified billing launch requirements."],
    ["Financial plan", "docs/FINANCIAL-AUTOMATION-PLAN.md", "Approved policy versus implemented billing behavior."],
    ["Operations", "docs/OPERATIONS.md", "Backups, jobs, notifications, contrast checks and rollback."],
    ["Local emulator isolation", "docs/local-firebase-emulators.md", "Use disposable data for write/destructive/payment tests."],
    ["Architecture atlas", "docs/architecture.md", "Existing diagrams and data flow; older snapshot, not current proof."],
    ["Stats summary architecture", "docs/team-stat-summaries.md", "Game/season totals, caches and reconciliation."],
    ["Verified copy library", ".agents/verified_copy_library.md", "Tone and copy guidance."],
    ["Verified design library", ".agents/verified_design_library.md", "Visual consistency guidance."],
    ["Firebase rules", "firestore.rules", "Client authorization and data-access boundaries."],
    ["Firebase indexes", "firestore.indexes.json", "Query-index definitions."],
    ["Production configuration", "apphosting.yaml", "Runtime flags and secret references, not secret values."],
    ["Contrast audit", "scripts/contrast-audit.mjs", "Existing phone/laptop theme/form checks; use its documented setup."],
    ["Brand assets", "public", "Logos, loader layers, favicons and shared graphics."],
    ["Build / test commands", "package.json", "Existing scripts and installed tooling."],
    ["Dashboard verification", "dexter-site-review/verify.cjs", "Inventory coverage and browser regression tests for this tool."]
  ]
};
