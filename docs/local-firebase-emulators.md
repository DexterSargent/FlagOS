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

### One account with multiple verified sign-in emails

York's staff panel counts **three people**, not seven addresses. Each coach's
configured addresses appear under their name. This grouping does not silently
merge Auth accounts or assert that the additional sign-ins have been connected.

Signed-in users can open **Manage connected emails** from sign-in settings,
the staff panel, or the profile account tab. Account settings at `/account`
require recent reauthentication of the primary account, followed by a separate
Google or email/password sign-in to prove ownership of the additional email.
Both addresses must be verified. The additional account must not already have
connections, and each primary account supports at most ten addresses.

After connecting, signing in through FlagOS with either address opens the same
primary Firebase UID and profile. Choose the account with the intended team
permissions as the primary account. Connections do not import the secondary
account's roles, reassign old data, delete Auth users, or merge existing player
records. In particular, connecting a coach address to another account does not
automatically grant that account platform administration. Team admin panels
group verified connected addresses for other teams too.

Disconnecting requires recent primary-account reauthentication. It removes the
connection, signs the current browser out, and revokes the primary account's
refresh sessions. Existing ID tokens can remain valid for up to one hour for
direct Firestore access; authenticated server APIs check revocation immediately.
The additional email can still sign in to its original, independent Auth account.

Connection records and email indexes are server-owned collections
(`account_email_connections`, `account_email_members`, `account_email_addresses`,
and `account_email_limits`), denied to clients by the default Firestore rules.
The server validates both ID tokens with revocation checks, checks current Auth
email/verification state, and binds connections transactionally. It never trusts
caller-supplied email addresses or destination UIDs as proof.

Production uses Firebase Admin custom-token signing to open the primary
identity after an additional-email login. The runtime service account must have
permission to sign tokens (IAM `iam.serviceAccounts.signBlob`, normally via
Service Account Token Creator on the signing service account). Signing or
connection lookup failures are explicit and sign out the attempted login;
there is no fallback to an apparently connected account.

With the isolated emulators and local app running, verify the actual UID
exchange, private-store denial, and disconnect flow with:

```powershell
$env:FLAGOS_TEST_EMULATORS = "true"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099"
npm test -- src/test/api/accountEmails.emulator.test.ts
```

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

Both live and clockless stat keepers rank player choices by the relevant
season/current-game statistic, then numeric jersey number and name; team
attribution stays last. York uses its team season history even without a
league ID. Interceptions, PBUs, sacks, flag pulls, passing, rushing and receiving
use their own categories. Clockless entry also supports interception-return
flaggers and successful-conversion player credit, while remaining timer-free.
Receiver choices exclude the selected passer in both modes.

Roster editors preserve up to ten positions per player, including labels from
saved playbook formations. In the roster's Depth Chart tab, team coaches can
create named formation-specific charts, assign players to multiple positions,
order each position's depth, and save the charts. Without a saved playbook,
standard offense and defense positions are available. Player access defaults
to off; enable "Allow rostered players to view depth charts" and save to publish
read-only charts to verified roster members. Charts are stored separately in
the server-only `team_depth_charts` collection, never in public team documents.
Turning access off and saving blocks subsequent player reads.

Playoff bracket lines follow explicit winner/loser feeder IDs, including byes
and double-elimination advancement; dashed lines indicate loser feeds.
The clockless play log and box score each have their own focusable scroll area.
In one-sided clockless tracking, team defense is implied: there is no generic
Team Defense choice or empty opponent-defense selector. Individual defensive
player credit remains available for the rostered team.
The async play-entry panel respects the bottom safe area and places Start Next Play
before the previous play's description. During entry, only the selection area scrolls;
play-result and conversion-save actions stay outside it and remain visible.
Both trackers collapse chosen outcomes, defenders, return flaggers and conversion
categories to editable summaries. Reopen a defensive summary to add shared credit,
change a player, or remove a selection. Conversion attempt value and result can
also be reopened without clearing player credit. Game setup controls stay on
the async idle screen so they do not displace active play-entry actions on mobile.
Result choices follow the live tracker: incomplete/PBU advances the down;
sacks, flag-for-loss and rushing losses allow loss of yards or safety;
completed passes/gains offer touchdown, out-of-bounds or first-down/short results
according to flag-pull credit; interceptions offer turnover or pick-six unless
the return was flagged. Required player selections are enforced only for known
rosters, so York can track an unrostered opponent without inventing player stats.

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
