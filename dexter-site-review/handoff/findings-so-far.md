# FlagOS visible functional review — 2026-10-26

## Status: verification incomplete; not release approval

### Continued review — actual-role milestone

Latest actual dashboard exports now contain **198 / 1,735 checked items: 55 scenarios and 143 controls**. The earlier 137-count narrative below is historical, not the current count. Review continues; this milestone is not completion or release approval.

Verified real email/password identities in the isolated emulator: a non-owner coach added through the independent-team staff UI; the roster-linked player; a non-owner commissioner belonging to `league_private`; and an unrelated delegated scorer. No production identity or credential was used. Owner, coach, player and commissioner platform-admin boundaries were tested by direct URL. Coach own-playbook access and opponent denial, player own read-only playbook and opponent denial, and commissioner denial of both own-league team schemes and independent-team schemes were observed.

The scorer redeemed a real single-game invitation, received a temporary access banner, and recorded three manually selected local events: incomplete pass, accepted offensive false start (5 yards/replay), and an out-of-bounds short rush. Reload preserved the play and grant. Owner UI displayed the used invitation and revoked it. After reauthentication, the same scorer's direct match URL rendered the viewer, with no temporary banner or write controls. Wrong independent completed-match direct URL was read-only. Expiry, reuse by a second identity and live-session revocation without reload remain untested.

Additional actual UI coverage: all four commissioner Settings tabs were opened and their rendered targets scrolled/read; full Guides completed for Branding (46 steps), Rules (39), Subscription (18), and Season (11; then 13 with End Season choices opened and cancelled). No settings, subscription or archive action was committed. Print suite all three layouts, density 1/2/4/8, opponent display, filter expansion, and 14-step Guide were exercised. Actual browser printing/PDF remains untested. Live Viewer tabs, glossary, down explanation and 11-step Guide were exercised; glossary Escape closed correctly. Stat Keeper's current base 21-step Guide completed; other play branches remain pending.

New findings:

- **R12:** Print suite overlay lacks dialog semantics/name and Escape does not close it. Included-play buttons expose neither `aria-pressed` nor `aria-checked` despite being described as checkboxes. The last selected play intentionally cannot be deselected, but this silently no-ops. Source: `src/components/playbook/PrintArmbandModal.tsx`, modal wrapper and play selection buttons.
- **R13:** Settings Commissioner Controls dialog remains open on Escape after its Guide closes. The named Close settings button works. Source: `src/components/LeagueCustomizerModal.tsx` and `src/components/LeagueCustomizerContent.tsx`.
- **R14:** Clocked scorer's play log says **1st Half** while its scoreboard and viewer correctly say **1st Quarter/Q1**. Also, before scorer initialization, the upcoming viewer used 20:00/one timeout while commissioner rules and initialized scorer used 15:00/two. The latter is an upcoming/default-state inconsistency, not proof of incorrect saved scoring.
- **R15:** Selecting Incomplete then the quarterback temporarily displays raw internal outcome **Incomplete_Menu**. Selecting Missed Throw replaces it with Incomplete. Starting PASS/RUN also starts the clock while the central panel still says “The clock will begin on the snap / Click when snapped”; no initial snap was clicked. Source: `src/app/matches/[id]/play-by-play/AdminView.tsx`.

R1 also reproduced for the actual non-owner commissioner: complimentary fixture now misleadingly showed **32 Paid / $680 per month** in KPIs, subscription and season tabs. No charge was attempted.

The live review dashboard contains scoped notes for **all 138 entries**, with **137 / 1,735 individual checks checked: 43 scenarios and 94 controls**. Dispositions are **19 Needs fixes, 119 In review, 0 Passed, 0 Blocked, and 0 N/A**. Issue counts are affected checklist entries, not unique defects. These counts and the presence of notes on every entry were verified again from the saved JSON export.

The requested comprehensive verification is **not complete**. The remaining 1,598 checks have not been represented as passed. Following the user's explicit redirect, unfinished coverage remains In review rather than being mass-marked Blocked because of authentication. Authentication is now working.

### Persistent deliverables

- `dexter-site-review-2026-10-26.json`: actual dashboard Export backup output.
- `dexter-site-review-2026-10-26.md`: actual dashboard Export report output, including all entry notes and unchecked scenarios.
- This summary: findings, reproductions, environment, evidence limits and remaining gates.
- `review-before-2026-10-26.json`: initial empty-dashboard backup, preserved.

All files are in this session's `files` directory.

## Environment and safety

- Application: `http://localhost:3001`; review dashboard: `http://127.0.0.1:4317/dexter-site-review/`.
- Existing source inventory revision: `eaccd60`. This was not a deployed-production revision review.
- Visible shared integrated browser pages were used; no separate headless browser context.
- Actual identity: verified **disposable emulator owner/platform admin**, not a production identity.
- Additional demo Admin, Coach, Player and Spectator views were inspected. Demo persona switching is **not proof of authorization boundaries**.
- Viewports sampled: **1366 × 768 laptop** and **390 × 844 phone**, light and dark. These combinations were not exhaustively verified for every entry, dialog and role.
- `src/lib/firebase.ts` and `src/lib/firebaseAdmin.ts` were inspected for development fail-closed enforcement of `demo-flagos-local` and local Auth/Firestore emulator hosts. Runtime Firestore resources explicitly referenced that demo project.
- Parent restored Auth `9099`, Firestore `8080`, emulator UI `4000`, with an empty isolated database and no production import.
- Mutations were limited to manually created disposable emulator fixtures and their manual game events. No generator/simulation, production writes, real email, paid checkout, Stripe-tab interaction, destructive cleanup, app-wide configuration change, app source fix, commit or push.
- Existing app/review/emulator services were retained. The export-only helper is stopped after saving exports.

### Browser evidence limits

Many ordinary locator clicks timed out on this integrated browser. DOM `.click()` was used to invoke actual UI event handlers where necessary. Such clicks do **not** establish native pointer focus behavior. A separate native keyboard check did verify Guide Enter/open, Escape/close and focus return on the untimed scorer.

An initially blank screenshot of a background tab became correctly rendered after bringing that tab to the foreground. This is **not** reported as an application defect. A field squeezed during desktop-to-phone resize recovered after closing/reopening its route panel; no permanent layout defect is asserted from that transient state.

Initial Auth connection refusals and the Google emulator popup's “No matching frame” error occurred during emulator/browser relay setup. Email/password emulator login subsequently worked. The popup failure is environment-qualified, not established as a general production login defect.

## Highest-priority findings

### R1 — High: complimentary subscription copy contradicts itself

**Reproduction:** create a complimentary league as the local owner; open league Settings → Subscription & Teams.

**Observed:** “Complimentary, no charge” appears alongside “Next bill on renewal date”, a November 25 renewal and “Rate at next payment: $120/mo”. No actual charge was attempted.

**Source:** `src/components/LeagueCustomizerContent.tsx:2259,2317–2341`.

**Impact:** owners cannot tell whether a supposedly complimentary entity will be billed. Resolve copy and entitlement semantics together.

### R7 — High: changing route depth silently overwrites authored coaching notes

**Controlled single-change reproduction:**

1. Own playbook → Review Offense → Review Spread → Review Slant; select X.
2. Position Notes: enter `Review custom note must survive a depth-only change.`; Done.
3. Click Increase route depth once.

**Observed:** the exact custom note becomes `Jet Motion + 5yd Slant`, without a warning. A prior custom note had survived a save and reload, so this is not merely initial unsaved input. The fixture's original intended note was restored through the UI afterward.

**Source:** `src/components/playbook/PlayCanvas.tsx:448–457,1483,1530` — depth adjustment reapplies a preset, and preset handling regenerates `updatedP.notes`.

**Impact:** authored install/read instructions are lost during an ordinary route edit.

### R9 — High: live/final Team Stats shows a stale score and status until reload

**Reproduction:** independent team game → record a complete passing touchdown → missed one-point PAT → Team Stats → finalize.

**Observed before reload:** scorer header correctly shows **6–0 / Final**, but embedded Team Stats shows **0–0 / LIVE**, PF/PA/differential all zero. The same panel correctly shows one passing TD, one attempt, 100% completions and PAT 0/1.

**After reload:** embedded Team Stats correctly shows **6–0 / FINAL**, PF 6, PA 0 and differential +6. This is a confirmed stale-view problem, **not evidence that the saved final score was lost**.

**Source:** `src/components/AsyncPlayByPlayManager.tsx:155–156,2071`; `GameTeamStats` is passed `matchData` while the main scoreboard uses current score state. This is the relevant code path, not a completed fix.

## Other confirmed findings

| ID | Finding and reproduction | Source |
|---|---|---|
| R2 | Roster player-stat overlay has no accessible dialog name; icon-only close is unnamed; Escape leaves it open. Open a player's stats from the actual roster. Native pointer focus-return behavior was not established. | `src/app/teams/[id]/roster/page.tsx:1131–1138` |
| R3 | League Schedule Game has two unnamed home/away comboboxes. Visible sibling labels are not associated with the selects. | `src/app/schedule/page.tsx:1170–1213` |
| R4 | A November 1 date-only fixture appears as October 31 in Admin Health and the Teams directory, while the match/team schedule shows November 1. Runtime timezone was `America/Toronto`; UTC date-only parsing followed by local formatting reproduces the previous date. | `src/components/admin/AdminHealth.tsx:110`; `src/lib/adminMetrics.ts:372`; `src/app/teams/page.tsx:840`; related `src/lib/platformHealth.ts` date aggregation |
| R5 | Teams directory shows the populated team as **1/30**, while its actual 5v5 roster shows **1/25**. | `src/app/teams/page.tsx:871` hardcodes `/30` |
| R6 | Play Position Notes overlay has no dialog semantics/name, five position textareas without associated labels/aria-labels, and Escape does not close it. At phone size, the overlay itself fit within the viewport. | `src/components/playbook/PlayCanvasDialogs.tsx:125–175` |
| R8 | Independent Schedule Exhibition Game: date/time fields are unnamed and Escape does not close the dialog. Empty required-opponent submission was correctly prevented by native validation. | `src/app/teams/[id]/schedule/page.tsx:642,665,718–739` |
| R10 | After finalization, Untimed Stat Keeper Guide step 4 (“Stat Keeper”) highlights the **Guide button itself** although the entry tab is correctly absent. The actual target was `BUTTON aria-label="Open Untimed Stat Keeper guided tour"`. | `src/components/walkthrough/WalkthroughModal.tsx:78–98,129`; async navigation detail availability in `src/lib/walkthroughData.ts` |
| R11 | Finalized and subsequently reloaded one-play game still says **“TOUCHDOWN! (PAT pending)”** in Play Log after the missed PAT was confirmed; Team Stats records PAT 0/1. This persists across a separate direct navigation. Root cause was not established. | Pending statement `src/components/AsyncPlayByPlayManager.tsx:709–714`; conversion path `:850–882` |

## Executed functional coverage

- Public pricing formula, capacity slider/clamps, plus/minus, all five feature filters; **31 current Guide steps**.
- League dashboard demo personas; **24 current Guide steps**. Actual owner league management and subscription views.
- Owner complimentary creation of both a league and an independent team, using actual UI. No paid acquisition inference.
- League roster required-name validation, athlete creation, depth-chart tab, stats visibility/dialog.
- Real league fixture scheduling; match, team schedule, directory and admin reconciliation exposed date/roster inconsistencies.
- All seven Admin tabs inspected read-only, including counts and disabled email/cron diagnostics. No destructive admin operation.
- Account, profile, story, directory, free-agent, registration, league/team stats, team navigation and sandbox surfaces were visited; complete conditional/role matrices were not verified.
- Independent playbook, formation and play creation, formation presets, Slant route assignment, position notes, save/reload persistence, Run/Pause/Reset, Jet Motion, four opposing defensive presets and route-depth keyboard Home/End/ArrowDown.
- **35 initially current Play Designer Guide steps**, **9 Schedule Exhibition Game steps**, **10 completed-game Untimed Stat Keeper steps**, **24 Team Stat Leaders steps**.
- Native keyboard Guide focus/Enter/open/Escape/close/focus-return on completed-game scorer.
- One manually scored independent game, described below, finalized and reloaded; independent season leaderboards reconciled.

Individual scenario/control checkboxes were updated incrementally through dashboard UI. Checked means the stated inspection/test was actually performed; it does not erase a finding or imply that every surrounding condition passed.

## Disposable fixtures and manual game ledger

| Fixture | ID / details |
|---|---|
| Review Local League | `n5gniD6ODH7jvf34178p`, complimentary, four slots/automatically created teams |
| League Team1 | `NADIJdntjFPofq6riGo8`; Review Athlete, jersey 7, ATH + QB |
| League scheduled fixture | `nen4LUBQp5R7dWZhSSz0`, Team1 vs Team2, November 1, 10:00, Turf Field 1; no league plays entered |
| Review Independent | `UjArh8ErMZ7P1RNfpfnK`, complimentary |
| Independent completed game | `P5esUYfJCDqO7xDbewyr`, Review Opposition, November 2, 14:00, Review Turf |
| Playbook | Review Offense → Review Spread (5v5) → Review Slant |

Manual game sequence:

1. Add Review QB and Review Receiver through Add Player/Sub; jersey 1/2 appeared in player selection.
2. Save a complete pass for first down. Play Log becomes 1.
3. Cancel Undo: log remains 1. Confirm Undo: log becomes 0.
4. Save a complete pass QB → Receiver for a touchdown (+6).
5. Choose one-point conversion, No Good, confirm; possession flips.
6. Halftime confirmation changes to Second Half / 1st Down.
7. Game Over → Resume cancels finalization; repeat → Confirm Final Score succeeds.
8. Reload/direct navigation retains Final 6–0 and one total play.

Observed reconciled box score: Review QB 1/1 passing, 1 pass TD; Review Receiver 1 reception, 1 receiving TD; PAT 0/1. Independent season leaderboards show one completed game, QB passing TD/completion 1 and Receiver reception/receiving TD/total TD 1. The stale embedded scoreboard and pending-PAT statement are separately recorded above.

## Supporting automated evidence

Existing Vitest suites completed with exit 0:

`accountEmails`, `adminBusiness`, `securityWrite`, `securityPrivate`, `teamStatSummary`, `notificationRoutes`.

These are **six mocked API suites**, not live provider lifecycle or browser tests. Their passing result was not used to bulk-check UI scenarios, authorization matrices, payment lifecycle or external email behavior.

## Exact remaining gates

1. **Complete the remaining 1,598 checks.** All 138 entries have specific notes, but 119 remain In review. A complete launch verdict cannot be inferred from accounting alone.
2. Actual disposable **non-owner coach, roster-linked player, league admin and delegated scorer** contexts; direct URLs, private entities, wrong team/match, expiry/revocation and verified linked-email membership. Owner auth is available; this is unexecuted testing, not an unresolved login infrastructure blocker.
3. Full league workflow: registration, schedule builder/conflicts, scoring outcomes, penalties/returns/safeties, standings/playoffs, archive/start/reopen and history retention.
4. All independent/league scoring outcomes, edit/delete/retry/double-submit, completed/reopened behavior and reconciliation with player profiles and league leaderboards.
5. Remaining play designer branches: defensive authoring/custom zones, drag/draw/undo behavior, private player read-only permissions, Q&A, custom presets, print/PDF and armbands.
6. Complete laptop/phone × light/dark × role matrix, every conditional Guide/dialog/tab, native keyboard focus traps/labels, **200% zoom**, reduced motion, cold/slow/failed fetch and retry behavior.
7. Approved isolated payment sandbox/non-owner fixtures for paid success/decline/3DS/cancel/recovery, signed webhooks/replay/reordering, seats/renewal/cancellation, exactly-once entity creation, tax and legal gates. Stripe credentials and live state were not touched.
8. Offline/disposable email delivery and signed webhook/cron fixtures; notification queue suppression/retry, admin interest lifecycle, backups/restore, monitoring and rollback rehearsal.
9. Recheck the actual deployed revision and intended production configuration after defects are fixed. This local review does not approve production readiness.
