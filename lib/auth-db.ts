import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __authPool: Pool | undefined;
}

export function getAuthPool(): Pool {
  if (!global.__authPool) {
    global.__authPool = new Pool({
      connectionString: process.env.AUTH_DATABASE_URL,
      max: 5,
    });
  }
  return global.__authPool;
}
