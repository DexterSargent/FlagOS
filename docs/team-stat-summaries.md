# Team season stat summaries

Team home, roster and stats pages can load season stats from
`GET /api/public/teams/{teamId}/stat-summary` through
`loadTeamSeasonSummary(teamId)` in `src/lib/teamSeasonSummary.ts`, so they no longer
need to download every match and play.

## Contract

```ts
const summary = await loadTeamSeasonSummary(teamId);      // shared 30 s public cache
const fresh = await loadTeamSeasonSummary(teamId, { fresh: true });
summary.teamStats;                                          // TeamComprehensiveStats
summary.playerStats["Exact Player Name"];                   // PlayerSeasonStats | undefined
getPlayerSeasonStats(summary, name);                        // includes bench players
buildRosterPlayerStats(summary, rosterNames?);              // defaults to summary.roster names
summary.roster;                                             // { name, number: string | null }[]
formatPlayerLabel(summary, name);                           // "#12 Jane Doe" or "Jane Doe"
getPlayerNumber(summary, name);                             // "12" | null
```

`PlayerSeasonStats` has `gamesPlayed, passAtt, passComp, passTD, passInt, receptions,
recTD, rushAtt, rushTD, flagPulls, sacks, int, defTD, pbu, totalTDs`. `playerStats` only
lists names that recorded a stat or a DNP. A roster player who is missing from it played
every completed game (`completedGames`) and recorded zero stats, so use
`getPlayerSeasonStats` rather than defaulting `gamesPlayed` to 0.

The response contains only numeric stats, names already present in public plays or DNP
lists, public roster labels (`playerName` and `number`), match IDs and cache counters. It
never includes team, player or match documents.

Roster labels come from a projected `players` query (`select("playerName", "number",
"teamId", "leagueId", "email", "emails")`) under the same conditions as the players rules:

- York players need a York team document with `visibility: "public"` and no team PII fields.
- League players must belong to the team's public league.
- Documents carrying `email` or `emails` are skipped. Those values are read only to apply
  this check and are never returned.

Team documents are read with a field mask (visibility and PII keys only), so large fields
such as `logoUrl` are never transferred. The roster is capped at 500 players.

## Access

- York aliases are public, as in the Firestore rules (`isPublicYorkMatch`/`isPublicYorkPlay`).
- Other teams require a signed-in caller (the helper sends the Firebase ID token) and a
  team whose league has `visibility: "public"` (the rules' `isPublicLeague`). Other teams
  return 404, and their admins keep using the existing authenticated client reads.
- Only matches with `isHidden == false` and plays with `isHidden == false` count. For
  league teams, matches and plays must also belong to the team's league.
- Requests are limited to 30 per minute per IP or account, and 300 per minute per server
  instance. Concurrent requests for the same team share one read.

## Correctness model

Aggregation lives in `src/lib/teamSeasonAggregation.ts`. It is pure and has no
environment-specific code. Each completed game becomes a summary of additive counts:
team counts come from `calculateTeamComprehensiveStats` on that single game, and player
counts follow the roster and stats pages, including possession-aware attribution. Season
stats sum those counts and then call `finalizeTeamComprehensiveStats` to derive
percentages and display strings, so percentages are never averaged.

On every request, `src/lib/teamStatSummaryService.ts` uses one **read-only Firestore
transaction**, which gives it a single consistent snapshot. In that snapshot it:

1. Queries the team's visible matches and keeps the completed ones. It also reads the
   projected roster labels described above.
2. Runs a `select()` (metadata-only) query for **all** plays of each game, including
   hidden plays.
3. Creates a SHA-256 fingerprint from the match ID and `updateTime`, each play ID and
   `updateTime`, the team identity and `TEAM_SEASON_SUMMARY_SCHEMA_VERSION`.
4. Reuses `team_stat_game_summaries/{teamId}__{matchId}` only when its stored fingerprint
   matches exactly. On a miss, it reads that game's plays in full and checks the
   fingerprint again. A mismatch means the data changed during the read, so it retries up
   to 3 times and then returns 503. It never caches in that case.

On a cache hit, a game's plays are only read through the empty projection
(`select()`), which returns document names and update times and no play fields. Full play
documents are read only for games whose fingerprint changed. Tests assert both that
unchanged games need no full play read and that the metadata query is an empty
projection.

Any edit, hide, unhide, add or delete of a play, and any match change (score, status, DNP,
hidden), changes the fingerprint and causes that game to be rebuilt. There is no TTL.
Cache read failures fall back to a full rebuild. Cache write failures are logged and the
computed result is still returned. A cache entry's contents always match its fingerprint,
so concurrent writers cannot make stale data look fresh. Responses are `Cache-Control: no-store`.

`team_stat_game_summaries` has no rules block, so the Firestore default denies all client
access to it. Only the Admin SDK reads and writes it.

## Cost trade-off

`select()` reduces bandwidth but **not** Firestore billing: each play document returned
still counts as one read. So a summary request costs about as many reads as the old
client-side download (matches plus every play), and a cache miss adds one more full read
for that game. The roster adds one read per player document. Match documents are still
read in full because the score, status and DNP fields feed the summary. The gains are:

- A response of a few KB instead of every play document.
- No client-side aggregation.
- Server CPU is only spent on changed games.
- Hidden and corrected records cannot leak through stale client merges.

Cutting read counts further would require trusting write-side invalidation or a TTL, which
this design avoids on purpose. The client helper adds a 30-second in-memory cache. It is
cleared on window focus, on `storage` events and on the `flagos-york-data-changed` and
`flagos-public-data-changed` events. Non-York entries are keyed by the signed-in uid, so a response fetched while signed in is
never served after sign-out or to another account, and failed requests are never cached.
After a stat edit, use `{ fresh: true }` or dispatch
one of those events.

## Limits

The service handles up to 64 completed games per team and 1,000 plays per game. Beyond
those limits it returns 503 rather than partial totals.

The server reads only Firestore, so York seed fixtures and device-local plays that exist
only in `yorkTeamData`/localStorage are not included.
