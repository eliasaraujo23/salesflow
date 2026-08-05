import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

const DESTINOS_EXCL = new Set([
  'GRINGA', 'ETIQUETA UNICA', 'ACHADOS PERDIDOS', 'BRILHO VINTAGE',
  'LOHANA COELHO', 'LOUCA POR JOIAS', 'LUCIMARY', 'HELTON', 'EDUARDO',
  'THAIS', 'AGOSTO', 'AUGUSTO', 'PAMELA FERRARI', 'CADASTRO PENDENTE',
  'RETORNO SCRAP', 'EMERSON TIJUCA',
]);

function normalizeStr(s: string): string {
  return s.toUpperCase().trim()
    .replace(/[ÁÀÂÃ]/g, 'A').replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÍÌÎ]/g, 'I').replace(/[ÓÒÔÕ]/g, 'O')
    .replace(/[ÚÙÛ]/g, 'U').replace(/Ç/g, 'C');
}

const STATUS_NOME: Record<number, string> = {
  1: 'Ativo',
  2: 'Inativo',
  3: 'Sem Venda Efetivada',
  4: 'Reservado',
  5: 'Manutenção',
  6: 'Em Comodato',
  7: 'Vendido',
  8: 'Consignado',
};

export interface RefDetail {
  referencia:    string;
  status_id:     number;
  status_nome:   string;
  destino:       string | null;
  preco_avista:  number | null;
  fotos:         number;
  motivo:        string;
}

export async function POST(req: Request) {
  const body = await req.json() as { refs?: unknown };
  const refs = Array.isArray(body.refs) ? (body.refs as string[]).slice(0, 500) : [];
  if (refs.length === 0) return NextResponse.json({ data: [] });

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      referencia:   string;
      status_id:    number;
      destino:      string | null;
      preco_avista: number | null;
      fotos:        number;
      em_manutencao: boolean;
      tem_principal: boolean;
      tem_secundaria: boolean;
    }>(
      `SELECT
         pd.referencia,
         pd."statusProdutoId"        AS status_id,
         d.destino,
         pd.preco_avista::float8     AS preco_avista,
         (SELECT COUNT(*)::int FROM leilao_image li WHERE li."productDetailsId" = pd.id)  AS fotos,
         (pd."destinoManutencaoId" IS NOT NULL)                                            AS em_manutencao,
         EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = true)  AS tem_principal,
         EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = false) AS tem_secundaria
       FROM product_details pd
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       WHERE pd.referencia = ANY($1::text[])`,
      [refs],
    );

    const data: RefDetail[] = rows.map(r => {
      let motivo = 'Fora da Base Sistema';
      if (r.em_manutencao) {
        motivo = 'Em Manutenção';
      } else if (r.destino && DESTINOS_EXCL.has(normalizeStr(r.destino))) {
        motivo = 'Destino Exclusivo';
      } else if (![3, 6].includes(r.status_id)) {
        motivo = STATUS_NOME[r.status_id] ?? `Status ${r.status_id}`;
      } else if (!r.preco_avista || r.preco_avista <= 0) {
        motivo = 'Sem Preço';
      } else if (!r.tem_principal) {
        motivo = 'Sem Foto Principal';
      } else if (!r.tem_secundaria) {
        motivo = 'Sem Foto Secundária';
      }

      return {
        referencia:   r.referencia,
        status_id:    r.status_id,
        status_nome:  STATUS_NOME[r.status_id] ?? `Status ${r.status_id}`,
        destino:      r.destino,
        preco_avista: r.preco_avista,
        fotos:        r.fotos,
        motivo,
      };
    });

    return NextResponse.json({ data });
  } finally {
    client.release();
  }
}
