import { gunzipSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const NFL_TEAMS = {
  BUF: "buf", MIA: "mia", NE: "ne", NYJ: "nye",
  BAL: "bal", CIN: "cin", CLE: "cle", PIT: "pit",
  HOU: "hou", IND: "ind", JAX: "jax", TEN: "ten",
  KC: "kc", DEN: "den", LV: "lv", LAC: "lac",
  DAL: "dal", PHI: "phi", NYG: "nyg", WAS: "was",
  CHI: "chi", DET: "det", GB: "gb", MIN: "min",
  ATL: "atl", CAR: "car", NO: "no", TB: "tb",
  ARI: "ari", LA: "lar", SF: "sf", SEA: "sea",
};

const normalizeTeam = (team) => ({ JAC: "JAX", LAR: "LA" })[team] || team;
const outputUrl = new URL("../src/lib/demoRosterSnapshot.json", import.meta.url);
const releaseRoot = "https://github.com/nflverse/nflverse-data/releases/download";

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field === "") quoted = !quoted;
      else throw new Error("Unexpected quote in roster CSV.");
    } else if (!quoted && (ch === "," || ch === "\n" || ch === "\r")) {
      row.push(field);
      field = "";
      if (ch !== ",") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (ch === "\r" && text[i + 1] === "\n") i++;
      }
    } else field += ch;
  }
  if (quoted) throw new Error("Unterminated quoted field in roster CSV.");
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  if (!header?.length || new Set(header).size !== header.length) throw new Error("Invalid CSV header.");
  return rows.map((values) => {
    if (values.length !== header.length) throw new Error("CSV row does not match its header.");
    return Object.fromEntries(header.map((key, i) => [key, values[i]]));
  });
}

function requireColumns(rows, columns, source) {
  if (!rows.length || columns.some((key) => !(key in rows[0]))) {
    throw new Error(`${source} is empty or missing required columns.`);
  }
}

export function selectDemoPlayers(rosters, depthCharts, season) {
  requireColumns(rosters, ["season", "team", "position", "depth_chart_position", "jersey_number", "status", "full_name", "gsis_id", "years_exp"], "Roster feed");
  requireColumns(depthCharts, ["dt", "team", "gsis_id", "pos_rank", "pos_grp"], "Depth-chart feed");
  const latestByTeam = new Map();
  for (const row of depthCharts) {
    const team = normalizeTeam(row.team);
    if (!Number.isFinite(Date.parse(row.dt))) throw new Error("Invalid depth-chart timestamp.");
    if (!latestByTeam.has(team) || row.dt > latestByTeam.get(team)) latestByTeam.set(team, row.dt);
  }
  const ranks = new Map();
  for (const row of depthCharts) {
    const team = normalizeTeam(row.team);
    if (row.dt !== latestByTeam.get(team) || !row.gsis_id || row.pos_grp === "Special Teams") continue;
    const rank = Number(row.pos_rank);
    if (!Number.isInteger(rank) || rank < 1) throw new Error("Invalid depth-chart rank.");
    const key = `${team}:${row.gsis_id}`;
    ranks.set(key, Math.min(rank, ranks.get(key) ?? Infinity));
  }

  const players = [];
  const usedIds = new Set();
  for (const [team, demoCode] of Object.entries(NFL_TEAMS)) {
    if (!latestByTeam.has(team)) throw new Error(`No current depth chart for ${team}.`);
    const candidates = rosters.filter((p) => normalizeTeam(p.team) === team && Number(p.season) === season && p.status === "ACT");
    const seen = new Set();
    for (const p of candidates) {
      if (!p.gsis_id || !p.full_name.trim() || seen.has(p.gsis_id)) throw new Error(`Invalid or duplicate active player for ${team}.`);
      seen.add(p.gsis_id);
    }
    candidates.sort((a, b) =>
      (ranks.get(`${team}:${a.gsis_id}`) ?? 99) - (ranks.get(`${team}:${b.gsis_id}`) ?? 99) ||
      Number(b.years_exp || 0) - Number(a.years_exp || 0) ||
      a.gsis_id.localeCompare(b.gsis_id));

    const select = (allowed, position, positions) => {
      const p = allowed.flatMap((role) => candidates.filter((p) => (p.depth_chart_position || p.position) === role))
        .find((p) => !usedIds.has(p.gsis_id));
      if (!p) throw new Error(`Not enough active ${allowed.join("/")} players for ${team}; snapshot not updated.`);
      if (!/^\d{1,2}$/.test(p.jersey_number)) throw new Error(`Missing or invalid jersey number for ${p.full_name}.`);
      usedIds.add(p.gsis_id);
      players.push({
        id: `nfl_${p.gsis_id}`, teamId: `team_${demoCode}`,
        playerName: p.full_name.trim(), number: p.jersey_number,
        position, positions, status: "Active",
        nflId: p.gsis_id, nflPosition: p.depth_chart_position || p.position, sourceStatus: p.status,
      });
    };
    select(["QB"], "QB", ["QB"]);
    select(["RB", "FB"], "RB", ["RB", "ATH"]);
    select(["WR"], "WR", ["WR"]);
    select(["WR"], "WR", ["WR"]);
    select(["TE"], "ATH", ["ATH", "TE"]);
    select(["CB", "DB"], "DB", ["DB"]);
    select(["DE", "OLB", "LB", "DL", "DT", "ILB", "MLB", "NT", "EDGE"], "RUSH", ["RUSH"]);
    select(["S", "FS", "SS", "DB", "CB"], "DB", ["DB"]);
    select(["DE", "OLB", "LB", "DL", "DT", "ILB", "MLB", "NT", "EDGE"], "RUSH", ["RUSH"]);
  }
  return players;
}

async function download(url, compressed = false) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Roster source returned HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return (compressed ? gunzipSync(bytes) : bytes).toString("utf8");
}

export async function syncDemoRosters(now = new Date()) {
  const season = now.getUTCFullYear() - (now.getUTCMonth() < 2 ? 1 : 0);
  const rosterUrl = `${releaseRoot}/rosters/roster_${season}.csv`;
  const depthChartUrl = `${releaseRoot}/depth_charts/depth_charts_${season}.csv.gz`;
  const [rosterCsv, depthCsv, timestampText] = await Promise.all([
    download(rosterUrl), download(depthChartUrl, true), download(`${releaseRoot}/rosters/timestamp.txt`),
  ]);
  const rosterUpdated = new Date(timestampText.trim());
  if (!Number.isFinite(rosterUpdated.getTime()) || now.getTime() - rosterUpdated.getTime() > 7 * 86400_000 || rosterUpdated.getTime() > now.getTime() + 86400_000) {
    throw new Error("Roster feed timestamp is missing, stale or in the future; keeping the bundled snapshot.");
  }
  const rosters = parseCsv(rosterCsv);
  const depthCharts = parseCsv(depthCsv);
  for (const team of Object.keys(NFL_TEAMS)) {
    const latest = depthCharts.filter((row) => normalizeTeam(row.team) === team).reduce((dt, row) => row.dt > dt ? row.dt : dt, "");
    if (!latest || now.getTime() - Date.parse(latest) > 7 * 86400_000 || Date.parse(latest) > now.getTime() + 86400_000) {
      throw new Error(`Stale depth chart for ${team}; keeping the bundled snapshot.`);
    }
  }
  const players = selectDemoPlayers(rosters, depthCharts, season);
  const snapshot = {
    season,
    source: "nflverse",
    sourceUrl: "https://github.com/nflverse/nflverse-data/releases/tag/rosters",
    rosterUrl,
    depthChartUrl,
    sourceUpdatedAt: rosterUpdated.toISOString(),
    players,
  };
  const existing = JSON.parse(await readFile(outputUrl, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "null";
    throw error;
  }));
  if (existing?.season === season && JSON.stringify(existing.players) === JSON.stringify(players)) {
    console.log(`No roster changes: ${players.length} active players across 32 teams (${season}).`);
    return false;
  }
  await writeFile(outputUrl, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Updated ${players.length} active players across 32 teams from ${rosterUpdated.toISOString()} (${season}).`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncDemoRosters().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
