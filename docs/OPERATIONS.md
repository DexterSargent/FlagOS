# Operations

Low-maintenance runbook for the production project `flagfootballleaguemachine`.

## Backups

A Firestore daily backup schedule already exists (30-day retention).

```powershell
npx -y firebase-tools@latest firestore:backups:schedules:list --project flagfootballleaguemachine
npx -y firebase-tools@latest firestore:backups:list --project flagfootballleaguemachine
```

Restore a backup into a **new** database (never overwrite `(default)` directly):

```powershell
npx -y firebase-tools@latest firestore:databases:restore --project flagfootballleaguemachine `
  --database restore-test --backup <backup-resource-name>
```

Restore test (do this once a quarter): restore the latest backup to `restore-test`, open it in the
Firebase console, spot-check a league, team and match, then delete the test database:

```powershell
npx -y firebase-tools@latest firestore:databases:delete restore-test --project flagfootballleaguemachine
```

## Platform health job

`POST /api/cron/platform-health` runs a read-only health scan (integrity, renewals, seasons ending,
stale/test records, unverified admins). It is called daily by `.github/workflows/platform-health.yml`
and is throttled to one run per 20 hours. It:

- stores the report in `platform_reports/latest` (also shown in the admin console **Health** tab);
- emails a weekly digest to the platform admins;
- emails league admins once per season when their season is about to end (rollover reminder).

Nothing is ever deleted automatically; stale records are listed for review only.

### Optional configuration

| Setting | Where | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | App Hosting secret **and** GitHub Actions secret | Locks the endpoint to the scheduler and allows `?force=1`. |
| `RESEND_API_KEY` | App Hosting secret | Enables email (digest and reminders). Verify the `flagos.ca` domain in Resend first. |
| `REPORT_FROM_EMAIL` | App Hosting env | Sender, default `FlagOS <reports@flagos.ca>`. |
| `PLATFORM_REPORT_EMAILS` | App Hosting env | Comma-separated digest recipients (defaults to `PLATFORM_ADMIN_EMAIL`). |

Create a secret and grant the backend access:

```powershell
npx -y firebase-tools@latest apphosting:secrets:set CRON_SECRET --project flagfootballleaguemachine
```

Then reference it in `apphosting.yaml` under `env` (`- variable: CRON_SECRET` / `secret: CRON_SECRET`).
Only add `secret:` references after the secret exists, otherwise the build fails.

## Deleting leagues

Platform-admin league deletion permanently removes the league's games and recorded plays
(including plays stored without a league ID). The confirmation defaults to deleting all
member teams and their rosters, private player details, playbooks, depth charts and
team-managed games. Alternatively, explicitly choose **Keep member teams** to detach them.
Keeping teams does not create independent billing accounts or activate paid subscriptions.
The API requires an explicit boolean `deleteTeams` choice.
Cleanup runs in batches of at most 400 deletes; games are removed only after all their plays.
If a request fails during cleanup, retry the same `delete_league` request with the original
league ID and the same `deleteTeams` choice. It is safe to retry even if the league document
has already been removed. Teams selected for deletion retain their league link until their
data has been purged, so retries can find any unfinished team cleanup.

## Deploys

- App: push to `main` (Firebase App Hosting builds automatically).
- Rules: `npx -y firebase-tools@13.35.1 deploy --only firestore:rules --project flagfootballleaguemachine`
