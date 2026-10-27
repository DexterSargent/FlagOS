# Dexter's FlagOS site review

This folder is a standalone, private review workspace. It is **not a new app route**,
does not run Firebase or Stripe, and never writes FlagOS records. No deployment is
needed. The dashboard uses local files and browser storage; it loads no external
scripts, fonts or analytics.

## Open it

From a PowerShell terminal at the repository root:

```powershell
node .\dexter-site-review\serve.cjs
```

Open <http://127.0.0.1:4317/dexter-site-review/>.

Keep the terminal open while reviewing. Ctrl+C stops the review server, not the
FlagOS app. This server binds only to loopback, accepts only reads, and serves the
review files plus allowlisted source/docs/assets. It does not serve environment
files, credentials, Git internals or dependencies. Do not expose it through a tunnel.
Opening [index.html](index.html) directly also works, but browser `file:` storage
and source-link handling vary. The local server gives stable storage and readable
source files. Use the same host and port each time to find your saved progress.

## Recommended review order

1. Set **Site origin** to `https://flagos.ca` for read-only production observations
   or your running isolated local app's origin for write tests.
2. Paste league, team, league-match and team-match IDs from the app's address bar.
   A name/shortcode is not necessarily an ID. Missing IDs disable relevant links.
3. Open the league dashboard before `/schedule`, `/teams` or `/stats`; those routes
   follow the app's active league. `/join` links receive `?league=YOUR_ID`.
4. Start in **Pages**. Each route has role-specific tasks, four viewport/theme
   checks, guide/accessibility/state checks and source-tour target spot-checks.
5. In each expanded entry, open its parent page and all relevant tabs/dialogs.
   Check each task only after observing it. Compare multiple roles using separate
   test accounts/browser profiles. Record the role, actual URL, browser, theme,
   viewport, screenshot name and reproduction steps in evidence/notes.
6. Review **Components & layouts**. This includes component files, inline page
   views, layouts, providers and loading UI outside `src/components`. The edit map
   shows exact source files, named component functions and direct local imports.
   Parent-route links are static import reachability, **not proof of rendering**:
   guards, role checks, inactive tabs and dynamic branches affect visibility.
7. Complete **Journeys & launch gates**, especially game reconciliation,
   independent-team data preservation, settings, permissions and billing lifecycle.
8. Use **API checklist** for developer-assisted isolated requests. No API execution
   buttons are provided; webhooks and cron routes are not ordinary browseable pages.
9. Check **Source atlas** to find source and test files by symbol/path. **Resources**
   links existing runbooks, brand assets, design/copy guidance and configuration.
10. Export a JSON backup and a Markdown report after each session.

## Verdicts and saved progress

- **Not reviewed / In review:** still unfinished.
- **Passed:** requires all scenario and control checkboxes. This is your manual
  verdict, not proof of automated or production correctness.
- **Needs fixes:** notes required; use **Launch blocker** priority for release-stoppers.
- **Blocked / Not applicable:** reason required. Blocked is **not** counted as
  reviewed; N/A is accounted for separately and is not a pass.
- Clearing a check on a passed item changes it back to In review.
- Source fingerprints detect changes after regenerating inventory. Old passes are
  flagged for re-review and excluded from the passed count.
- All progress/settings live in this browser's localStorage under
  `flagos.dexter-site-review.v1`. No progress is sent to the app or committed to Git.
  Clearing site data, incognito expiry, changing browsers/ports or moving a directly
  opened HTML file can lose or separate progress.
- If storage is unavailable/full, a visible warning appears: export immediately.
- Import is a **replacement**, not a merge; confirm it only after exporting current
  progress. Invalid backups do not replace current progress. Unknown removed entries
  are ignored; new entries start unreviewed. Backups are versioned JSON.
- Export report includes **every** item and all notes, even when filters are active.
  Print includes only the current filtered view. Report is a snapshot; only JSON
  backup restores the dashboard.
- Keep exports/screenshots private. Never put API keys, passwords, scorer tokens,
  private member contact details or production document dumps in notes.

## What edits what?

| Area | Primary edit locations |
| --- | --- |
| Public/signed-in home | `src/app/page.tsx`, `src/components/home/SignedInHome.tsx` |
| Public directory, story, pricing | Matching `src/app/<route>/page.tsx`; per-page guides in `src/lib/walkthroughs/public.ts` |
| Shared navigation/footer/theme | `src/components/GlobalShell.tsx`, header/footer/menu components, `src/lib/themeContext.tsx`, `src/app/globals.css` |
| Authentication and memberships | `src/app/login/page.tsx`, `src/lib/authContext.tsx`, `src/components/AuthGuard.tsx`, account-email helpers |
| League dashboard role views | `src/app/league/[id]/page.tsx`, `src/components/league/dashboard/*`, `src/lib/useLeagueDashboardData.ts` |
| League settings | `src/components/LeagueCustomizerContent.tsx`, `src/components/LeagueCustomizerModal.tsx`, `src/lib/leagueContext.tsx` |
| Schedule and playoffs | `src/app/schedule/page.tsx`, `src/components/schedule/*`, schedule/standings helpers |
| Team portal | `src/app/teams/[id]/page.tsx`, child pages/layout, `src/components/team/*` |
| Depth charts and positions | `src/components/TeamDepthCharts.tsx`, `src/lib/depthChart.ts`, secure write handler |
| Play designer and print | `src/app/teams/[id]/playbook/page.tsx`, `src/components/playbook/*`, `src/lib/playbookTypes.ts` |
| Scorekeeper | Play-by-play route wrapper, its `AdminView.tsx` and `ViewerView.tsx`, `src/components/AsyncPlayByPlayManager.tsx`, `src/components/play-by-play/*` |
| Match/season stats | `src/app/matches/[id]/page.tsx`, team stats page, `src/lib/teamStatsCalculator.ts`, `src/lib/teamSeasonAggregation.ts` |
| Admin tabs/dialogs | `src/app/admin/page.tsx`, `src/components/admin/*` |
| Walkthrough targets/copy | Page/component `data-tour` attributes, `src/lib/pageGuide.tsx`, `src/lib/walkthroughData.ts`, `src/lib/walkthroughs/*`, walkthrough components |
| Branding/loading | `src/components/FlagOSLogo.tsx`, `FlagOSText.tsx`, `FlagOSLoader.tsx`, `public/*`, `src/app/favicon.ico` |
| Billing | `src/lib/billingServer.ts`, `billingClient.ts`, billing/webhook routes, pricing and subscription UI |
| Notifications | Notification server/types/templates, admin notifications, cron and Resend webhook routes |
| Permissions and persistence | `firestore.rules`, secure write/private routes, role/access helpers and Firebase providers |

The dashboard's generated edit maps are the detailed, current source of truth for
import paths. Relative file links show local source in the read-only server. **VS Code**
links ask the OS/editor to open the absolute file and optional target line. Browser
approval may be needed; there are no GitHub-source links pretending uncommitted work
is deployed.

## Safety and known launch prerequisites

- Production review is observational. Deletion, new entities, play edits, season resets,
  fake-data generation, billing and real emails belong in disposable isolated data.
- `/admin/sandbox` is a real data-writing tool, **not** a safe database emulator by name.
  Its generation code can update the first matches of the connected database.
- A `demo=true` link is not a permission bypass or universal isolation guarantee.
  Verify the environment and actual data context before saving.
- Owner complimentary flow does not test paid signup. Use verified non-owner test
  accounts for Stripe scenarios.
- Billing is not financially signed off: real Checkout/webhook end-to-end tests,
  approved 14-day grace behavior, pending payment recovery, environment isolation,
  risk review and tax/legal readiness remain explicit gates. See the existing
  [Stripe walkthrough](../docs/STRIPE-SETUP-WALKTHROUGH.md).
- API lists are verification prompts, not authorization to run jobs against production.
- No real data, credentials or user-specific fixtures were bundled into this folder.

## Keep inventory current

After changing app source:

```powershell
node .\dexter-site-review\refresh-inventory.cjs
```

Then reload the review dashboard. This parses TypeScript/TSX syntax with the installed
TypeScript dependency: page routes, layouts, local static/dynamic imports, component
functions, literal/dynamic `data-tour` attributes, API methods and tests. It reads the
current worktree (including uncommitted source), not production. It never reads `.env`
or secret values. Generated timestamp and Git HEAD are displayed, but HEAD alone
does not describe uncommitted work.

New pages are inventoried automatically; add their role-specific scenarios to
[review-plan.js](review-plan.js). All source-tour controls are collected, but controls
without `data-tour` markers still require the explicit whole-component manual checks.
The import graph cannot resolve arbitrary runtime imports/computed paths or guarantee
every possible state. No output of this tool is an automatic review pass.

## Files in this folder

- [index.html](index.html): standalone dashboard shell.
- [style.css](style.css): responsive and print styling.
- [app.js](app.js): checklist, filters, source maps, persistence and backup/report handling.
- [review-plan.js](review-plan.js): curated page scenarios, journeys and resource links.
- [inventory.js](inventory.js): generated worktree map; safe to regenerate.
- [refresh-inventory.cjs](refresh-inventory.cjs): parser-based inventory generator.
- [serve.cjs](serve.cjs): loopback-only, read-only local file server.
- [verify.cjs](verify.cjs): inventory/server/browser verification.

Validation (uses existing TypeScript and Playwright packages):

```powershell
node .\dexter-site-review\verify.cjs
```

The browser checks use their own ephemeral review origin, never your app or saved
personal review. They start/stop a short-lived server and verify progress, notes,
search, backup/import, URL parameters, mobile fit and source/resource coverage.
