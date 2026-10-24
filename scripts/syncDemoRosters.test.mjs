import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { NFL_TEAMS, parseCsv, selectDemoPlayers, syncDemoRosters } from "./syncDemoRosters.mjs";

function fixture() {
  const rosters = [], depth = [];
  for (const team of Object.keys(NFL_TEAMS)) {
    for (const [i, position] of ["QB", "RB", "WR", "WR", "TE", "CB", "DE", "S", "LB"].entries()) {
      const id = `${team}-${i}`;
      rosters.push({ season: "2026", team, position, depth_chart_position: position, jersey_number: `${i + 1}`, status: "ACT", full_name: id, gsis_id: id, years_exp: "1" });
      depth.push({ dt: "2026-10-24T07:00:00Z", team, gsis_id: id, pos_rank: "1", pos_grp: position === "DE" ? "Base 4-3 D" : "3WR 1TE" });
    }
  }
  return { rosters, depth };
}

test("parses quoted commas, escaped quotes, CRLF, newlines and BOM", () => {
  assert.deepEqual(parseCsv('\uFEFFid,name\r\n1,"A, B"\r\n2,"A ""Quote""\nName"\r\n'), [
    { id: "1", name: "A, B" }, { id: "2", name: 'A "Quote"\nName' },
  ]);
  assert.throws(() => parseCsv('id,name\n1,"unfinished'), /Unterminated/);
  assert.throws(() => parseCsv("id,name\n1"), /header/);
  assert.throws(() => parseCsv("id,id\n1,2"), /header/);
});

test("selects exactly nine distinct active players per franchise and adapts positions", () => {
  const { rosters, depth } = fixture();
  const selected = selectDemoPlayers(rosters, depth, 2026);
  assert.equal(selected.length, 288);
  assert.equal(new Set(selected.map((p) => p.nflId)).size, 288);
  for (const code of Object.values(NFL_TEAMS)) {
    const team = selected.filter((p) => p.teamId === `team_${code}`);
    assert.equal(team.length, 9);
    assert.deepEqual(team.map((p) => p.position), ["QB", "RB", "WR", "WR", "ATH", "DB", "RUSH", "DB", "RUSH"]);
    assert(team.every((p) => p.sourceStatus === "ACT"));
  }
});

test("uses latest depth ranks, ignores special teams, excludes inactive and prior-season players", () => {
  const { rosters, depth } = fixture();
  rosters.push(
    { ...rosters[0], gsis_id: "backup", full_name: "Backup QB", years_exp: "20" },
    { ...rosters[0], gsis_id: "inactive", status: "RES", years_exp: "25" },
    { ...rosters[0], gsis_id: "old-season", season: "2025", years_exp: "30" },
    { ...rosters[1], gsis_id: "fullback", depth_chart_position: "FB", years_exp: "15" },
  );
  depth.push(
    { ...depth[0], gsis_id: "backup", pos_rank: "2" },
    { ...depth[0], gsis_id: "backup", pos_rank: "1", pos_grp: "Special Teams" },
    { ...depth[0], dt: "2026-10-23T07:00:00Z", gsis_id: "backup", pos_rank: "1" },
  );
  const selected = selectDemoPlayers(rosters, depth, 2026);
  assert.equal(selected[0].playerName, "BUF-0");
  assert.equal(selected[1].playerName, "BUF-1");
  for (const id of ["backup", "inactive", "old-season", "fullback"]) assert(!selected.some((p) => p.nflId === id));
});

test("rejects missing teams, duplicate identities, malformed columns, invalid jerseys and missing roles", () => {
  const { rosters, depth } = fixture();
  assert.throws(() => selectDemoPlayers(rosters.filter((p) => p.team !== "KC"), depth, 2026), /KC/);
  assert.throws(() => selectDemoPlayers([...rosters, rosters[0]], depth, 2026), /duplicate/);
  assert.throws(() => selectDemoPlayers([], depth, 2026), /missing required/);
  assert.throws(() => selectDemoPlayers(rosters, depth.filter((p) => p.team !== "SEA"), 2026), /SEA/);
  assert.throws(() => selectDemoPlayers(rosters.map((p, i) => i ? p : { ...p, jersey_number: "" }), depth, 2026), /jersey/);
  assert.throws(() => selectDemoPlayers(rosters.filter((p) => p.position !== "TE"), depth, 2026), /TE/);
});

test("bundled snapshot contains all 32 teams and 288 unique current-season players", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../src/lib/demoRosterSnapshot.json", import.meta.url), "utf8"));
  assert(snapshot.season >= 2026);
  assert.equal(snapshot.source, "nflverse");
  assert(Number.isFinite(Date.parse(snapshot.sourceUpdatedAt)));
  assert.equal(snapshot.players.length, 288);
  assert.equal(new Set(snapshot.players.map((p) => p.id)).size, 288);
  assert.deepEqual([...new Set(snapshot.players.map((p) => p.teamId))].sort(), Object.values(NFL_TEAMS).map((code) => `team_${code}`).sort());
  for (const team of Object.values(NFL_TEAMS)) {
    assert.equal(snapshot.players.filter((p) => p.teamId === `team_${team}`).length, 9);
  }
});

test("network and stale-feed failures leave the bundled snapshot untouched", async () => {
  const url = new URL("../src/lib/demoRosterSnapshot.json", import.meta.url);
  const before = await readFile(url, "utf8");
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(syncDemoRosters(new Date("2026-10-24T15:00:00Z")), /HTTP 503/);
    globalThis.fetch = async (url) => new Response(
      url.endsWith("timestamp.txt") ? "2026-10-01T07:00:00Z" :
        url.endsWith(".gz") ? gzipSync("dt,team\n") : "season,team\n");
    await assert.rejects(syncDemoRosters(new Date("2026-10-24T15:00:00Z")), /stale/);
    assert.equal(await readFile(url, "utf8"), before);
  } finally { globalThis.fetch = originalFetch; }
});
