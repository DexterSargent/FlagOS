import { SEED_DEMO_PLAYS } from './src/lib/demoSeedData';

const matchIds = new Set(SEED_DEMO_PLAYS.map(p => p.matchId));
console.log('Matches with plays in SEED_DEMO_PLAYS:', Array.from(matchIds));
console.log('Total plays:', SEED_DEMO_PLAYS.length);
