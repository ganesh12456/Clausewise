import { migrate } from './migrate.mjs';

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('Local migrations require a localhost PostgreSQL database. Check .env.local and inherited DATABASE_URL.');
}
await migrate();
