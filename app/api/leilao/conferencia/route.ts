import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});


function normalizeStr(s: string): string {
  return s.toUpperCase().trim()
    .replace(/[ÁÀÂÃ]/g, 'A').replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÍÌÎ]/g, 'I').replace(/[ÓÒÔÕ]/g, 'O')
    .replace(/[ÚÙÛ]/g, 'U').replace(/Ç/g, 'C');
}

// Status IDs que indicam venda em andamento (mesma lista de analise-jf)
const STATUS_VENDA = new Set([2, 4, 13]);

const STATUS_NOME: Record<number, string> = {
  1:  'Ativo',
  2:  'Aguardando Pagamento',
  3:  'Sem Venda Efetivada',
  4:  'Vendido Parcelado',
  5:  'Manutenção',
  6:  'Em Comodato',
  7:  'Vendido',
  8:  'Consignado',
  13: 'Vendido Pago',
};

export interface ConferenciaIssue {
  referencia:  string;
  problema:    'destino_exclusivo' | 'status_venda';
  status_id:   number;
  status_nome: string;
  destino:     string | null;
}

export async function POST(req: Request) {
  const body     = await req.json() as { refs?: unknown; destinos?: unknown };
  const refs     = Array.isArray(body.refs)     ? (body.refs     as string[]).slice(0, 3000) : [];
  const destinos = Array.isArray(body.destinos) ? (body.destinos as string[]) : [];
  if (refs.length === 0) return NextResponse.json({ data: [] });

  const DESTINOS_EXCL = new Set(destinos.map(normalizeStr));

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      referencia: string;
      status_id:  number;
      destino:    string | null;
    }>(
      `SELECT pd.referencia,
              pd."statusProdutoId" AS status_id,
              d.destino
       FROM product_details pd
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       WHERE pd.referencia = ANY($1::text[])`,
      [refs],
    );

    const data: ConferenciaIssue[] = [];
    for (const r of rows) {
      const destinoExcl = r.destino ? DESTINOS_EXCL.has(normalizeStr(r.destino)) : false;
      const statusVenda = STATUS_VENDA.has(r.status_id);

      if (destinoExcl) {
        data.push({
          referencia:  r.referencia,
          problema:    'destino_exclusivo',
          status_id:   r.status_id,
          status_nome: STATUS_NOME[r.status_id] ?? `Status ${r.status_id}`,
          destino:     r.destino,
        });
      } else if (statusVenda) {
        data.push({
          referencia:  r.referencia,
          problema:    'status_venda',
          status_id:   r.status_id,
          status_nome: STATUS_NOME[r.status_id] ?? `Status ${r.status_id}`,
          destino:     r.destino,
        });
      }
    }

    return NextResponse.json({ data });
  } finally {
    client.release();
  }
}
