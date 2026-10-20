# Local Firebase emulator workflow

Local development is deliberately prevented from reaching the production
Firebase project. Start Auth and Firestore emulators and configure the Next.js
process to use the `demo-flagos-local` project before opening the app.

## Start the emulators

In PowerShell window 1:

```powershell
cd "C:\Users\dexte\OneDrive\Documents\FlagLeagueApp\yuwffl-app"
npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-flagos-local
```

Keep this window open. The Emulator Suite UI is at `http://127.0.0.1:4000`,
Firestore is at `127.0.0.1:8080`, and Auth is at `127.0.0.1:9099`.

## Start the app against the emulators

In PowerShell window 2, set the environment variables before starting Next.js:

```powershell
cd "C:\Users\dexte\OneDrive\Documents\FlagLeagueApp\yuwffl-app"
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATORS = "true"
$env:NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-flagos-local"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
npm run dev
```

Use a fresh development-server process after changing these variables; Next.js
embeds `NEXT_PUBLIC_` values into the browser bundle at startup. The server-side
Admin SDK uses the emulator host variables for Firestore and Auth. Local
development fails closed if emulator mode is not enabled, if the project ID
does not use the expected demo project, or if the emulator host settings do not
match.

In emulator mode, omitted Admin SDK host variables default to the loopback
addresses above. Explicit non-loopback or mismatched host settings are rejected.
Production still rejects emulator mode.

The demo project is isolated from production and starts empty unless emulator
data is explicitly imported. To seed test data, write it to the emulator only
or use the Emulator Suite UI. Do not use `--import` with a production export.

## York independent-team regression tests

The York staff allowlist supports both head-coach addresses for Dexter Sargent,
all three defensive-coordinator addresses for Theo Brown, and both
offensive-coordinator addresses for Justin Fawcett. Coaches must sign in with
a verified email address. The additional York addresses confer team access,
not platform administration. Only the head coach may delete team assets.
No passwords or production accounts are provisioned by this configuration.

With the emulators and app running, exercise actual authenticated API writes
and cross-coach persistence:

```powershell
$env:FLAGOS_TEST_EMULATORS = "true"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
npm test -- src/test/api/yorkFunctionality.emulator.test.ts
```

This opt-in suite seeds York fixtures into `demo-flagos-local` only, creates
temporary verified emulator identities, tests all seven coach emails, creates
an exhibition against an external opponent, logs a touchdown, finalizes the
game, and reads it as another coach. Temporary identities and game records
are removed afterward; seed fixtures remain for browser checks until the
emulators stop.

Public game links must open viewers, not stat-keeping controls. The direct
team stat-keeper route also renders read-only box scores for spectators.
Roster and scheduling failures must not close the form as though a shared
save succeeded. Offline play logging explicitly warns when a play exists
only on the current device; it is not an automatic synchronization queue.
Season totals merge seed, device-local and shared records by ID.

Game details, synchronous administration, clockless stat keeping, and the live
spectator scoreboard use the same team-palette subscription. Saved primary and
secondary colors update without reloading; spectator scorecards, possession
indicators, and box-score team tabs no longer assign generic cyan/blue by side.
York's red/white/black seed palette is the offline fallback. Team-logo icons
also honor the configured primary color outside demos. Color edits are cached
only after the shared team save succeeds, so a failed save is not advertised
as persisted across devices.

Changes to Firestore rules must be deployed separately from the application
before validating these permissions in production. A Git push alone does
not prove production rule deployment or real-account sign-in.

## Provisioning York's shared records

The browser fixtures are an offline fallback, not a substitute for shared
Firestore documents. Run a dry run first:

```powershell
node scripts\provisionYorkTeam.cjs --project flagfootballleaguemachine
```

After reviewing the target project, an authorized operator can append
`--apply` using Application Default Credentials for that project. This adds
missing seed players, private player contacts, games, and plays; updates the
three coaching names and seven authorized staff emails; and preserves existing
records and custom branding. It never creates passwords or Auth accounts.
Provisioning is idempotent, but deliberately re-adds missing seed documents;
it is an initial setup/migration tool, not a recurring synchronization job.

For emulator-only setup, set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and use
`--project demo-flagos-local --apply`. The script rejects demo provisioning
without the emulator and rejects emulator provisioning for a production project.
Deploy the related rules and indexes with the normal Firebase release process.

## Stop

Press `Ctrl+C` in the emulator terminal and in the Next.js terminal when done.
