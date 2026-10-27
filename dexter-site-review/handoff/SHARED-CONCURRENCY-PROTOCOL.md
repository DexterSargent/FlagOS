# FlagOS Multi-Agent Concurrency Protocol

This document establishes the concurrency rules, isolation boundaries, and shared resources for the 6 parallel QA agents running simultaneous manual reviews on FlagOS.

---

## 1. Shared Infrastructure (Do NOT Restart or Alter)

All 6 agents execute against the same local services running on this machine:
* **Firebase Emulators:**
  * Project ID: `demo-flagos-local`
  * Firestore Emulator: `http://127.0.0.1:8080`
  * Auth Emulator: `http://127.0.0.1:9099`
  * Emulator UI: `http://127.0.0.1:4000`
* **FlagOS App:** `http://localhost:3001`
* **Review Dashboard:** `http://127.0.0.1:4317/dexter-site-review/`

> **CRITICAL RULE:** Do NOT stop, restart, or kill the emulators or web servers. Do NOT commit code, edit source files, or deploy.

---

## 2. Protected Baseline Fixtures (Read-Only Shared Data)

The following baseline fixtures were restored into the emulator from `emulator-data/`. **Never delete, archive, or alter these records**, as multiple agents rely on them:
* **League ID:** `n5gniD6ODH7jvf34178p`
* **Team ID:** `UjArh8ErMZ7P1RNfpfnK`
* **Match ID:** `P5esUYfJCDqO7xDbewyr`
* **Platform Admin Login:** `dextersargent@flagos.ca` / `LocalReviewOnly-2026!` (see `LOCAL-LOGIN.txt`)

---

## 3. Fixture Namespacing (Concurrency Collision Avoidance)

If your test scenario requires mutating or creating data (users, teams, leagues, games, plays, invites), you **must prefix every entity** using your lane tag. This guarantees zero race conditions or collisions with other parallel agents:

| Lane | Prefix Tag | Example Created Entity |
|---|---|---|
| **Lane 1: Public & account** | `[L1-QA]` | Email: `qa-l1-user@test.local`, Name: `[L1-QA] Free Agent John` |
| **Lane 2: League ops** | `[L2-QA]` | League: `[L2-QA] Tuesday Metro League` |
| **Lane 3: Team portal** | `[L3-QA]` | Team: `[L3-QA] Thunderbirds`, Play: `[L3-QA] Jet Slant` |
| **Lane 4: Game day** | `[L4-QA]` | Match: `[L4-QA] Exhibition Week 1` |
| **Lane 5: Admin & billing** | `[L5-QA]` | Customer: `[L5-QA] Org Review` (Never touch `/admin/sandbox` generator) |
| **Lane 6: Cross-cutting** | `[L6-QA]` | Read-only primarily; use `[L6-QA]` if journey requires a new entity |

Record any fixtures you create in your lane's `FIXTURES.md`.

---

## 4. Browser & localStorage Concurrency Protocol

Review progress is maintained inside browser `localStorage` on origin `http://127.0.0.1:4317`. To prevent agents from overwriting each other’s browser state:
1. **Isolated Browser Profiles:** Each agent must run in its own browser session / subagent context (or private/incognito profile).
2. **Mandatory First Step:** Open `http://127.0.0.1:4317/dexter-site-review/` and click **Import backup**, selecting:
   `dexter-site-review/handoff/review-progress.json`
3. **Filter to Your Lane:** Use the top filter / search bar to display only your lane's entries.
4. **Periodic & Final Exports:**
   * Every 10 entries and upon completion, click **Export backup** and save the JSON into your lane's workspace directory:
     `dexter-site-review/handoff/lanes/<lane-slug>/<lane-slug>.json` (and root `handoff/lanes/<lane-slug>.json`).
   * Click **Export report** (Markdown) and save it to:
     `dexter-site-review/handoff/lanes/<lane-slug>/<lane-slug>.md` (and root `handoff/lanes/<lane-slug>.md`).

---

## 5. Consolidated Review Merging

When all 6 lanes finish, a single command merges the 6 lane backups cleanly:

```powershell
node .\dexter-site-review\handoff\merge-reviews.cjs .\dexter-site-review\handoff\FINAL-review.json .\dexter-site-review\handoff\review-progress.json (Get-ChildItem .\dexter-site-review\handoff\lanes\*.json).FullName
```

The merge script:
* Combines all checked items (OR logic).
* Takes the highest severity status (`issue` > `blocked` > `reviewing` > `passed` > `na`).
* Preserves all notes, tagging each note with its `[<lane-slug>]` source.
