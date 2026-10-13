import { SEED_DEMO_TEAMS, SEED_DEMO_PLAYERS } from './src/lib/demoSeedData';

console.log('Teams count:', SEED_DEMO_TEAMS.length);
console.log('Players count:', SEED_DEMO_PLAYERS.length);

const teamPlayers: Record<string, string[]> = {};
SEED_DEMO_PLAYERS.forEach(p => {
  if (!teamPlayers[p.teamId]) teamPlayers[p.teamId] = [];
  teamPlayers[p.teamId].push(p.playerName);
});

console.log('Sample teams player counts:');
Object.entries(teamPlayers).slice(0, 5).forEach(([t, ps]) => {
  console.log(`Team ${t}: ${ps.length} players - ${ps.join(', ')}`);
});
