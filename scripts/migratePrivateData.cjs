const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

const APPLY = process.argv.includes("--apply");
const MAX_BATCH_BYTES = 5_000_000;
const MAX_BATCH_WRITES = 400;
const MAX_PLAYS_PER_LEAGUE = 50_000;
const MAX_RED_PLAYS_PER_LEAGUE = 10_000;
const PROJECT_ARG = process.argv.find((arg) => arg.startsWith("--project="));
const projectId = PROJECT_ARG?.slice("--project=".length) ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!projectId) {
  console.error("Set GOOGLE_CLOUD_PROJECT or NEXT_PUBLIC_FIREBASE_PROJECT_ID, or pass --project=<id>.");
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function normalizeEmails(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((email) => typeof email === "string").map(normalizeEmail))]
    : [];
}

async function seedLeagueQuotaCounters(kind, counts, limit) {
  const entries = [...counts.entries()];
  for (let offset = 0; offset < entries.length; offset += MAX_BATCH_WRITES) {
    const chunk = entries.slice(offset, offset + MAX_BATCH_WRITES);
    const refs = chunk.map(([leagueId]) => {
      const suffix = createHash("sha256").update(`${kind}:${leagueId}`).digest("hex").slice(0, 32);
      return db.doc(`write_counters/${kind}_${suffix}`);
    });
    if (!APPLY) {
      console.log(`Would initialize ${chunk.length} ${kind} league quota counters.`);
      continue;
    }
    await db.runTransaction(async (transaction) => {
      const snapshots = await transaction.getAll(...refs);
      snapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) {
          transaction.create(refs[index], {
            createdCount: chunk[index][1],
            limit,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      });
    });
  }
}

function extractPrivate(collection, data, id) {
  if (collection === "leagues") {
    const subscription = data.subscription && typeof data.subscription === "object"
      ? { ...data.subscription }
      : {};
    const privateData = { leagueId: id, ownerUid: data.ownerUid || "" };
    if (Object.prototype.hasOwnProperty.call(data, "adminEmails")) {
      privateData.adminEmails = normalizeEmails(data.adminEmails);
    }
    if (Object.prototype.hasOwnProperty.call(data, "contactEmail")) {
      privateData.contactEmail = normalizeEmail(data.contactEmail || "");
    }
    if (data.subscription && Object.prototype.hasOwnProperty.call(data.subscription, "adminEmails")) {
      privateData.subscriptionAdminEmails = normalizeEmails(data.subscription.adminEmails);
    }
    delete subscription.adminEmails;
    return {
      privateData,
      publicData: {
        ...data,
        subscription,
      },
      fields: ["adminEmails", "contactEmail"],
    };
  }

  if (collection === "teams") {
    const privateData = { teamId: id, leagueId: data.leagueId || "" };
    for (const field of ["adminEmails", "coachEmail", "adminEmail", "email"]) {
      if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
      privateData[field] = field === "adminEmails"
        ? normalizeEmails(data[field])
        : normalizeEmail(data[field] || "");
    }
    return {
      privateData,
      publicData: { ...data },
      fields: ["adminEmails", "coachEmail", "adminEmail", "email"],
    };
  }

  const privateData = {
    playerId: id,
    teamId: data.teamId || "",
    leagueId: data.leagueId || "",
  };
  if (Object.prototype.hasOwnProperty.call(data, "email")) {
    privateData.email = normalizeEmail(data.email || "");
  }
  if (Object.prototype.hasOwnProperty.call(data, "emails")) {
    privateData.emails = normalizeEmails(data.emails);
  }
  return {
    privateData,
    publicData: { ...data },
    fields: ["email", "emails"],
  };
}

async function migrateCollection(collection, privateCollection) {
  let cursor = null;
  let processed = 0;
  while (true) {
    let query = db.collection(collection).orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    let batch = db.batch();
    let batchBytes = 0;
    let batchWrites = 0;
    for (const document of snapshot.docs) {
      const data = document.data();
      const extracted = extractPrivate(collection, data, document.id);
      const publicData = { ...extracted.publicData };
      for (const field of extracted.fields) delete publicData[field];
      if (collection === "leagues" && data.subscription && typeof data.subscription === "object") {
        publicData.subscription = { ...data.subscription };
        delete publicData.subscription.adminEmails;
      }

      const itemBytes = Buffer.byteLength(JSON.stringify([extracted.privateData, publicData]), "utf8");
      if (itemBytes > MAX_BATCH_BYTES) {
        throw new Error(`${collection}/${document.id} exceeds the safe migration batch-size limit.`);
      }
      if (APPLY) {
        if (batchWrites + 2 > MAX_BATCH_WRITES || batchBytes + itemBytes > MAX_BATCH_BYTES) {
          await batch.commit();
          batch = db.batch();
          batchBytes = 0;
          batchWrites = 0;
        }
        batch.set(db.doc(`${privateCollection}/${document.id}`), {
          ...extracted.privateData,
          migratedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        batch.set(document.ref, publicData);
        batchBytes += itemBytes;
        batchWrites += 2;
      }
      processed += 1;
    }
    if (batchWrites) await batch.commit();
    cursor = snapshot.docs[snapshot.docs.length - 1];
    console.log(`${APPLY ? "Prepared" : "Would migrate"} ${collection}: ${processed} documents`);
    if (snapshot.size < 200) break;
  }
  return processed;
}

async function readCollection(collection) {
  const documents = [];
  let cursor = null;
  while (true) {
    let query = db.collection(collection).orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    documents.push(...snapshot.docs);
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 200) break;
  }
  return documents;
}

async function backfillMatchVisibility() {
  let cursor = null;
  let updated = 0;
  while (true) {
    let query = db.collection("matches").orderBy("__name__").limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    const batch = db.batch();
    let batchUpdates = 0;
    for (const document of snapshot.docs) {
      const hidden = document.get("isHidden");
      if (typeof hidden === "boolean") continue;
      if (APPLY) {
        batch.update(document.ref, { isHidden: hidden === true });
        batchUpdates += 1;
      }
      updated += 1;
    }
    if (batchUpdates) await batch.commit();
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < 200) break;
  }
  console.log(`${APPLY ? "Updated" : "Would update"} ${updated} matches with an explicit isHidden flag.`);
}

async function backfillPlayLeagueIds() {
  await backfillMatchVisibility();
  const [matches, teams] = await Promise.all([
    readCollection("matches"),
    readCollection("teams"),
  ]);
  const teamLeagueIds = new Map(teams.map((team) => [team.id, team.get("leagueId") || ""]));
  await backfillPlayerLeagueIds(teamLeagueIds);
  const matchVisibility = new Map();
  for (const match of matches) {
    const data = match.data();
    const referencedLeagueIds = [data.homeTeamId, data.awayTeamId, data.managingTeamId]
      .map((teamId) => teamLeagueIds.get(teamId))
      .filter(Boolean);
    const distinctTeamLeagues = new Set(referencedLeagueIds);
    if (distinctTeamLeagues.size > 1 ||
      (data.leagueId && referencedLeagueIds.some((teamLeagueId) => teamLeagueId !== data.leagueId))) {
      throw new Error(`matches/${match.id} references teams outside its league. Resolve the relationship before migration.`);
    }
    const leagueId = data.leagueId ||
      referencedLeagueIds[0];
    if (leagueId) matchVisibility.set(match.id, {
      leagueId,
      isHidden: data.isHidden === true,
    });
  }

  async function backfillPlayerLeagueIds(teamLeagueIds) {
    let cursor = null;
    let updated = 0;
    while (true) {
      let query = db.collection("players").orderBy("__name__").limit(200);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      const batch = db.batch();
      let batchUpdates = 0;
      for (const player of snapshot.docs) {
        const data = player.data();
        const leagueId = teamLeagueIds.get(data.teamId);
        if (!leagueId || data.leagueId === leagueId) continue;
        if (APPLY) {
          batch.update(player.ref, { leagueId });
          batch.set(db.doc(`player_private/${player.id}`), { leagueId }, { merge: true });
          batchUpdates += 2;
        }
        updated += 1;
      }
      if (batchUpdates) await batch.commit();
      cursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < 200) break;
    }
    console.log(`${APPLY ? "Updated" : "Would update"} ${updated} player-to-league relationships.`);
  }

  for (const collection of ["plays", "red_plays"]) {
    let cursor = null;
    let updated = 0;
    let unmatched = 0;
    const leagueCounts = new Map();
    while (true) {
      let query = db.collection(collection).orderBy("__name__").limit(200);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      const batch = db.batch();
      let batchUpdates = 0;
      for (const document of snapshot.docs) {
        const data = document.data();
        const match = matchVisibility.get(data.matchId);
        if (!match) {
          unmatched += 1;
          continue;
        }
        leagueCounts.set(match.leagueId, (leagueCounts.get(match.leagueId) || 0) + 1);
        if (APPLY) {
          batch.update(document.ref, {
            leagueId: match.leagueId,
            isHidden: match.isHidden,
          });
          batchUpdates += 1;
        }
        updated += 1;
      }
      if (batchUpdates > 0) await batch.commit();
      cursor = snapshot.docs[snapshot.docs.length - 1];
      if (snapshot.size < 200) break;
    }
    console.log(`${APPLY ? "Backfilled" : "Would backfill"} ${updated} ${collection} with ${unmatched} unmatched records.`);
    if (unmatched > 0) {
      throw new Error(`${collection} contains ${unmatched} records without a match-to-league relationship. Resolve them before deploying the new rules.`);
    }
    await seedLeagueQuotaCounters(
      collection === "plays" ? "play-league" : "red-play-league",
      leagueCounts,
      collection === "plays" ? MAX_PLAYS_PER_LEAGUE : MAX_RED_PLAYS_PER_LEAGUE,
    );
  }
}

async function reportLegacyPaths() {
  const legacyLeagueSettings = await db.doc("league/settings").get();
  console.log(
    legacyLeagueSettings.exists
      ? "Found legacy league/settings; this migration intentionally leaves it unchanged."
      : "No legacy league/settings document found.",
  );
  console.log(
    "User profile documents and team subcollections are outside this migration and will remain unchanged.",
  );
}

async function main() {
  console.log(`${APPLY ? "Applying" : "Dry run"} private-data migration for project ${projectId}.`);
  await reportLegacyPaths();
  const migrated = {};
  migrated.leagues = await migrateCollection("leagues", "league_private");
  migrated.teams = await migrateCollection("teams", "team_private");
  migrated.players = await migrateCollection("players", "player_private");
  await backfillPlayLeagueIds();
  console.log(`${APPLY ? "Migrated" : "Would migrate"} ${JSON.stringify(migrated)}.`);
  if (!APPLY) console.log("No data was changed. Add --apply to write the migration.");
}

main().catch((error) => {
  console.error("Private-data migration failed:", error);
  process.exitCode = 1;
});
