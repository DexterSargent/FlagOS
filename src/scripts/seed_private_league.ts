import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBHTnWJpyjhbLpGQKJ2BqNWkN43EGP88pw",
  authDomain: "flagfootballleaguemachine.firebaseapp.com",
  projectId: "flagfootballleaguemachine",
  storageBucket: "flagfootballleaguemachine.firebasestorage.app",
  messagingSenderId: "204437433125",
  appId: "1:204437433125:web:71dac0f10bd618b4ef88cc",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const LEAGUE_ID = "league_private_live";
const OWNER_EMAIL = "dextersargent@gmail.com";

const leagueDoc = {
  id: LEAGUE_ID,
  leagueName: "Apex Private League",
  shortcode: "APEX",
  tagline: "Private Live Testing Environment with Active Database Writes",
  seasonTitle: "2026 Live Season",
  logoUrl: "/flagos-emblem.png",
  icon: "shield",
  primaryColor: "#10b981",
  accentColor: "#06b6d4",
  themePreset: "emerald",
  defaultLocation: "Gridiron Live Field 1",
  contactEmail: OWNER_EMAIL,
  rulebookTitle: "Official 5v5 Live Testing Rules",
  rulebookUrl: "",
  announcement: "Private Live League • Real DB Writes Active",
  visibility: "private",
  adminEmails: [OWNER_EMAIL],
  rules: {
    playersOnField: 5,
    periodType: "halves",
    periodsCount: 2,
    periodDurationMinutes: 20,
    timeoutsPerTeam: 2,
    timeoutDurationSeconds: 60,
    timeoutsResetPerPeriod: true,
    minRosterSize: 5,
    maxRosterSize: 15,
    downsPerSeries: 4,
    rushLineDistance: 7,
    playClockSeconds: 30,
    halftimeDurationSeconds: 300,
    enableFreeAgents: false,
  },
  subscription: {
    plan: "league",
    status: "active",
    teamCount: 4,
    baseMonthlyFee: 49,
    perTeamMonthlyFee: 5,
    totalMonthlyFee: 69,
    billingCycle: "monthly",
    adminEmails: [OWNER_EMAIL],
    renewsAt: "2027-01-01T00:00:00.000Z",
  },
};

const teams = [
  {
    id: "team_live_apex",
    name: "Apex Predators",
    shortcode: "APX",
    leagueId: LEAGUE_ID,
    primaryColor: "#10b981",
    accentColor: "#34d399",
    coachEmail: OWNER_EMAIL,
    adminEmails: [OWNER_EMAIL],
    seasonRecord: { w: 0, l: 0, t: 0, pf: 0, pa: 0, pts: 0 },
  },
  {
    id: "team_live_knights",
    name: "Cyber Knights",
    shortcode: "CYB",
    leagueId: LEAGUE_ID,
    primaryColor: "#06b6d4",
    accentColor: "#38bdf8",
    seasonRecord: { w: 0, l: 0, t: 0, pf: 0, pa: 0, pts: 0 },
  },
  {
    id: "team_live_vipers",
    name: "Neon Vipers",
    shortcode: "VIP",
    leagueId: LEAGUE_ID,
    primaryColor: "#8b5cf6",
    accentColor: "#a855f7",
    seasonRecord: { w: 0, l: 0, t: 0, pf: 0, pa: 0, pts: 0 },
  },
  {
    id: "team_live_flare",
    name: "Solar Flare",
    shortcode: "SOL",
    leagueId: LEAGUE_ID,
    primaryColor: "#f59e0b",
    accentColor: "#fbbf24",
    seasonRecord: { w: 0, l: 0, t: 0, pf: 0, pa: 0, pts: 0 },
  },
];

const players = [
  // Apex Predators
  { id: "player_live_apx_1", playerName: "Dexter Sargent", number: "7", position: "QB", teamId: "team_live_apex", leagueId: LEAGUE_ID, email: OWNER_EMAIL, emails: [OWNER_EMAIL] },
  { id: "player_live_apx_2", playerName: "Marcus Vance", number: "11", position: "WR", teamId: "team_live_apex", leagueId: LEAGUE_ID },
  { id: "player_live_apx_3", playerName: "Elena Rostova", number: "88", position: "C", teamId: "team_live_apex", leagueId: LEAGUE_ID },
  { id: "player_live_apx_4", playerName: "Jordan Reed", number: "24", position: "DB", teamId: "team_live_apex", leagueId: LEAGUE_ID },
  { id: "player_live_apx_5", playerName: "Tyrell Cross", number: "99", position: "RUSH", teamId: "team_live_apex", leagueId: LEAGUE_ID },

  // Cyber Knights
  { id: "player_live_cyb_1", playerName: "Kaelen Drake", number: "12", position: "QB", teamId: "team_live_knights", leagueId: LEAGUE_ID },
  { id: "player_live_cyb_2", playerName: "Devon Price", number: "1", position: "WR", teamId: "team_live_knights", leagueId: LEAGUE_ID },
  { id: "player_live_cyb_3", playerName: "Liam Chen", number: "5", position: "C", teamId: "team_live_knights", leagueId: LEAGUE_ID },
  { id: "player_live_cyb_4", playerName: "Bryce Miller", number: "21", position: "DB", teamId: "team_live_knights", leagueId: LEAGUE_ID },
  { id: "player_live_cyb_5", playerName: "Zane Walker", number: "55", position: "RUSH", teamId: "team_live_knights", leagueId: LEAGUE_ID },

  // Neon Vipers
  { id: "player_live_vip_1", playerName: "Rayce Sterling", number: "8", position: "QB", teamId: "team_live_vipers", leagueId: LEAGUE_ID },
  { id: "player_live_vip_2", playerName: "Malik Hayes", number: "14", position: "WR", teamId: "team_live_vipers", leagueId: LEAGUE_ID },
  { id: "player_live_vip_3", playerName: "Samara Cole", number: "3", position: "DB", teamId: "team_live_vipers", leagueId: LEAGUE_ID },
  { id: "player_live_vip_4", playerName: "Jaylen Brooks", number: "44", position: "RUSH", teamId: "team_live_vipers", leagueId: LEAGUE_ID },
  { id: "player_live_vip_5", playerName: "Andre Thorne", number: "80", position: "C", teamId: "team_live_vipers", leagueId: LEAGUE_ID },

  // Solar Flare
  { id: "player_live_sol_1", playerName: "Lucas Ortiz", number: "10", position: "QB", teamId: "team_live_flare", leagueId: LEAGUE_ID },
  { id: "player_live_sol_2", playerName: "Dante King", number: "2", position: "WR", teamId: "team_live_flare", leagueId: LEAGUE_ID },
  { id: "player_live_sol_3", playerName: "Xavier Holt", number: "23", position: "DB", teamId: "team_live_flare", leagueId: LEAGUE_ID },
  { id: "player_live_sol_4", playerName: "Caleb Frost", number: "90", position: "RUSH", teamId: "team_live_flare", leagueId: LEAGUE_ID },
  { id: "player_live_sol_5", playerName: "Isaiah Bell", number: "85", position: "C", teamId: "team_live_flare", leagueId: LEAGUE_ID },
];

const matches = [
  {
    id: "match_live_apex_w1_1",
    leagueId: LEAGUE_ID,
    homeTeamId: "team_live_apex",
    homeTeamName: "Apex Predators",
    homeScore: 0,
    awayTeamId: "team_live_knights",
    awayTeamName: "Cyber Knights",
    awayScore: 0,
    week: "Week 1",
    date: "2026-10-15",
    time: "7:00 PM",
    field: "Gridiron Live Field 1",
    status: "scheduled",
    gameClock: 1200,
    half: "1st Half",
    currentDown: 1,
    distance: 20,
    possession: "home",
    firstHalfStartPossession: "home",
    homeTimeouts: 2,
    awayTimeouts: 2,
  },
  {
    id: "match_live_apex_w1_2",
    leagueId: LEAGUE_ID,
    homeTeamId: "team_live_vipers",
    homeTeamName: "Neon Vipers",
    homeScore: 0,
    awayTeamId: "team_live_flare",
    awayTeamName: "Solar Flare",
    awayScore: 0,
    week: "Week 1",
    date: "2026-10-15",
    time: "8:15 PM",
    field: "Gridiron Live Field 1",
    status: "scheduled",
    gameClock: 1200,
    half: "1st Half",
    currentDown: 1,
    distance: 20,
    possession: "home",
    firstHalfStartPossession: "home",
    homeTimeouts: 2,
    awayTimeouts: 2,
  },
  {
    id: "match_live_apex_w2_1",
    leagueId: LEAGUE_ID,
    homeTeamId: "team_live_apex",
    homeTeamName: "Apex Predators",
    homeScore: 0,
    awayTeamId: "team_live_vipers",
    awayTeamName: "Neon Vipers",
    awayScore: 0,
    week: "Week 2",
    date: "2026-10-22",
    time: "7:00 PM",
    field: "Gridiron Live Field 1",
    status: "scheduled",
    gameClock: 1200,
    half: "1st Half",
    currentDown: 1,
    distance: 20,
    possession: "home",
    firstHalfStartPossession: "home",
    homeTimeouts: 2,
    awayTimeouts: 2,
  },
  {
    id: "match_live_apex_w2_2",
    leagueId: LEAGUE_ID,
    homeTeamId: "team_live_knights",
    homeTeamName: "Cyber Knights",
    homeScore: 0,
    awayTeamId: "team_live_flare",
    awayTeamName: "Solar Flare",
    awayScore: 0,
    week: "Week 2",
    date: "2026-10-22",
    time: "8:15 PM",
    field: "Gridiron Live Field 1",
    status: "scheduled",
    gameClock: 1200,
    half: "1st Half",
    currentDown: 1,
    distance: 20,
    possession: "home",
    firstHalfStartPossession: "home",
    homeTimeouts: 2,
    awayTimeouts: 2,
  },
];

async function seed() {
  console.log(`Seeding private live league ${LEAGUE_ID} into Firestore...`);

  // 1. League
  await setDoc(doc(db, "leagues", LEAGUE_ID), leagueDoc);
  console.log(`✓ Seeded league doc leagues/${LEAGUE_ID}`);

  // 2. Teams
  for (const t of teams) {
    await setDoc(doc(db, "teams", t.id), t);
    console.log(`✓ Seeded team teams/${t.id} (${t.name})`);
  }

  // 3. Players
  for (const p of players) {
    await setDoc(doc(db, "players", p.id), p);
  }
  console.log(`✓ Seeded ${players.length} players across 4 teams`);

  // 4. Matches
  for (const m of matches) {
    await setDoc(doc(db, "matches", m.id), m);
    console.log(`✓ Seeded match matches/${m.id} (${m.homeTeamName} vs ${m.awayTeamName})`);
  }

  console.log("\nALL SEEDING COMPLETED SUCCESSFULLY!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
