import { Pool, types } from 'pg';

// OID 1082 = tipo DATE do Postgres. Mantemos a string crua do banco
// (ex: "2026-08-28") sem conversão — ver lib/controle-lojas-db.ts para o
// mesmo tratamento e a razão (evita bug de timezone ao comparar "YYYY-MM-DD").
types.setTypeParser(1082, (value: string) => value);

declare global {
  // eslint-disable-next-line no-var
  var __appPool: Pool | undefined;
}

export function getAppPool(): Pool {
  if (!global.__appPool) {
    global.__appPool = new Pool({
      connectionString: process.env.APP_DATABASE_URL,
      max: 5,
    });
  }
  return global.__appPool;
}
