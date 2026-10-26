import type { Firestore } from "firebase-admin/firestore";

export async function purgeLeagueGames(db: Firestore, leagueId: string): Promise<void> {
  const matches = await db.collection("matches").where("leagueId", "==", leagueId).get();
  const plays = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const collection of ["plays", "red_plays"]) {
    const leaguePlays = await db.collection(collection).where("leagueId", "==", leagueId).get();
    for (const play of leaguePlays.docs) plays.set(play.ref.path, play.ref);
    for (const match of matches.docs) {
      const matchPlays = await db.collection(collection).where("matchId", "==", match.id).get();
      for (const play of matchPlays.docs) plays.set(play.ref.path, play.ref);
    }
  }

  // Keep matches until every play is deleted so a failed purge can be retried by league ID.
  for (const refs of [[...plays.values()], matches.docs.map((match) => match.ref)]) {
    for (let index = 0; index < refs.length; index += 400) {
      const batch = db.batch();
      for (const ref of refs.slice(index, index + 400)) batch.delete(ref);
      await batch.commit();
    }
  }
}
