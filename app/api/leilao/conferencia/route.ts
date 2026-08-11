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

const PRODUTOS_EXCL = new Set(['TARRACHA', 'COMPLEMENTO']);
const STATUS_VENDA  = new Set([2, 4, 13]);
const STATUS_VALID  = new Set([3, 6]);

export type ProblemaType =
  | 'em_manutencao'
  | 'produto_excluido'
  | 'destino_exclusivo'
  | 'status_venda'
  | 'status_invalido'
  | 'sem_preco'
  | 'sem_fotos';

export interface ConferenciaIssue {
  referencia:   string;
  problema:     ProblemaType;
  status_id:    number | null;
  status_nome:  string;
  destino:      string | null;
  preco_avista: number | null;
  fotos:        number;
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
      referencia:   string;
      status_id:    number | null;
      dest_manut:   number | null;
      status_manut: number | null;
      preco_avista: number | null;
      destino:      string | null;
      produto:      string | null;
      fotos:        number;
    }>(
      `SELECT pd.referencia,
              pd."statusProdutoId"     AS status_id,
              pd."destinoManutencaoId" AS dest_manut,
              pd."statusManutencaoId"  AS status_manut,
              pd.preco_avista::float8 AS preco_avista,
              d.destino,
              p.produto,
              (SELECT COUNT(*)::int FROM leilao_image li WHERE li."productDetailsId" = pd.id) AS fotos
       FROM product_details pd
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       LEFT JOIN produto  p ON p.id = pd."produtoId"
       WHERE pd.referencia = ANY($1::text[])`,
      [refs],
    );

    const data: ConferenciaIssue[] = [];
    for (const r of rows) {
      const statusId   = r.status_id;
      const statusNome = statusId != null ? (STATUS_NOME[statusId] ?? `Status ${statusId}`) : 'Sem Status';

      let problema: ProblemaType | null = null;

      if (r.dest_manut != null || r.status_manut != null) {
        problema = 'em_manutencao';
      } else if (r.produto && PRODUTOS_EXCL.has(normalizeStr(r.produto))) {
        problema = 'produto_excluido';
      } else if (r.destino && DESTINOS_EXCL.has(normalizeStr(r.destino))) {
        problema = 'destino_exclusivo';
      } else if (statusId != null && STATUS_VENDA.has(statusId)) {
        problema = 'status_venda';
      } else if (statusId == null || !STATUS_VALID.has(statusId)) {
        problema = 'status_invalido';
      } else if (!r.preco_avista || r.preco_avista <= 0) {
        problema = 'sem_preco';
      } else if (r.fotos === 0) {
        problema = 'sem_fotos';
      }

      if (problema) {
        data.push({
          referencia:   r.referencia,
          problema,
          status_id:    statusId,
          status_nome:  statusNome,
          destino:      r.destino,
          preco_avista: r.preco_avista,
          fotos:        r.fotos,
        });
      }
    }

    return NextResponse.json({ data });
  } finally {
    client.release();
  }
}
