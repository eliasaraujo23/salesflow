import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireLojaAccess } from '@/lib/auth/require-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const ano = req.nextUrl.searchParams.get('ano');
  const mes = req.nextUrl.searchParams.get('mes'); // 1-12

  const pool = getControleLojasPool();
  const result = ano && mes
    ? await pool.query(
        `SELECT * FROM metal
         WHERE loja = $1 AND EXTRACT(YEAR FROM data) = $2 AND EXTRACT(MONTH FROM data) = $3
         ORDER BY datetime DESC`,
        [loja, Number(ano), Number(mes)]
      )
    : await pool.query(`SELECT * FROM metal WHERE loja = $1 ORDER BY datetime DESC`, [loja]);

  return NextResponse.json({ data: result.rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = randomUUID();

  const totalPeso = ['ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina', 'prata']
    .reduce((sum: number, q) => sum + (Number(body[q]) || 0), 0);
  const pagoPorGrama = totalPeso > 0 ? (Number(body.valor) || 0) / totalPeso : 0;
  const datetime = `${body.data}T${body.hora ?? '00:00'}:00`;

  const pool = getControleLojasPool();
  const result = await pool.query(
    `INSERT INTO metal (
      id, loja, cod_interno, data, hora, datetime, avaliadores, nome, cpf, transacao,
      feedback_id, feedback_nc_id, modalidade_id, empresa_id,
      ouro_24k, ouro_22k, pt, ouro_750, ouro_720, bx, platina, prata,
      total_peso, preco, valor, pago_por_grama, observacao
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
    RETURNING *`,
    [
      id, loja, body.cod_interno, body.data, body.hora, datetime, body.avaliadores ?? [],
      body.nome ?? '', body.cpf ?? '', body.transacao,
      body.feedback_id ?? null, body.feedback_nc_id ?? null,
      body.modalidade_id ?? null, body.empresa_id ?? null,
      body.ouro_24k ?? 0, body.ouro_22k ?? 0, body.pt ?? 0, body.ouro_750 ?? 0, body.ouro_720 ?? 0,
      body.bx ?? 0, body.platina ?? 0, body.prata ?? 0,
      totalPeso, body.preco ?? 0, body.valor ?? 0, pagoPorGrama, body.observacao ?? '',
    ]
  );

  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
