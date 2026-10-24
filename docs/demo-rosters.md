# Demo NFL roster selections

The demo uses nine currently active NFL players per franchise, not full NFL
rosters: one QB, one RB, two WRs, one TE, two defensive backs, and two defensive
front-seven players. NFL positions are adapted to FlagOS roles (`DB`, `RUSH`,
and `ATH`/`TE`). The unassigned free-agent pool remains fictional.

## Source and freshness

Public roster and depth-chart datasets are supplied by
[nflverse](https://github.com/nflverse/nflverse-data/releases).
[nflverse documents daily roster and depth-chart updates](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html).
We select `ACT` roster entries only (excluding reserve, practice-squad, retired,
cut and inactive entries), prioritize offensive/defensive depth-chart rank, and
ignore special-teams ranks. This is roster eligibility, not a guarantee that a
player is medically fit or will dress for the next game.

The bundled [snapshot](../src/lib/demoRosterSnapshot.json) includes source URLs,
season, source update time and stable GSIS player IDs. The league dashboard
displays attribution and the source date for the visitor's session. Only public
player names, numbers, positions and identifiers are retained; no player images
or provider credentials are used.

## Daily refresh

Run `node scripts/syncDemoRosters.mjs` to refresh manually. It chooses the NFL
season using a March rollover, downloads the seasonal roster and compressed
depth-chart feeds, and validates all 32 franchises before writing anything.
Missing teams or roles, duplicate players, invalid jerseys and feeds more than
seven days old cause an explicit failure; the existing snapshot is not replaced.
No network request is needed to browse the demo.

The [scheduled workflow](../.github/workflows/refresh-demo-rosters.yml) checks at
13:30 UTC daily, tests the selector, and commits only player/season changes to
`main`. GitHub Actions must be enabled and permitted to push to `main`; branch
protection may require a pull-request workflow instead. The existing Firebase
App Hosting GitHub integration deploys these commits. Actions schedules,
upstream publication and deployment can be delayed, so this is daily best-effort
freshness, **not real-time updates or an availability guarantee**. Monitor failed
workflow runs and the snapshot date. An unchanged roster does not create a new
commit solely to advance its date.

Validate the updater with `node --test scripts/syncDemoRosters.test.mjs`, and the
integration with the demo roster, sandbox and play-generator Vitest tests.

## Session and stats consistency

New sessions and **Reset Session** start from the latest deployed snapshot.
Existing sessions preserve their players and edits until reset; updates never
silently rewrite an in-progress visitor's season. Resetting clears demo edits.
Season-play generation uses the session's roster and positions, and scripted
live-game participants are remapped to those players. All schedules, scores and
statistics are simulated flag-football data, not NFL performance statistics.
The snapshot never changes real customer leagues or teams.

## Provider options and terms

nflverse is a community feed with no service-level agreement.
[Its terms](https://nflverse.nflverse.com/#terms-of-use) say underlying NFL data
remain governed by their owners' terms; availability is not a blanket commercial
redistribution license. Review the applicable terms before expanding usage.
For licensed, supported commercial coverage and faster update guarantees,
evaluate [SportsDataIO](https://sportsdata.io/nfl-api) or
[Sportradar](https://developer.sportradar.com/football/reference/nfl-overview).
Those require a provider account/license; no paid service or credentials have
been configured. ESPN's undocumented endpoints are not a production dependency.
