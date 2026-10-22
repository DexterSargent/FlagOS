"use client";

import { useState } from "react";
import Link from "next/link";
import { Database, Trash2, ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, limit } from "firebase/firestore";
import { createSecureRecord } from "@/lib/secureWrites";
import { useAuth } from "@/lib/authContext";

export default function Sandbox() {
  const { isPlatformAdmin } = useAuth();
  const [loading, setLoading] = useState(false);

  const generateFakeData = async () => {
    if (!confirm("Are you sure? This will find the first 2 matches, set them as completed, and generate random fake plays for them.")) return;
    setLoading(true);
    try {
      const matchesSnap = await getDocs(query(collection(db, "matches"), limit(2)));
      const matches = matchesSnap.docs.map(d => ({ ...(d.data() as any), id: d.id }));

      if (matches.length === 0) {
        alert("No matches found in DB.");
        setLoading(false);
        return;
      }

      const teamIds = [...new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId])
        .filter((teamId): teamId is string => typeof teamId === "string" && teamId.length > 0))];
      const playersSnap = teamIds.length
        ? await getDocs(query(
          collection(db, "players"),
          where("teamId", "in", teamIds),
          limit(60),
        ))
        : null;
      const players = playersSnap?.docs.map(d => ({ ...(d.data() as any), id: d.id })) || [];

      for (const match of matches) {
        const homeRoster = players.filter(p => p.teamId === match.homeTeamId);
        const awayRoster = players.filter(p => p.teamId === match.awayTeamId);

        let homeScore = 0;
        let awayScore = 0;

        // Generate 10 random plays for this match
        for (let i = 0; i < 10; i++) {
          const isHomePos = Math.random() > 0.5;
          const posRoster = isHomePos ? homeRoster : awayRoster;
          const defRoster = isHomePos ? awayRoster : homeRoster;
          
          if (posRoster.length < 2 || defRoster.length < 2) continue;

          const qb = posRoster[Math.floor(Math.random() * posRoster.length)];
          let rec = posRoster[Math.floor(Math.random() * posRoster.length)];
          while (rec.id === qb.id) {
            rec = posRoster[Math.floor(Math.random() * posRoster.length)];
          }
          const def = defRoster[Math.floor(Math.random() * defRoster.length)];

          const isTouchdown = Math.random() > 0.7;
          const isInterception = Math.random() > 0.9;

          if (isTouchdown) {
            if (isHomePos) homeScore += 6; else awayScore += 6;
          }

          await createSecureRecord("play", {
            isFake: true,
            matchId: match.id,
            possessionTeamId: isHomePos ? match.homeTeamId : match.awayTeamId,
            down: Math.floor(Math.random() * 4) + 1,
            playType: "Pass",
            firstDown: isTouchdown || Math.random() > 0.5,
            qbPlayerId: qb.playerName,
            runnerPlayerId: null,
            receiverPlayerId: isInterception ? null : rec.playerName,
            defenders: [def.playerName],
            flaggers: isTouchdown ? [] : [def.playerName],
            passOutcome: isInterception ? "Interception" : "Complete",
            isTouchdown: isTouchdown,
            isPick6: false,
            isSafety: false,
            turnover: isInterception,
            result: isTouchdown ? "Touchdown" : (isInterception ? "Turnover" : "First Down")
          });
        }

        // Complete the match
        await updateDoc(doc(db, "matches", match.id), {
          status: "completed",
          homeScore: homeScore,
          awayScore: awayScore,
          hasFakeData: true
        });
      }

      alert("Successfully seeded fake plays!");
    } catch (e) {
      console.error(e);
      alert("Error generating fake data.");
    }
    setLoading(false);
  };

  const wipeFakeData = async () => {
    if (!confirm("Are you sure? This will delete all fake plays and reset matches.")) return;
    setLoading(true);
    try {
      const playsSnap = await getDocs(query(
        collection(db, "plays"),
        where("isFake", "==", true),
        limit(500),
      ));
      const fakePlays = playsSnap.docs.filter(d => d.data().isFake === true);
      
      for (const playDoc of fakePlays) {
        await deleteDoc(doc(db, "plays", playDoc.id));
      }

      const matchesSnap = await getDocs(query(
        collection(db, "matches"),
        where("hasFakeData", "==", true),
        limit(512),
      ));
      const fakeMatches = matchesSnap.docs.filter(d => d.data().hasFakeData === true);

      for (const m of fakeMatches) {
        await updateDoc(doc(db, "matches", m.id), {
          status: "scheduled",
          homeScore: 0,
          awayScore: 0,
          hasFakeData: false
        });
      }

      alert("Successfully wiped all fake data!");
    } catch (e) {
      console.error(e);
      alert("Error wiping fake data.");
    }
    setLoading(false);
  };

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-black text-white p-12">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-neutral-400">This tool is available to the platform administrator only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-12">
      <Link href="/" className="inline-flex items-center text-neutral-400 hover:text-white mb-8">
        <ChevronLeft className="w-5 h-5 mr-1" /> Dashboard
      </Link>
      <h1 className="text-4xl font-black mb-8">Admin Sandbox</h1>
      <p className="text-neutral-400 mb-8 max-w-xl">Use these tools to inject mock data into the database so you can test how the frontend responds without cluttering your production records.</p>
      
      <div className="flex gap-4">
        <button 
          onClick={generateFakeData}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold transition-all disabled:opacity-50"
        >
          <Database className="w-6 h-6" /> Generate Fake Plays & Complete Matches
        </button>

        <button 
          onClick={wipeFakeData}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold transition-all disabled:opacity-50"
        >
          <Trash2 className="w-6 h-6" /> Wipe Fake Data & Reset Matches
        </button>
      </div>
    </div>
  );
}
