import type { ToolWalkthrough, WalkthroughStep } from "@/lib/walkthroughData";

const step = (id: string, title: string, description: string, details: [string, string][] = [], target = id): WalkthroughStep => ({
  id, title, description, targetSelector: target ? `[data-tour="${target}"]` : "",
  details: details.map(([label, text]) => ({ label, text })),
});
const overview = (id: string, title: string, description: string) => step(id, title, description, [], "");
const guide = (id: string, toolName: string, steps: WalkthroughStep[]): ToolWalkthrough => ({ id, toolName, subtitle: "Understand the settings, review your changes and know what happens when you save.", steps });

const settingsNavigation = step("settings-navigation", "Find your settings", "Choose a tab, then reopen Guide for that tab's own tour. The tour never saves or changes your settings.", [
  ["League Branding", "Edit identity, privacy, colours, venue and public registration information."],
  ["League Rules", "Set gameplay, roster limits and free-agent registration."],
  ["Subscription & Teams", "Review licensing, adjust paid slots and add or remove teams."],
  ["Season & Archival", "Review season access and conclude or resume a season."],
  ["Guide", "Reopen help for the selected tab."], ["Close settings", "Close the panel; save pending branding or rule edits first."],
], "settings-header");
const help = ["Info icons", "Open the small information icons beside field labels for extra context."] as [string, string];

export const LEAGUE_BRANDING_GUIDE = guide("league-settings-branding", "League Branding", [
  overview("branding-overview", "Make this league your own", "Branding changes are drafts until you apply them. Scroll through the panel to review every section before saving."), settingsNavigation,
  step("settings-preview", "Preview your identity", "The site-wide preview shows how your name, shortcode, season, logo and venue will look. It is not a separate save button."),
  step("settings-privacy", "Choose who can find and view your league", "Listing and access are different choices. None of these options gives visitors permission to edit league records.", [
    ["Listed Publicly", "Anyone can find the league in the directory and open its public hub. Free-agent search also requires accepting free agents."],
    ["Unlisted (Link Only)", "Keep the league out of the directory. People with the link must sign in to view it."],
    ["Private (Members Only)", "Only league admins, coaches and rostered players can open it. A shared link does not grant membership."],
    ["Direct Access URL", "Open the displayed league link to check the public destination."], ["Copy URL", "Copy the direct link; Copied! confirms it reached your clipboard."], help,
  ]),
  step("settings-identity", "League identity", "Set the names and badge used across your league.", [
    ["League Full Name *", "Enter the league's full display name."], ["League Shortcode", "Enter the short label used where space is limited."],
    ["Season Title / Edition", "Name the current season or championship."], ["Tagline / Motto", "Add a short introduction to your league."],
    ["League Crest / Logo URL", "Paste an image URL for your crest."], ["Shield Crest / Football Emblem / Crown Icon", "Choose a sample logo to preview it in place of a pasted URL."], help,
  ]),
  step("settings-operations", "Venue and public information", "These details help teams know where to play and how to reach you.", [
    ["Default Game Field / Complex", "Set the default venue label."], ["Rulebook Title", "Name the public rulebook link."],
    ["Rulebook Link (URL)", "Paste a rules PDF or webpage URL."], ["Commissioner Contact Email", "Set the public contact address."],
    ["Site-Wide Announcement Banner (Optional)", "Write a league notice, or clear it to remove the banner."], help,
  ]),
  step("settings-colours", "Official league colours", "The preview updates as you experiment with your palette.", [
    ["Primary Colour *", "Use the colour picker or hexadecimal text field for the main brand colour."],
    ["Secondary Colour *", "Use the second picker or hexadecimal field for accent highlights."], help,
  ]),
  step("settings-registration", "Registration fees and perks", "These optional details describe your league offering; they do not change the FlagOS subscription.", [
    ["Team Registration Fee ($)", "Enter the team price, or leave it blank if undisclosed."],
    ["Free Agent / Individual Fee ($)", "Enter the individual price, or leave it blank if undisclosed."],
    ["Included Features & Perks (Comma-Separated)", "Separate perks with commas, such as referees, jerseys or trophies."], help,
  ]),
  step("settings-player-info", "Help players decide whether to join", "These details appear on your league's public information and help players find a suitable league.", [
    ["City / Area and public contact", "Tell players where you play and how to ask about joining. Use contact details you are comfortable sharing."],
    ["Game days, times, skill level and divisions", "Describe who the league is for and when games usually happen."],
    ["Registration deadline and season dates", "Keep these dates current so players know whether registration is still open."],
    ["Accepting free agents", "Choose whether to appear in free-agent search. The league must also be listed publicly."],
  ]),
  step("settings-venues", "Save your playing fields", "Add the fields you use so players can find game locations.", [
    ["Add Venue", "Add a row, then enter the field name, address and any directions or parking notes."],
    ["Venue name", "Use the same name in scheduled games so their location can show the saved address and notes."],
    ["Remove venue", "Remove the row from this draft. Apply League Branding saves the change."],
  ]),
  step("settings-branding-save", "Apply your branding", "Review your preview and finish here.", [
    ["Apply League Branding / Apply", "Save your branding and current rule drafts, then close settings. Saving... means the request is running."],
    ["Cancel", "Close without applying your drafts."], ["Dismiss", "Clear a save error after reading it; then correct the problem and try again."],
  ]),
]);

export const LEAGUE_RULES_GUIDE = guide("league-settings-rules", "League Rules", [
  overview("rules-overview", "Set the rules everyone plays by", "Commissioners can edit these gameplay parameters. Changes remain drafts until Apply & Save Settings; other visitors have a separate read-only summary."), settingsNavigation,
  step("settings-players", "Players on each side", "Choose the on-field format used by league tools.", [["4v4 / 5v5 / 6v6 / 7v7 / 8v8", "Select how many athletes play per side."], help]),
  step("settings-clock", "Game periods and clock", "Choose the game's structure and the time for each break.", [
    ["Halves", "Use two halves."], ["Quarters", "Use four quarters."], ["10m / 12m / 15m / 20m / 25m", "Choose a preset duration per period."],
    ["Custom minutes", "Type a different period length."], ["Halftime Intermission Duration: 1 min / 2 min / 5 min", "Choose the halftime countdown."], help,
  ]),
  step("settings-timeouts", "Timeout allowance", "Set how many stoppages each team receives.", [
    ["1 TO / 2 TOs / 3 TOs / 4 TOs", "Choose the timeout allowance per team."], ["30s / 60s / 90s", "Set each timeout's countdown length."],
    ["Reset Timeouts Each Period/Half", "Check to replenish timeouts each period; uncheck to share the allowance across the game."], help,
  ]),
  step("settings-downs", "Downs and scrimmage", "Match the scoreboard and gameplay tools to your league rules.", [
    ["3 Downs / 4 Downs", "Choose three (Canadian Standard) or four (American Standard) downs per series."], ["1 Yds / 5 Yds / 7 Yds / 10 Yds", "Set the Rush Distance behind the line of scrimmage."],
    ["25s / 30s / 40s", "Choose the Play Clock Duration between downs."], help,
  ]),
  step("settings-stat-keeping", "Stat keeping mode", "Choose how league games are recorded when a stat keeper opens a game.", [
    ["Live clocks", "Run the game clock, play clock and timeouts while recording each play."], ["No clock, both teams", "Record plays for both rosters by half without clocks; scores, downs and stats still update."],
    help,
  ]),
  step("settings-rosters", "Roster size limits", "Set the smallest and largest permitted team rosters.", [
    ["Minimum Roster Size", "Type the minimum player count; it must be at least the on-field squad size."], ["Maximum Roster Size", "Type the maximum permitted player count."], help,
  ]),
  step("settings-free-agents", "Join form and free agents", "Control individual registrations and share the league-specific sign-up destination.", [
    ["Join Form", "Open the league's join form in a new tab."], ["Custom Join Link", "Open the displayed league-specific registration URL."],
    ["Copy Join Link", "Copy that URL to share; Copied! confirms success."], ["Enabled / Disabled", "Toggle Public Join Form & Free Agent Pool; disabled closes public registration and hides the unassigned-player pool."],
    ["Admin Preview (Disabled to Public)", "You can inspect the form as commissioner even while public registration is closed."], help,
  ]),
  step("settings-rules-save", "Save or reset rules", "A preset loads draft values; it does not save them automatically.", [
    ["Close", "Exit without applying draft rule changes."], ["Reset to IFAF 5v5", "Load the official five-a-side preset into this form."],
    ["Apply & Save Settings", "Save the rule and branding drafts, then close settings."], ["Dismiss", "Hide a preset notice or error after reading it."],
  ]),
]);

export const LEAGUE_RULES_VIEW_GUIDE = guide("league-settings-rules-view", "Official League Rules", [
  overview("rules-view-overview", "Your league's official rules", "These are the commissioner's current settings. This view does not let players or spectators edit them."),
  step("settings-rules-summary", "Game at a glance", "Squad Format, Game Clock, Downs / Series and Rush Line show the active format and timing."),
  step("settings-rules-cards", "Read the rule cards", "Review Players On The Field, Game Timing, Downs & Series, Rush Line Distance, Play Clock, Timeouts, Roster Capacity and the Free Agent Draft Pool."),
  step("settings-rules-view-join", "Registration links", "When registration is available, use the displayed links to join.", [["Join Form", "Open this league's registration page."], ["Copy Link", "Copy the custom join URL to your clipboard."]]),
  step("settings-rules-view-close", "Need a rule changed?", "Contact the League Commissioner to propose changes.", [["Close", "Return to the league."], ["Close settings", "The header X also closes this panel."]]),
]);

export const LEAGUE_SUBSCRIPTION_GUIDE = guide("league-settings-subscription", "Subscription & Teams", [
  overview("subscription-overview", "Manage your plan and teams", "Team slots are your plan's capacity; team records are the teams actually using it. Review both before making changes. Complimentary accounts are not charged."), settingsNavigation,
  step("settings-subscription-summary", "Current subscription", "Review Active Subscription, base licensing, team fees, total monthly cost and the next renewal. These are read-only summaries."),
  step("settings-manage-billing", "Manage billing", "Paid plans only. Opens the secure Stripe billing portal to update your card, download invoices or cancel your plan."),
  step("settings-slots", "Adjust paid team slots", "Choose capacity from 2 to 32 teams and review the recalculated monthly total.", [
    ["Decrease team slot", "The minus button reduces the proposed slot count by one."], ["Increase team slot", "The plus button increases it by one."],
    ["Team slot slider", "Drag to choose a proposed capacity between 2 and 32 teams; the monthly price updates as you go."],
    ["Confirm Teams", "Save the proposed capacity. Paid plans show the exact charge first: added slots are charged a prorated amount right away, and removed slots lower the price from your next renewal."],
  ]),
  step("settings-add-team", "Add an actual team", "Create a team record and increase the subscription together.", [
    ["Team name", "Type a name in the field, or leave it blank for the suggested Team number."],
    ["Add Team to Subscription (+$20/mo)", "Create the team and add one slot. The listed rate is $20 per month per slot; complimentary accounts remain free. Wait for Adding... to finish."],
  ]),
  step("settings-current-teams", "Current league teams", "Review the real team records included in your league.", [
    ["Remove (-$20/mo)", "Ask to remove this team and reduce capacity. Read the confirmation before continuing; the fee change applies at the next payment."],
  ]),
  step("settings-subscription-close", "Finish subscription review", "Success messages confirm completed changes. Closing does not undo an already confirmed subscription change.", [["Close", "Return to the league settings' underlying page."]]),
]);

export const LEAGUE_SEASON_GUIDE = guide("league-settings-season", "Season & Archival", [
  overview("season-overview", "Manage the season lifecycle", "End a season to save its results to League History, then pause the league or start the next season with the same teams and rosters."), settingsNavigation,
  step("settings-season-status", "Season access and cost", "Read the season status, Subscription Status, Monthly Licensing and Access Mode. Archived or past-due leagues show read-only access."),
  step("settings-archive", "End the season", "Use these choices only when the season's games are finished.", [
    ["End Season", "Open the choices below; nothing changes until you pick one."],
    ["1. Pause the League", "Make the league read-only and stop monthly charges while keeping everything viewable."],
    ["2. Start the Next Season", "Open the new-season form. Final standings, stats and the champion are saved to History first."], ["Cancel", "Back out without changing anything."],
  ]),
  step("settings-new-season", "Name the new season", "Appears after choosing Start the Next Season.", [
    ["New season name", "The name players see on standings, schedules and history, such as Spring 2027."],
    ["Start season", "Archive the current season and start the new one. The old schedule and play-by-play become read-only; schedule new games from the Schedule page."],
    ["Back", "Close the form without starting a season."],
  ]),
  step("settings-season-resume", "Resume an archived season", "This option appears only when the league is archived.", [["Reactivate League / Start Next Season", "Resume the subscription and restore league editing."]]),
  step("settings-season-payment", "Restore past-due access", "This option appears only when payment is past due.", [["Update Payment & Resume Subscription", "Run the resume-subscription action to restore access."]]),
]);
export const LEAGUE_SETTINGS_GUIDES = { branding: LEAGUE_BRANDING_GUIDE, rules: LEAGUE_RULES_GUIDE, subscription: LEAGUE_SUBSCRIPTION_GUIDE, season: LEAGUE_SEASON_GUIDE };

const consoleNavigation = step("admin-navigation", "Move around the business console", "These controls apply across the console. Each tab has its own Guide.", [
  ["FlagOS home", "Return to the site homepage."], ["Refresh", "Reload customer and business data."], ["New team / league", "Open pricing to start a new subscription."],
  ["Sign out", "Sign out of your owner account."], ["Overview / Customers / Finance / Users / Activity / Health", "Switch between business summaries, customers, bookkeeping, accounts, the audit trail and maintenance checks."],
], "admin-header");
export const ADMIN_OVERVIEW_GUIDE = guide("platform-admin-overview", "Business Overview", [
  overview("admin-overview-intro", "Your business at a glance", "This owner-only console brings together customer records and bookkeeping. Billed recurring revenue and money actually recorded in the ledger are different measures."), consoleNavigation,
  step("admin-overview-kpis", "Business metrics", "Read the current recurring revenue, month and year-to-date results, active customers and account totals. These cards are summaries, not buttons.", [["MRR (marked paid)", "Monthly recurring revenue from plans you have marked as paid. Payments are not processed automatically yet; the list figure also includes complimentary value."], ["ARR run-rate", "Annualized recurring revenue, with average revenue per account (ARPA)."], ["Profit this month", "This month's ledger revenue less expenses."], ["Active customers", "Current paid and complimentary customers."], ["Revenue YTD", "Year-to-date revenue after refunds."], ["Expenses YTD", "Year-to-date recorded spending."], ["Profit YTD", "Year-to-date revenue less expenses, with margin when available."], ["User accounts", "Account count, with new and active account totals for 30 days."]]),
  step("admin-overview-comp", "Complimentary subscriptions", "Compare complimentary plan value with billed revenue.", [["Open billing", "Switch to Finance to manage paid versus complimentary billing."]]),
  step("admin-overview-charts", "Revenue and customer mix", "Revenue vs expenses uses the last twelve months of ledger records. Customer mix separates paid, complimentary, trial and churned accounts, then league versus independent team plans."),
  step("admin-overview-trends", "Growth and recurring revenue trends", "Customer growth tracks total customers; MRR trend (marked paid) tracks plans you have marked as paid rather than cash collected."),
  step("admin-overview-renewals", "Renewals due (30 days)", "Check upcoming and overdue renewals.", [["Record payment", "Open a prefilled income entry; check its amount and date before saving."]]),
  step("admin-overview-signups", "Recent signups", "See who recently created an account.", [["All users", "Switch to Users for account search, status and access controls."]]),
  step("admin-overview-health", "Platform health", "Review loaded league, team, player, game, play and account counts. A dash means the count is unavailable.", [["Activity", "Switch to the audit trail to inspect recorded changes."]]),
  step("admin-overview-top", "Top accounts by value", "Compare the highest monthly plan values and billing badges; these cards do not record payments."),
]);
export const ADMIN_CUSTOMERS_GUIDE = guide("platform-admin-customers", "Customer Management", [
  overview("admin-customers-intro", "Manage leagues and teams", "Find customer records, inspect their membership and manage league access. Changes here affect actual customer data."), consoleNavigation,
  step("admin-customer-search", "Find a customer", "The counts summarize loaded customer records.", [["Search leagues, teams, or IDs", "Filter by customer names, shortcodes or record IDs."]]),
  step("admin-leagues", "League controls", "Each league card shows visibility, season, subscription and member counts.", [
    ["Expand All / Collapse All", "Open or close every league's member-team sublist."], ["Manage league", "Open that league's management page."],
    ["Edit", "Open league identity, visibility, subscription and colour settings; the dialog has its own Guide."], ["Admins", "Open commissioner email management; its dialog has its own Guide."],
    ["Make public / Make private", "Change directory visibility immediately."], ["Teams / member teams", "Toggle this league's member-team sublist."],
    ["Delete", "Open a permanent-deletion confirmation. Read what will be removed before confirming."],
  ]),
  step("admin-member-teams", "League member teams", "Expanded sublists show team records and whether the parent league covers their subscription.", [["Hide sublist", "Collapse this league's team list."], ["Manage team", "Open the selected team's page."], ["Delete", "Open the team's deletion confirmation."]]),
  step("admin-teams", "Independent and all teams", "Team cards distinguish independent subscriptions from coverage cascaded by a parent league.", [
    ["Independent", "Show only teams without a parent league."], ["All", "Include league member teams in the directory."],
    ["View all teams directory", "Leave an empty independent list and show all matching teams."], ["Manage team", "Open this team's page."], ["Delete", "Open the permanent team-deletion confirmation."],
  ]),
]);
export const ADMIN_FINANCE_GUIDE = guide("platform-admin-finance", "Finance", [
  overview("admin-finance-intro", "Keep billing and cash records clear", "Subscription settings describe a plan; ledger entries record received income and business spending. Adding an entry does not charge a payment card."), consoleNavigation,
  step("admin-finance-period", "Choose a reporting period", "The selected period controls profit-and-loss totals and ledger records.", [
    ["This month / Last month / Last 90 days / Year to date / Last year / All time", "Choose the reporting window."], ["Ledger CSV", "Download the ledger rows for the selected period."], ["Add entry", "Open an income or expense form with its own Guide."],
  ]),
  step("admin-finance-kpis", "Financial results", "Net revenue accounts for refunds; Expenses, Profit and Entries summarize the chosen period."),
  step("admin-finance-pnl", "Profit and loss", "Compare Income by category and Expenses by category to see where money comes from and goes."),
  step("admin-finance-subscriptions", "Subscriptions and billing", "Review monthly fees, status and renewal dates for billable customer plans.", [
    ["All customers / Paid / Complimentary / Inactive / trial", "Filter subscription rows by billing classification."], ["CSV", "Export the currently filtered subscription rows."],
    ["Payment", "Open a prefilled subscription-income entry for this customer."], ["Billing", "Open plan status, fees and renewal settings; its dialog has its own Guide."],
  ]),
  step("admin-finance-ledger", "Search and review the ledger", "Ledger rows show the date, category, customer, description and signed amount.", [
    ["Search entries", "Filter the displayed entries by description, category or customer."], ["All types / Income / Expenses", "Filter by entry type."],
    ["Delete entry", "The trash button asks for an inline confirmation."], ["Delete?", "Permanently remove that entry and update the financial totals."],
  ]),
]);
export const ADMIN_USERS_GUIDE = guide("platform-admin-users", "User Accounts", [
  overview("admin-users-intro", "Review account access", "These are authentication accounts, not player roster records. Disabling an account affects sign-in access, not a team roster slot."), consoleNavigation,
  step("admin-users-stats", "Account totals", "Review total accounts, new accounts, Active (30d) and Customer admins."),
  step("admin-users-accounts", "Find and manage accounts", "Each row includes account dates, sign-in providers, verification status and role chips: Runs (league admin), Coaches (team admin) and Plays on (rostered player email).", [
    ["Email, name, league", "Search accounts by email, display name, UID or linked league or team."], ["All accounts / League / team admins / Rostered players / Not linked to any team / Unverified email / Inactive 90+ days / Disabled", "Choose an account filter. Not linked helps with \"I'm not on my team\" support requests."],
    ["Show more", "Load the next 50 accounts."],
    ["CSV", "Download the currently filtered accounts."], ["Disable", "Confirm blocking this account from signing in."], ["Enable", "Restore sign-in access to a disabled account."],
    ["Owner", "The platform owner's account is protected and has no Disable button."],
  ]),
]);
export const ADMIN_ACTIVITY_GUIDE = guide("platform-admin-activity", "Platform Activity", [
  overview("admin-activity-intro", "Read the audit trail", "Review security-sensitive changes made by anyone: leagues, teams, rosters, billing, seasons and accounts. The list is read-only and is grouped by day."), consoleNavigation,
  step("admin-activity-log", "Find a recorded change", "Each entry shows its summary, time and the account that made it. Customer marks changes made by league or team admins rather than you.", [
    ["Search activity", "Search summaries, actor email addresses or target IDs."], ["All activity / Leagues & teams / Billing & ledger / Accounts", "Filter by the kind of change."],
    ["All leagues", "Show only changes in one league, or in independent teams."], ["All accounts", "Show only changes made by one account."], ["Show more", "Load the next 50 entries."],
  ]),
]);
export const ADMIN_FREE_AGENTS_GUIDE = guide("platform-admin-free-agents", "Free Agent Interest", [
  overview("admin-free-agents-intro", "Players looking for a team", "Players who could not find a listed league leave their name, email and area on the public Find a Team page. Only platform admins can see these."), consoleNavigation,
  step("admin-free-agents-list", "Follow up with players", "Newest submissions appear first.", [
    ["Refresh", "Reload the list."], ["Email", "Open your email app addressed to the player."],
    ["Delete (trash)", "Asks for confirmation; Delete? permanently removes the submission."],
  ]),
]);
export const ADMIN_HEALTH_GUIDE = guide("platform-admin-health", "Platform Health", [
  overview("admin-health-intro", "What needs attention", "A read-only scan of the whole platform. The same scan runs nightly and emails you a weekly summary when email is configured. Nothing is ever changed or deleted automatically."), consoleNavigation,
  step("admin-health-panels", "Work through each list", "Each panel is empty when there is nothing to do.", [
    ["Data integrity", "Teams, players, games or plays pointing at records that no longer exist, and leagues with more teams than their plan covers."],
    ["Renewals", "Paid plans renewing in the next 7 days or already overdue."], ["Seasons ending soon", "Active seasons whose final scheduled game is within two weeks. A wrap-up email is queued once per season; sending depends on notification configuration."],
    ["Stale and test records", "Trial, archived or test-named leagues and teams idle for 30+ days. A dry run only."], ["Review", "Open Customers filtered to that record, where you can edit or delete it."],
    ["Re-run", "Scan again now."],
  ]),
  step("admin-notifications", "Check operational emails", "Configuration and delivery history are separate from the read-only health scan. Queued messages are not proof of delivery.", [
    ["Refresh email status", "Reload configuration, message counts and the 50 newest emails."],
    ["Queue a test to my email", "Queue a branded test to your signed-in platform-admin email only. Repeated clicks within 10 minutes reuse the same email."],
    ["Process queue", "Attempt pending operational emails now, rather than waiting for the scheduler. Sending must be enabled and configured."],
    ["Delivery status", "Accepted means the provider received the request. Delivered means the recipient's mail server accepted the email. Bounces and complaints suppress future sends to that address."],
  ]),
]);
export const ADMIN_CONSOLE_GUIDES = { overview: ADMIN_OVERVIEW_GUIDE, health: ADMIN_HEALTH_GUIDE, customers: ADMIN_CUSTOMERS_GUIDE, finance: ADMIN_FINANCE_GUIDE, users: ADMIN_USERS_GUIDE, activity: ADMIN_ACTIVITY_GUIDE, "free-agents": ADMIN_FREE_AGENTS_GUIDE };

export const ADMIN_EDIT_LEAGUE_GUIDE = guide("platform-admin-edit-league", "Edit League", [
  overview("admin-edit-intro", "Edit a customer league", "Review all fields before saving. Changes here update the customer league rather than your own account."),
  step("admin-edit-identity", "Identity and access", "Keep customer-facing names and access status accurate.", [["League Name", "Set the full display name."], ["Shortcode", "Set the short display label."], ["Season Title", "Name the current season."], ["Visibility", "Choose Public or Private directory listing."], ["Subscription Status", "Choose Active, Trial, Past Due, Canceled, Archived (read-only), or None."]]),
  step("admin-edit-colours", "Brand colours", "Use either the colour swatches or hexadecimal text fields.", [["Primary Color", "Set the main brand colour."], ["Accent Color", "Set the accent colour."]]),
  step("admin-edit-cascade", "Member-team coverage", "Review subscription propagation before submitting.", [["Cascade subscription to member teams", "Apply the selected league subscription state to its member teams when saved."]]),
  step("admin-edit-save", "Save or leave", "Saving is the action that applies your changes.", [["Save Changes", "Save the league and any selected subscription cascade."], ["Cancel / X", "Close without saving this draft."]]),
]);
export const ADMIN_MANAGE_ADMINS_GUIDE = guide("platform-admin-manage-admins", "Manage Admins", [
  overview("admin-admins-intro", "Manage commissioner access", "Only add trusted people: these email addresses grant administrative access to the league."),
  step("admin-admins-list", "Current administrators", "Review who already has access.", [["Remove admin", "The Remove button beside an email revokes that commissioner's access."]]),
  step("admin-admins-add", "Add a commissioner", "Use the account's exact email address.", [["Add New Admin", "Enter the email address to grant access."], ["Add", "Add the entered email as an administrator."], ["Done / X", "Close the dialog; completed access changes are already applied."]]),
]);
export const ADMIN_DELETE_LEAGUE_GUIDE = guide("platform-admin-delete-league", "Delete League", [
  overview("admin-delete-league-intro", "Permanent deletion", "This is not seasonal archival. Read the confirmation's full impact before proceeding."),
  step("admin-delete-league", "Confirm or cancel", "Deleting a league always removes its games and recorded plays. Choose what happens to its member teams before confirming.", [["Delete all member teams and their data", "Selected by default. Also permanently removes member teams, rosters, private player details, playbooks, depth charts and team-managed games."], ["Keep member teams", "Retain teams outside the league without creating independent billing accounts or activating paid subscriptions."], ["Cancel", "Keep the league and close this confirmation."], ["Confirm Delete", "Apply the selected team option and permanently delete the league."]]),
]);
export const ADMIN_DELETE_TEAM_GUIDE = guide("platform-admin-delete-team", "Delete Team", [
  overview("admin-delete-team-intro", "Permanent team deletion", "Check the selected team name and read the warning before making this irreversible change."),
  step("admin-delete-team", "Confirm or cancel", "Removing a team is different from hiding it in the directory.", [["Cancel", "Keep the team and close this confirmation."], ["Delete Team", "Permanently delete the team, roster, contact details, playbooks, depth charts and its own games and plays; league-scheduled games are kept."]]),
]);
export const ADMIN_LEDGER_GUIDE = guide("platform-admin-ledger-entry", "Ledger Entry", [
  overview("admin-ledger-intro", "Record money received or spent", "This form records bookkeeping, not an automatic payment collection. Check any prefilled customer, amount and date."),
  step("admin-ledger-type", "Income or expense", "The selected type changes available categories and customer options.", [["Income", "Record money received, including a refund category when appropriate."], ["Expense", "Record spending; this clears the customer and renewal options."]]),
  step("admin-ledger-fields", "Entry details", "Enter a positive amount; the entry type and category determine its financial effect.", [["Amount (CAD)", "Enter the amount in Canadian dollars, greater than zero."], ["Date", "Choose the transaction date."], ["Category", "Select the income or expense category."], ["Customer (optional)", "For income, attach a league or independent team, or choose No customer."], ["Description", "Add a short explanation for the ledger."]]),
  step("admin-ledger-save", "Renewal and saving", "The renewal checkbox appears for subscription income attached to a customer.", [["Mark paid and extend renewal by one month", "Mark that customer paid and move its renewal forward when recording subscription income."], ["Save entry", "Save this entry and update financial summaries."], ["Cancel / Close", "Discard the draft and close the form."]]),
]);
export const ADMIN_BILLING_GUIDE = guide("platform-admin-billing", "Customer Billing", [
  overview("admin-billing-intro", "Edit subscription terms", "Billing settings describe the plan. Record received payments separately in the ledger."),
  step("admin-billing-status", "Status and billing class", "Access status and paid-versus-complimentary classification are separate choices.", [["Status", "Choose Active, Trial, Past due, Canceled or Archived."], ["Billing", "Choose Paid or Complimentary."]]),
  step("admin-billing-fees", "Monthly fees", "League plans use a base plus per-team calculation; independent teams use a single monthly fee.", [["Base / mo", "Set the league's base monthly fee."], ["Per team", "Set its monthly per-team charge."], ["Teams", "Set the billed team count and review Total."], ["Monthly fee (CAD)", "For an independent team, set its monthly charge."]]),
  step("admin-billing-save", "Renewal and saving", "Check the renewal date before applying the terms.", [["Next renewal", "Choose the next billing date."], ["Save billing", "Apply the plan changes."], ["Cancel / Close", "Close without saving this draft."]]),
]);
export const ADMIN_SANDBOX_GUIDE = guide("platform-admin-sandbox", "Admin Sandbox", [
  overview("admin-sandbox-intro", "Database test tools: use with care", "Owner-only tools write to the connected database. This page is not an isolated browser demo: do not use it on real customer matches."),
  step("admin-sandbox-home", "Return home", "Leave the tools without changing any records.", [["Dashboard", "Return to the site homepage."]]),
  step("admin-sandbox-generate", "Generate sample match activity", "Read the browser confirmation before continuing. Players are needed on both teams to generate plays.", [["Generate Fake Plays & Complete Matches", "Select up to the first two matches, generate up to ten random fake plays for each and mark the matches completed with generated scores."]]),
  step("admin-sandbox-wipe", "Remove marked test data", "This only finds records marked as fake; it is not a full database reset or a backup restore.", [["Wipe Fake Data & Reset Matches", "Confirm deleting up to 500 marked fake plays and resetting up to 512 marked matches to scheduled with zero scores. It does not restore their earlier scores."]]),
]);
