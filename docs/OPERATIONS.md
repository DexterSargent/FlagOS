# Operations

Low-maintenance runbook for the production project `flagfootballleaguemachine`.

## Walkthrough and form checks

Run `npm run audit:contrast -- http://localhost:3001` against a running local app
(use its actual port). It checks public pages at phone and laptop sizes in both themes.
For settings, team/roster forms, scheduling dialogs and their available guide steps:

```powershell
$env:CONTRAST_INTERACTIVE = "1"
npm run audit:contrast -- http://localhost:3001
```

Interactive checks use the local demo as league admin and team admin. They open drafts
but never save, create customer records or change real games. The command fails for
contrast violations, clipped dialogs or controls overflowing outside an intentional
horizontal scroll area. Set `CONTRAST_SCREENSHOTS` to a local output directory to save
screenshots and measured results for visual review. Review those images as well:
automated contrast checks do not prove that copy, focus order or every custom colour is correct.
Walkthrough copy follows the [verified copy library](../.agents/verified_copy_library.md)
and [verified design library](../.agents/verified_design_library.md); describe current
controls and permissions rather than promising future billing or access behaviour.

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
Emails are now queued durably, not sent inside the scan. A queued reminder is not proof
of delivery. Existing `digestSentAt` and previously sent rollover markers are respected.

### Optional configuration

| Setting | Where | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | App Hosting secret **and** GitHub Actions secret | Locks the endpoint to the scheduler and allows `?force=1`. |
| `RESEND_API_KEY` | App Hosting secret | Resend sending key; see notification activation below. |
| `REPORT_FROM_EMAIL` | App Hosting env | Legacy sender fallback when `NOTIFICATION_FROM_EMAIL` is unset. |
| `PLATFORM_REPORT_EMAILS` | App Hosting env | Comma-separated digest recipients (defaults to `PLATFORM_ADMIN_EMAIL`). |

Create a secret and grant the backend access:

```powershell
npx -y firebase-tools@latest apphosting:secrets:set CRON_SECRET --project flagfootballleaguemachine
```

Then reference it in `apphosting.yaml` under `env` (`- variable: CRON_SECRET` / `secret: CRON_SECRET`).
Only add `secret:` references after the secret exists, otherwise the build fails.

## Branded operational notifications

The first release covers weekly platform reports, one reminder per league/season, and
an admin alert for each new free-agent interest submission. The submission and its alert
are committed in the same Firestore batch. Submitters are **not** emailed automatically:
the public form must not become a way to send email to an unverified third party.
Account verification and password reset still use Firebase Authentication; game reminders,
membership invitations, optional notification preferences, and an in-app inbox are not
implemented by this release.

### Delivery guarantees and limits

- HTML uses the current FlagOS emblem, readable inline styles, a clear action, a fallback
  link, escaped text, and a plain-text alternative. Every recipient gets a separate email.
- `notification_outbox` stores immutable rendered requests. A deterministic event/recipient
  ID prevents duplicate enqueueing; transactions and two-minute leases prevent concurrent
  workers from claiming the same send. Network timeout is ten seconds.
- Resend receives the same idempotency key and payload on each retry. At most six attempts,
  with waits of 1, 5, 15, 60 and 180 minutes. Scheduler cadence can make waits longer.
  Uncertain sends stop being retried after 23 hours from the first attempt, within Resend's
  24-hour key retention. Never manually requeue an uncertain send without checking Resend.
- A worker handles at most 20 messages. GitHub Actions runs every 15 minutes when enabled;
  its timing is best-effort, not suitable for urgent game notifications. Higher volume or
  time-sensitive events require Cloud Tasks/Scheduler before enabling those events.
- `accepted` means the send API returned a message ID. `delivered` comes from a signed
  webhook and means acceptance by the recipient's mail server, not inbox placement or reading.
- Webhooks use Svix verification against the **raw** bounded body, including timestamp
  validation. Duplicate and out-of-order delivery events cannot undo complaints or bounces.
  `notification_suppressions` blocks future sends after permanent bounces or complaints.
  No open/click tracking is implemented.
- Both collections are server-only under the existing default-deny Firestore policy.
  Only the verified platform admin can inspect metadata or request a test/process action.
  Bodies and API keys are not returned to the admin browser.

### Activate sending

Sending and the new workflow are off by default. No email provider credentials are checked in.

1. Verify `flagos.ca` in Resend. Add its required SPF/DKIM records without creating a second
   conflicting SPF record; configure a monitored DMARC policy after checking alignment.
   Confirm the reply mailbox actually receives mail.
2. Create a Resend webhook for `https://flagos.ca/api/webhooks/resend` subscribed to
   `email.delivered`, `email.bounced`, `email.complained`, and `email.failed`.
3. Create `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, and `CRON_SECRET` in App Hosting Secret
   Manager, grant this backend access, and only then add their `secret:` references under
   `env` in `apphosting.yaml` with runtime availability. Use the **same** `CRON_SECRET`
   in GitHub Actions secrets. The webhook signing secret is not the sending API key.
4. Review sender/reply-to settings in `apphosting.yaml`. The sender must be an `@flagos.ca`
   address on the verified domain. Set `NOTIFICATION_EMAIL_ENABLED` to `"true"` in that file
   and deploy. Keep the GitHub repository variable of the same name off for now.
5. Open **Admin > Health > Notification delivery**. Confirm there are no configuration
   issues. Review all queued messages for stale content before clicking **Process queue**:
   this sends eligible queued operational messages, not just tests.
6. Queue a test to the signed-in admin email and process the queue. Test requests in the same
   ten-minute bucket reuse a message. Verify the HTML and text, reply routing, provider
   acceptance, and the signed delivery webhook. Use Resend's test addresses through a
   controlled non-production test fixture to verify bounce/complaint suppression.
7. Set GitHub Actions repository variable `NOTIFICATION_EMAIL_ENABLED=true`. Run the
   Notification delivery workflow manually once, then verify scheduled runs. Cron rejects
   missing/wrong authentication even if no secret has been configured. Configuration failures
   return 503 and newly terminal send failures return 502 so the workflow visibly fails.

### Failure response

Use **Refresh email status** to inspect configuration, complete state counts and the 50 newest
messages. A queued message with attempts may be waiting for a retry; do not create duplicates.
For `failed`, check the generic error and the provider dashboard. Correct configuration before
creating replacement emails; an ambiguous timeout could already have delivered the original.
For bounces/complaints, confirm the correct address and permission to contact the recipient
before any suppression removal. There is intentionally no bulk resend or suppression-clear
button. Firestore/worker failures are logged and webhook failures return 5xx for provider replay.

The outbox currently retains bodies and event IDs; it has no automatic purge. Do not enable TTL
on whole outbox records without retaining event-ID tombstones, or replayed business events could
send twice. Add a reviewed payload-retention policy before increasing event volume.
Monitor scheduler failures separately from email; a broken email provider cannot deliver its
own incident alert. See the [financial automation plan](FINANCIAL-AUTOMATION-PLAN.md) for rollout
gates, financial messaging, and the next notification phases.

### Test without sending email

Unit and route tests mock the provider, including raw signed webhook requests:

```powershell
npx vitest run --maxWorkers=2 src/test/lib/notificationEmail.test.ts src/test/lib/notificationsServer.test.ts src/test/lib/platformJobs.test.ts src/test/api/notificationRoutes.test.ts src/test/components/AdminNotifications.test.tsx
```

For real Firestore transactions, start the isolated `demo-flagos-local` emulators as described
in [local development](local-firebase-emulators.md), then:

```powershell
$env:FLAGOS_TEST_EMULATORS = "true"
npx vitest run --maxWorkers=1 src/test/api/notifications.emulator.test.ts
```

The opt-in suite verifies concurrent producer/worker deduplication, atomic event/outbox writes,
bounce suppression, and client read denial against actual rules. It refuses to process an
emulator that already has due messages, mocks every provider request, and removes its fixtures.
It never connects to production Firestore or delivers email.

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
