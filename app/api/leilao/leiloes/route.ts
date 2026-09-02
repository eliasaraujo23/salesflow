import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const leilaoStatusSchema = z.enum(['captando', 'convite', 'convite_catalogo', 'venda_pos_leilao', 'finalizado']);

const leilaoInputSchema = z.object({
  numero: z.string().min(1),
  nome: z.string().min(1),
  dataInicio: z.string().min(1),
  dataFim: z.string().min(1),
  cor: z.string().min(1),
  codigoPlatforma: z.string(),
  observacao: z.string().optional(),
  status: leilaoStatusSchema.optional(),
});

const leilaoOutputSchema = z.object({
  id: z.string(),
  numero: z.string(),
  nome: z.string(),
  dataInicio: z.string(),
  dataFim: z.string(),
  cor: z.string(),
  codigoPlatforma: z.string(),
  observacao: z.string().nullable(),
  status: leilaoStatusSchema.nullable(),
});

type LeilaoOutput = z.infer<typeof leilaoOutputSchema>;

function mapRow(row: any): LeilaoOutput {
  return {
    id: row.id,
    numero: row.numero,
    nome: row.nome,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    cor: row.cor,
    codigoPlatforma: row.codigo_plataforma,
    observacao: row.observacao,
    status: row.status,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, numero, nome, data_inicio, data_fim, cor, codigo_plataforma, observacao, status
     FROM leilao_leiloes ORDER BY data_inicio ASC`
  );
  const data: LeilaoOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = leilaoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { numero, nome, dataInicio, dataFim, cor, codigoPlatforma, observacao, status } = parsed.data;
  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO leilao_leiloes (numero, nome, data_inicio, data_fim, cor, codigo_plataforma, observacao, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, numero, nome, data_inicio, data_fim, cor, codigo_plataforma, observacao, status`,
    [numero, nome, dataInicio, dataFim, cor, codigoPlatforma, observacao ?? null, status ?? null]
  );
  const data: LeilaoOutput = mapRow(result.rows[0]);
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
