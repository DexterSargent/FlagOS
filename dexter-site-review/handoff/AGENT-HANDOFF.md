# FlagOS site review — agent handoff (Antigravity or similar)

Paste the **Prompt** section below into Antigravity’s Agent Manager. Start one agent per lane if you want parallel work. Each agent needs the repo open as its workspace.

## Before you start (Dexter, about 3 minutes)

**First check what's already running:** visit http://127.0.0.1:4317 (dashboard) and http://localhost:3001 (app). If `firebase emulators:start` says *"Port 9099 is not open … port taken"*, the emulators are **already running** — that's fine, skip step 1 (don't kill them, or the review data is lost unless restarted with `--import`).

Run these from the **repo root** (`...\FlagLeagueApp\yuwffl-app`, not its parent folder), one per terminal, only for things not already running.

```powershell
# 1. Firebase emulators (needs Java 21). This restores the saved review fixtures and login.
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'; $env:PATH="$env:JAVA_HOME\bin;$env:PATH"
firebase emulators:start --only auth,firestore --project demo-flagos-local --import .\dexter-site-review\handoff\emulator-data

# 2. App pointed at the emulators (never at production)
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS='true'; $env:NEXT_PUBLIC_FIREBASE_PROJECT_ID='demo-flagos-local'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'; $env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
npx next dev -p 3001

# 3. Review dashboard
node .\dexter-site-review\serve.cjs   # http://127.0.0.1:4317
```

- If emulators are already running from the Copilot session, leave them running. Don’t restart them with `--import` unless they were stopped.
- The login is in `handoff\LOCAL-LOGIN.txt`. It is emulator-only and gitignored. Use email/password sign-in. The Google emulator popup does not work in embedded browsers.

## Prompt

> You are completing a manual QA review of FlagOS, a Next.js and Firebase flag-football league SaaS, before its live launch. Work only against the local emulator app at `http://localhost:3001`. Record results in the review dashboard at `http://127.0.0.1:4317`.
>
> **Read first:** `dexter-site-review/README.md`, `dexter-site-review/handoff/AGENT-HANDOFF.md` (this file), and `dexter-site-review/handoff/findings-so-far.md`.
>
> **Setup**
> 1. Open the dashboard and click **Import backup**.
>    - If you are the first or only agent, choose `dexter-site-review/handoff/review-progress.json` (261 checks done, 27 issues already logged).
>    - Dashboard progress lives in your browser’s localStorage, so import before doing anything else.
> 2. Confirm the dashboard settings:
>    - origin `http://localhost:3001`
>    - leagueId `n5gniD6ODH7jvf34178p`
>    - teamId `UjArh8ErMZ7P1RNfpfnK`
>    - teamMatchId `P5esUYfJCDqO7xDbewyr`
>    - demo off
> 3. Sign in to the app with the emulator account from `handoff/LOCAL-LOGIN.txt`. It is the platform admin, `dextersargent@flagos.ca`.
>
> **Your lane:** `<LANE NAME>`. Review only the dashboard entries listed for your lane in the lane table. Skip entries already marked Passed unless they show Stale.
>
> **How to review each entry**
> 1. Open it with the dashboard’s Open/Run link.
> 2. Perform each scenario in the browser.
> 3. Tick a checkbox **immediately** after you have actually observed that behaviour. Never tick ahead, in bulk, or from reading source code alone.
> 4. Set the verdict:
>    - **Passed:** only when every check and control is ticked.
>    - **Issue:** a real defect. Notes must include steps, expected vs actual result, viewport/theme, and the likely source file:line from the entry’s file map. Set priority.
>    - **Blocked:** only when it truly can’t be exercised locally, such as live Stripe or real email delivery. The note must say exactly what is missing. Never mark blocked because a role is missing; create the role fixture in the emulator instead (see the fixture rules below).
>    - **N/A:** needs a note.
>    - **Reviewing:** partly done.
> 5. Test each page at 1366×768 and 390×844, in light and dark themes, wherever the entry asks.
> 6. Use the in-page walkthrough (“Guide”) wherever one exists.
> 7. Every 10 entries, and at the end, click **Export backup**. Save the JSON as `dexter-site-review/handoff/lanes/<lane-slug>.json`, and also export the Markdown report as `<lane-slug>.md`.
>
> **Fixture rules:** You may create and modify data **through the app UI** in the emulator: extra users via sign-up, leagues, teams, games, plays, and invites. Keep a short fixture ledger in your lane Markdown.
>
> **Hard rules — never break these**
> - No production URLs (`flagos.ca`), no real Firebase project, no Stripe dashboard or live keys, no real payments, and no real emails.
> - Don’t use `/admin/sandbox` fake-data generation or bulk delete, and don’t delete shared fixtures (the IDs above).
> - Don’t edit source code, commit, push, deploy, or stop or restart running servers or emulators.
> - Don’t mark anything Passed that you didn’t personally observe in this session.
> - If a check fails because of your own test mistake, retry before logging an issue. Don’t duplicate issues already in `findings-so-far.md`; add a note to the existing entry instead.
>
> **Finish:** Export your lane backup and Markdown, then reply with:
> - entries passed / issue / blocked
> - the new issues ranked by severity, each with its file:line
> - anything you could not reach and why

## Lanes (for parallel agents)

Use the dashboard’s search and filter bar to find entries.

| Lane | Slug | Scope |
|---|---|---|
| 1. Public & account | `public-account` | Landing, pricing, login/sign-up, account and profile pages, join/invite flows, legal pages |
| 2. League operations | `league-ops` | League dashboard, settings/customizer, schedule, teams directory, standings and stats, join requests |
| 3. Team portal & playbook | `team-playbook` | Team pages, roster, depth chart, team schedule and exhibitions, playbook and play designer |
| 4. Game day & scoring | `game-day` | Stat keeper (timed and untimed), play-by-play, live/final scoreboards, game summaries |
| 5. Admin, billing & APIs | `admin-billing` | Platform admin (health, activity, finance, ledger, deletes), billing gates (checkout stays disabled), API entries (developer-assisted, isolated data only) |
| 6. Cross-cutting | `cross-cutting` | The 8 journeys, the viewport/theme matrix, walkthrough guides, and keyboard/screen-reader accessibility passes |

Parallel agents share the same emulator, so lanes 2–4 should create their own fixtures rather than editing each other’s. Each agent imports `review-progress.json` first, so all lanes start from the same baseline.

## Combine into one review

```powershell
node .\dexter-site-review\handoff\merge-reviews.cjs .\dexter-site-review\handoff\FINAL-review.json .\dexter-site-review\handoff\review-progress.json (Get-ChildItem .\dexter-site-review\handoff\lanes\*.json).FullName
```

Then **Import backup** → `FINAL-review.json` in your dashboard and use **Export Markdown** for the consolidated report.

How the merge works:
- Checks from all lanes are combined; a check counts if any lane ticked it.
- The most severe verdict wins, in this order: issue > blocked > reviewing > passed > N/A.
- Notes from every lane are kept and tagged with their lane.

You can also ask one agent to “merge the lane files and write `handoff/FINAL-review.md` grouping all issues by severity with file:line and repro steps.”

## Files in this folder

- `review-progress.json`: dashboard backup at 261/1735 checks (taken at handoff time).
- `findings-so-far.md`: issues found so far, with sources (from the 137-check point; the dashboard notes have all 27).
- `emulator-data/`: emulator snapshot (fixtures and login). Gitignored.
- `LOCAL-LOGIN.txt`: emulator-only credentials. Gitignored.
- `merge-reviews.cjs`: lane merger.
