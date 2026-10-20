const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function loadFixtures(name) {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "lib", `${name}.ts`), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const requireFixture = (specifier) => {
    if (specifier !== "./yorkStaff") throw new Error(`Unexpected fixture dependency: ${specifier}`);
    return loadFixtures("yorkStaff");
  };
  // Execute only these repository-owned fixture modules, without loading the client Firebase app.
  new Function("require", "module", "exports", outputText)(requireFixture, module, module.exports);
  return module.exports;
}

async function main() {
  const args = process.argv.slice(2);
  const projectIndex = args.indexOf("--project");
  const projectId = projectIndex >= 0 ? args[projectIndex + 1] : "";
  if (!projectId || projectId.startsWith("--")) throw new Error("Pass an explicit --project ID.");
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulator && (emulator !== "127.0.0.1:8080" || projectId !== "demo-flagos-local")) {
    throw new Error("Emulator provisioning is restricted to demo-flagos-local on 127.0.0.1:8080.");
  }
  if (!emulator && projectId.startsWith("demo-")) throw new Error("Start the local emulator before provisioning a demo project.");
  const { YORK_ADMIN_EMAILS } = loadFixtures("yorkStaff");
  const { YORK_LIONS_TEAM: team, YORK_LIONS_PLAYERS: players, YORK_LIONS_MATCHES: matches, YORK_LIONS_PLAYS: plays } = loadFixtures("yorkTeamData");
  console.log(`${args.includes("--apply") ? "Applying" : "Dry run"} York provisioning for ${projectId}: ${players.length} players, ${matches.length} games, ${plays.length} plays, ${YORK_ADMIN_EMAILS.length} coach emails.`);
  if (!args.includes("--apply")) {
    console.log("No data changed. Add --apply to provision using Application Default Credentials, or the isolated emulator.");
    return;
  }
  const app = initializeApp(emulator ? { projectId } : { projectId, credential: applicationDefault() });
  const db = getFirestore(app);
  const teamRef = db.doc(`teams/${team.id}`);
  const privateRef = db.doc(`team_private/${team.id}`);
  const [existingTeam, existingPrivate] = await db.getAll(teamRef, privateRef);
  const leagueId = existingTeam.data()?.leagueId || "";
  const batch = db.batch();
  const { adminEmails: _admins, coachEmail: _coachEmail, ...publicTeam } = team;
  const staffFields = {
    coachName: team.coachName, coachRole: team.coachRole,
    assistantCoach: team.assistantCoach, assistantCoachRole: team.assistantCoachRole,
    defensiveCoordinator: team.defensiveCoordinator, defensiveCoordinatorRole: team.defensiveCoordinatorRole,
    offensiveCoordinator: team.offensiveCoordinator, offensiveCoordinatorRole: team.offensiveCoordinatorRole,
    isStandalone: true,
  };
  batch.set(teamRef, existingTeam.exists ? staffFields : { ...publicTeam, leagueId, visibility: "public" }, { merge: true });
  batch.set(privateRef, {
    leagueId, coachEmail: team.coachEmail,
    adminEmails: [...new Set([...YORK_ADMIN_EMAILS, ...(existingPrivate.data()?.adminEmails || [])])],
  }, { merge: true });
  const records = [];
  for (const player of players) {
    const { email, emails, ...publicPlayer } = player;
    records.push([`players/${player.id}`, { ...publicPlayer, leagueId }]);
    records.push([`player_private/${player.id}`, { teamId: team.id, leagueId, email, emails }]);
  }
  for (const match of matches) records.push([`matches/${match.id}`, { ...match, leagueId, isHidden: false }]);
  for (const play of plays) records.push([`plays/${play.id}`, { ...play, leagueId, isHidden: false }]);
  const existing = await db.getAll(...records.map(([recordPath]) => db.doc(recordPath)));
  let created = 0;
  existing.forEach((snapshot, index) => {
    if (!snapshot.exists) {
      batch.create(snapshot.ref, records[index][1]);
      created++;
    }
  });
  await batch.commit();
  console.log(`York coaching staff provisioned; ${created} missing fixture records created. Existing games, plays, players and branding were preserved. No Auth accounts were created.`);
  await app.delete();
}

main().catch((error) => {
  console.error("York provisioning failed:", error.message);
  process.exitCode = 1;
});
