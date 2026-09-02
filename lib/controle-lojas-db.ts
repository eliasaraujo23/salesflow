import { Pool, types } from 'pg';

// OID 1082 = tipo DATE do Postgres. Por padrão o driver retorna um objeto Date
// (que ao virar JSON vira uma string com timezone, ex: "2026-08-28T03:00:00.000Z"),
// o que quebra qualquer comparação por "YYYY-MM-DD" puro no client. Mantemos a
// string crua do banco (ex: "2026-08-28") sem conversão.
types.setTypeParser(1082, (value: string) => value);

declare global {
  // eslint-disable-next-line no-var
  var __controleLojasPool: Pool | undefined;
}

export function getControleLojasPool(): Pool {
  if (!global.__controleLojasPool) {
    global.__controleLojasPool = new Pool({
      connectionString: process.env.CONTROLE_LOJAS_DATABASE_URL,
      max: 5,
    });
  }
  return global.__controleLojasPool;
}
