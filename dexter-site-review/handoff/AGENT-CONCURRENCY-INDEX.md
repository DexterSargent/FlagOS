# Multi-Agent Concurrency & Orchestration Index

This guide coordinates 6 concurrent Antigravity QA agents across isolated lanes.

---

## 1. Active Shared Infrastructure

The environment services are active and running:
* **Firebase Emulators:** Project `demo-flagos-local` on ports `8080` (Firestore) and `9099` (Auth).
* **FlagOS App:** `http://localhost:3001`
* **Review Dashboard:** `http://127.0.0.1:4317/dexter-site-review/`

---

## 2. Shared Concurrency Protocol & Baseline Data

Every agent references these shared files:
1. **Concurrency Protocol:** [`SHARED-CONCURRENCY-PROTOCOL.md`](./SHARED-CONCURRENCY-PROTOCOL.md)
2. **Review Progress Baseline:** [`review-progress.json`](./review-progress.json) (imported into each dashboard)
3. **Known Issues So Far:** [`findings-so-far.md`](./findings-so-far.md) (27 defects already documented)
4. **Local Credentials:** [`LOCAL-LOGIN.txt`](./LOCAL-LOGIN.txt) (`dextersargent@flagos.ca` / `LocalReviewOnly-2026!`)

---

## 3. Dedicated Agent Workspaces & Prompts

Click **New Conversation** (`+`) in Antigravity for each lane, and paste the corresponding prompt:

| Lane | Scope | Workspace Folder & Prompt | Fixture Tag |
|---|---|---|---|
| **1. Public & account** | Landing, pricing, login/sign-up, profile, account, join/invite, legal | [`lanes/lane-1-public-account/PROMPT.md`](./lanes/lane-1-public-account/PROMPT.md) | `[L1-QA]` |
| **2. League operations** | Dashboard, customizer/settings, schedule, teams directory, standings/stats | [`lanes/lane-2-league-ops/PROMPT.md`](./lanes/lane-2-league-ops/PROMPT.md) | `[L2-QA]` |
| **3. Team portal & playbook** | Team pages, roster, depth chart, team schedule/exhibitions, playbook designer | [`lanes/lane-3-team-playbook/PROMPT.md`](./lanes/lane-3-team-playbook/PROMPT.md) | `[L3-QA]` |
| **4. Game day & scoring** | Stat keeper (timed/untimed), play-by-play, scoreboards, box scores | [`lanes/lane-4-game-day/PROMPT.md`](./lanes/lane-4-game-day/PROMPT.md) | `[L4-QA]` |
| **5. Admin, billing & APIs** | Platform admin console, billing gates, isolated API entries (no sandbox bulk gen) | [`lanes/lane-5-admin-billing/PROMPT.md`](./lanes/lane-5-admin-billing/PROMPT.md) | `[L5-QA]` |
| **6. Cross-cutting** | 8 journeys, 4 viewport/theme passes, walkthrough guides, a11y checks | [`lanes/lane-6-cross-cutting/PROMPT.md`](./lanes/lane-6-cross-cutting/PROMPT.md) | `[L6-QA]` |

---

## 4. Consolidating All Reviews

When all lanes finish and save their JSON files to `dexter-site-review/handoff/lanes/*.json`, run this merge command in PowerShell:

```powershell
node .\dexter-site-review\handoff\merge-reviews.cjs .\dexter-site-review\handoff\FINAL-review.json .\dexter-site-review\handoff\review-progress.json (Get-ChildItem .\dexter-site-review\handoff\lanes\*.json).FullName
```

Then in the review dashboard at `http://127.0.0.1:4317/dexter-site-review/`:
1. Click **Import backup** -> choose `FINAL-review.json`.
2. Click **Export report** to generate the final consolidated markdown document `FINAL-review.md`.
