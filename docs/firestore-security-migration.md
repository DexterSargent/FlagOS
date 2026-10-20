# Firestore security migration

The current rules and trusted write API expect league, team, and player contact
fields to live in the private collections `league_private`, `team_private`, and
`player_private`. The rules intentionally deny client reads of those private
collections. They also deny public reads of legacy records while those records
still contain contact fields.

## Migration scope and legacy records

The migration processes the plural top-level collections `leagues`, `teams`,
`players`, `matches`, `plays`, and `red_plays`. A zero count in those
collections does not mean the database is empty. It does not migrate the legacy
singleton `league/settings`, user profile documents, or team subcollections.
The script reports whether `league/settings` exists and leaves it unchanged.

For the confirmed `flagfootballleaguemachine` `(default)` database, the legacy
singleton is intentionally being kept separate from `leagues/{leagueId}`.
`users/{uid}` documents contain account-private data and are restricted to the
owning user by the proposed rules. A `teams/{teamId}/meta/playbook` document
whose parent team document is missing is also outside the migration; preserve
it until its association and retention needs have been reviewed. Do not infer
that a missing parent means its subcollection data is safe to delete.

Before deploying rules or application changes, confirm the rules currently
deployed to Firestore and verify that legacy paths remain inaccessible to other
users. The rules in this repository are proposed changes and are not deployed
by the migration script.

## Before rollout

1. Back up the Firestore database and confirm the target Firebase project.
2. Confirm the App Hosting service identity can read and write Firestore and
   verify Firebase Auth ID tokens.
3. Run the migration in dry-run mode:

   ```powershell
   npm run migrate:private-data -- --project=YOUR_PROJECT_ID
   ```

   Dry-run mode reads record counts and reports orphaned play records without
   writing data.
4. Resolve any unmatched play or red-play records reported by the dry run.
   Every event needs a valid match-to-league relationship before quota
   initialization is reliable.
5. After reviewing the dry-run output and backup, apply the migration:

   ```powershell
   npm run migrate:private-data -- --apply --project=YOUR_PROJECT_ID
   ```

   The script moves league, team, and player contact fields into their private
   collections, removes them from shared documents, and backfills event
   `leagueId` and visibility values from their matches, and initializes
   per-league play quotas from the existing event counts. It is safe to rerun
   after an interrupted migration; it does not replace existing private values
   with empty values or reset counters that already exist.
6. Verify the migrated records and run Firestore rules tests before deploying
   `firestore.rules`. The migration script does not deploy rules or application
   code.

The write API enforces cumulative creation quotas; deleting a record does not
restore quota. Private-data endpoints also impose a per-user read-request rate
limit. All client-side access to private documents is denied; authorized
requests must use the authenticated API routes.
