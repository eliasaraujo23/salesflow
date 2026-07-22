import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { CC_DEFAULTS } from '@/lib/actions/carros-chefe';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

const STATUS_VENDIDA = [2, 4, 13];

function fmt(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function capitalize(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Types ────────────────────────────────────────────────────────────────────

type Row = {
  referencia: string;
  tipo: string;
  custo_real: number | null;
  preco_cobrado: number | null;
  preco_parceiro: number | null;
  preco_avista: number | null;
  preco_parcelado: number | null;
  peso: number | null;
  diamantes: string | null;
  cts_diamantes: string | null;
  pedra_colorida: string | null;
  cts_pedra_colorida: string | null;
  descricao_jewel: string | null;
  produto: string | null;
  subtipo: string | null;
  tipo_pedra: string | null;
  lapidacao: string | null;
  status_id: number | null;
  destino: string | null;
};

type DestRow = {
  produto: string | null;
  subtipo: string | null;
  tipo_pedra: string | null;
  lapidacao: string | null;
};

// ── DB helpers ───────────────────────────────────────────────────────────────

async function queryRef(ref: string): Promise<Row | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.peso, pd.diamantes, pd.cts_diamantes, pd.pedra_colorida, pd.cts_pedra_colorida,
         pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         p.produto, s.subtipo, tp.tipo_pedra, l.lapidacao, d.destino
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN lapidacao  l  ON l.id  = pd."lapidacaoId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE UPPER(pd.referencia) = $1
       LIMIT 1`,
      [ref.toUpperCase()],
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
}

// ── Reply generators ─────────────────────────────────────────────────────────

function generateReply(msg: string, d: Row): string {
  const lower = msg.toLowerCase();
  const ref = d.referencia;
  const vendida = d.status_id != null && STATUS_VENDIDA.includes(d.status_id);
  const desc = d.descricao_jewel ?? null;

  if (/custo/.test(lower)) {
    return `O custo da referência **${ref}** é ${fmt(d.custo_real)}.`;
  }
  if (/parceiro/.test(lower)) {
    if (vendida) return `A referência **${ref}** já foi vendida por ${fmt(d.preco_cobrado)}.`;
    return `O preço parceiro da referência **${ref}** é ${fmt(d.preco_parceiro)}.`;
  }
  if (/vista/.test(lower)) {
    if (vendida) return `A referência **${ref}** já foi vendida por ${fmt(d.preco_cobrado)}.`;
    return `O preço à vista da referência **${ref}** é ${fmt(d.preco_avista)}.`;
  }
  if (/parcel/.test(lower)) {
    if (vendida) return `A referência **${ref}** já foi vendida por ${fmt(d.preco_cobrado)}.`;
    return `O preço parcelado da referência **${ref}** é ${fmt(d.preco_parcelado)}.`;
  }
  if (/dispon|estoque|status|vendid/.test(lower)) {
    if (vendida) return `A referência **${ref}** já foi vendida${d.destino ? ` para ${capitalize(d.destino)}` : ''}.`;
    return `A referência **${ref}** está disponível${d.destino ? ` — ${capitalize(d.destino)}` : ''}.`;
  }
  if (/onde|destino/.test(lower)) {
    if (!d.destino) return `Não há destino registrado para a referência **${ref}**.`;
    if (vendida) return `A referência **${ref}** foi vendida para ${capitalize(d.destino)}.`;
    return `A referência **${ref}** está em: ${capitalize(d.destino)}.`;
  }
  if (/descri[çc]|detalhe|o que [eé]|informa/.test(lower)) {
    return desc ? `**${ref}**: ${desc}` : `**${ref}** — ${d.produto ? capitalize(d.produto) : 'Peça'}.`;
  }
  if (/pre[çc]o|valor|quanto/.test(lower)) {
    if (vendida) return `A referência **${ref}** foi vendida por ${fmt(d.preco_cobrado)}.`;
    return `Preços da referência **${ref}**:\n— Parceiro: ${fmt(d.preco_parceiro)}\n— À Vista: ${fmt(d.preco_avista)}\n— Parcelado: ${fmt(d.preco_parcelado)}`;
  }

  // Resumo completo
  const lines: string[] = [];
  lines.push(`**${ref}** (${d.tipo})${d.produto ? ' — ' + capitalize(d.produto) : ''}`);
  if (desc) lines.push(desc);
  if (vendida) {
    lines.push(`✅ Vendida por ${fmt(d.preco_cobrado)}${d.destino ? ` · ${capitalize(d.destino)}` : ''}`);
    lines.push(`Custo: ${fmt(d.custo_real)}`);
  } else {
    if (d.destino) lines.push(`📍 ${capitalize(d.destino)}`);
    lines.push(`Custo: ${fmt(d.custo_real)} · Cobrado: ${fmt(d.preco_cobrado)}`);
    lines.push(`Parceiro: ${fmt(d.preco_parceiro)} · À Vista: ${fmt(d.preco_avista)} · Parcelado: ${fmt(d.preco_parcelado)}`);
  }
  return lines.join('\n');
}

// ── Carros chefe helpers ─────────────────────────────────────────────────────

function matchesCC(cc: (typeof CC_DEFAULTS)[0], row: DestRow): boolean {
  const n = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();
  if (cc.produto    && !n(row.produto).includes(n(cc.produto)))  return false;
  if (cc.subtipo    &&  n(row.subtipo)    !== n(cc.subtipo))     return false;
  if (cc.tipo_pedra &&  n(row.tipo_pedra) !== n(cc.tipo_pedra))  return false;
  if (cc.lapidacao  &&  n(row.lapidacao)  !== n(cc.lapidacao))   return false;
  return true;
}

async function checkDestinoCCCoverage(lower: string): Promise<string> {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Extrair nome do destino da mensagem
  // Padrão 1: "O/A [DESTINO] está..."
  const m1 = lower.match(/(?:^|\s)(o|a)\s+(.+?)\s+(?:est[aá]|tem|precisa|falta)/i);
  let destinoTerm = m1 ? m1[2].trim() : '';

  // Padrão 2: "[DESTINO] Está..." (sem artigo)
  if (!destinoTerm) {
    const m2 = lower.match(/^(.+?)\s+(?:est[aá]|tem)\s/i);
    if (m2) destinoTerm = m2[1].trim();
  }

  // Fallback: remove trigger words e extrai o que resta
  if (!destinoTerm) {
    destinoTerm = lower
      .replace(/carros?\s*chefes?|est[aá]\s*(sem|com\s*(qual|quais))|falt\w*|tem\s*(todos|algum|qual|quais)|cobert\w*/g, ' ')
      .replace(/[?!.,]/g, ' ')
      .replace(/\b(o|a|os|as|um|uma|de|do|da|sem|algum|alguma|todos|todas|qual|quais|para|com|está|tem)\b/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  if (!destinoTerm || destinoTerm.length < 2) {
    return 'Qual destino você quer verificar?';
  }

  const client = await pool.connect();
  try {
    const destRes = await client.query<{ destino: string }>(
      `SELECT DISTINCT d.destino FROM destinos d WHERE LOWER(d.destino) LIKE $1 ORDER BY d.destino LIMIT 5`,
      [`%${norm(destinoTerm)}%`],
    );

    if (destRes.rows.length === 0) {
      return `Não encontrei nenhum destino com o nome **"${destinoTerm}"**. Verifique o nome e tente novamente.`;
    }

    const destinos = destRes.rows.map(r => r.destino);
    const destino = destinos.sort((a, b) => a.length - b.length)[0];

    const piecesRes = await client.query<DestRow>(
      `SELECT p.produto, s.subtipo, tp.tipo_pedra, l.lapidacao
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN lapidacao  l  ON l.id  = pd."lapidacaoId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE pd."statusProdutoId" IN (3, 6) AND LOWER(d.destino) = LOWER($1)`,
      [destino],
    );

    const covered = new Set<number>();
    for (const row of piecesRes.rows) {
      for (let i = 0; i < CC_DEFAULTS.length; i++) {
        if (matchesCC(CC_DEFAULTS[i], row)) covered.add(i);
      }
    }

    const missing = CC_DEFAULTS.filter((_, i) => !covered.has(i));
    const total = CC_DEFAULTS.length;

    if (missing.length === 0) {
      return `✅ **${capitalize(destino)}** está com todos os ${total} carros chefe cobertos!`;
    }

    const lines = [
      `📋 **${capitalize(destino)}** — ${covered.size}/${total} carros chefe cobertos`,
      ``,
      `**Faltando (${missing.length}):**`,
      ...missing.map(cc => `• ${cc.label}`),
    ];

    if (destinos.length > 1) {
      lines.push(``, `_(Outros destinos encontrados: ${destinos.slice(1).join(', ')})_`);
    }

    return lines.join('\n');
  } finally {
    client.release();
  }
}

function answerCarrosChefe(lower: string): string {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const stopCC = /carro.?chefe|cc|está|tem|algum|alguma|existe|qual|quais|lista|todos|todas|sem|com/g;
  const termo = norm(lower.replace(stopCC, ' ').replace(/\s+/g, ' ').trim());

  if (!termo || termo.length < 2) {
    const lista = CC_DEFAULTS.map(c => `• ${c.label}`).join('\n');
    return `Carros chefe cadastrados (${CC_DEFAULTS.length}):\n\n${lista}`;
  }

  const found = CC_DEFAULTS.filter(c =>
    norm(c.label).includes(termo) ||
    norm(c.subtipo).includes(termo) ||
    norm(c.produto).includes(termo) ||
    norm(c.tipo_pedra).includes(termo)
  );

  if (found.length === 0) {
    const palavras = termo.split(/\s+/).filter(p => p.length > 2);
    const partial = CC_DEFAULTS.filter(c =>
      palavras.every(p =>
        norm(c.label).includes(p) ||
        norm(c.subtipo).includes(p) ||
        norm(c.produto).includes(p) ||
        norm(c.tipo_pedra).includes(p)
      )
    );
    if (partial.length > 0) {
      return `Encontrei ${partial.length} carro(s) chefe relacionado(s) a "${termo}":\n\n` +
        partial.map(c => `• ${c.label}`).join('\n');
    }
    return `Não encontrei nenhum carro chefe com o termo **"${termo}"**. Pode ser que esse tipo de peça ainda não esteja na lista de carros chefe.`;
  }

  return `Encontrei ${found.length} carro(s) chefe para **"${termo}"**:\n\n` +
    found.map(c => `• ${c.label}`).join('\n');
}

async function searchByCriteria(lower: string): Promise<string> {
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const stopwords = new Set([
    'qual','quais','o','a','os','as','um','uma','de','do','da','dos','das',
    'que','temos','tem','disponivel','estoque','comodato','mais','menos',
    'antigo','antiga','novo','nova','recente','caro','cara','barato','barata',
    'velho','velha','seja','em','ou','para','com','sem','me','meu','minha',
    'e','ao','na','no','nos','nas','por','primeiro','ultimo','eu','voce',
    'passe','mostre','mostra','liste','listar','quero','preciso','ver','veja',
    'opcoes','opcao','tenho','existem','existe','ha','algum','alguma','alguns',
    'algumas','tipo','tipos','peca','pecas','joia','joias','show','traga',
    'traz','busca','busque','encontre','encontra','todas','todos',
  ]);

  const keywords = lower
    .replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(normalize(w)));

  if (keywords.length === 0) {
    return 'Pode reformular a pergunta? Tente incluir o tipo de peça (ex: colar riviera, anel solitário).';
  }

  const querAntigo = /antigo|antiga|mais velho|primeiro/.test(lower);
  const querNovo   = /novo|nova|recente|último|ultimo/.test(lower);
  const querCaro   = /mais caro|maior pre[çc]o|mais valor/.test(lower);
  const querBarato = /mais barato|menor pre[çc]o/.test(lower);

  const kwConditions = keywords.map((_, i) => `(
    LOWER(pd.descricao_jewel) LIKE $${i + 1}
    OR LOWER(p.produto) LIKE $${i + 1}
    OR LOWER(s.subtipo) LIKE $${i + 1}
    OR LOWER(tp.tipo_pedra) LIKE $${i + 1}
  )`).join(' AND ');
  const kwParams = keywords.map(k => `%${k}%`);

  const orderBy = querCaro   ? 'pd.preco_cobrado DESC NULLS LAST'
                : querBarato ? 'pd.preco_cobrado ASC NULLS LAST'
                : querNovo   ? 'pd.data_entrada DESC NULLS LAST'
                :              'pd.data_entrada ASC NULLS LAST';

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         pd.data_entrada,
         p.produto, s.subtipo, tp.tipo_pedra, d.destino
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE pd."statusProdutoId" IN (3, 6) AND ${kwConditions}
       ORDER BY ${orderBy}
       LIMIT 5`,
      kwParams,
    );

    if (result.rows.length === 0) {
      return 'Não encontrei nenhuma peça disponível com esses critérios.';
    }

    const rows = result.rows as Array<{
      referencia: string; tipo: string; custo_real: number | null;
      preco_cobrado: number | null; preco_parceiro: number | null;
      preco_avista: number | null; preco_parcelado: number | null;
      descricao_jewel: string | null; status_id: number | null;
      data_entrada: string | null; produto: string | null;
      subtipo: string | null; destino: string | null;
    }>;

    const qualifier = querAntigo ? 'mais antiga' : querNovo ? 'mais recente' : 'disponível';
    const lines: string[] = [`Encontrei ${rows.length} peça(s) ${qualifier}:`];

    for (const r of rows) {
      const dataStr = r.data_entrada ? new Date(r.data_entrada).toLocaleDateString('pt-BR') : null;
      lines.push('');
      lines.push(`**${r.referencia}** (${r.tipo})${r.produto ? ' — ' + r.produto : ''}${dataStr ? ' · Entrada: ' + dataStr : ''}`);
      if (r.descricao_jewel) lines.push(r.descricao_jewel);
      if (r.destino) lines.push(`📍 ${r.destino}`);
      lines.push(`Custo: ${fmt(r.custo_real)} · Cobrado: ${fmt(r.preco_cobrado)}`);
      if (r.preco_parceiro || r.preco_avista || r.preco_parcelado) {
        lines.push(`Parceiro: ${fmt(r.preco_parceiro)} · À Vista: ${fmt(r.preco_avista)} · Parcelado: ${fmt(r.preco_parcelado)}`);
      }
    }

    return lines.join('\n');
  } finally {
    client.release();
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.PG_CONNECTION_STRING) {
    return NextResponse.json({ reply: 'Banco de dados não configurado.' }, { status: 500 });
  }

  const body = await req.json() as { message?: string };
  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ reply: 'Mensagem vazia.' }, { status: 400 });
  }

  const lower = message.toLowerCase();

  // Saudações
  if (/^(ol[aá]|oi|opa|e a[ií]|bom dia|boa tarde|boa noite|tudo bem|tudo bom|como vai)[\s!?]*$/.test(lower)) {
    return NextResponse.json({ reply: 'Olá! Em que posso te ajudar?' });
  }

  // Agradecimentos
  if (/^(obrigad|valeu|vlw|tmj|brigad)/.test(lower)) {
    return NextResponse.json({ reply: 'Disponha! Se precisar de mais alguma coisa é só falar.' });
  }

  // Referência direta (ex: E11111)
  const match = message.match(/[A-Za-z]\d{4,6}/);
  if (match) {
    try {
      const data = await queryRef(match[0]);
      if (!data) {
        return NextResponse.json({ reply: `Referência **${match[0].toUpperCase()}** não encontrada no banco.` });
      }
      return NextResponse.json({ reply: generateReply(message, data) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
    }
  }

  // Carros chefe — destino check: "O Brilho Vintage está sem algum carro chefe?"
  if (/carros?\s*chefes?/.test(lower)) {
    if (/est[aá]\s*(sem|com\s*(qual|quais))|falt|tem\s*(todos|algum|qual|quais)|cobert|quais?\s+.*\s+tem/.test(lower)) {
      try {
        const reply = await checkDestinoCCCoverage(lower);
        return NextResponse.json({ reply });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
      }
    }
    return NextResponse.json({ reply: answerCarrosChefe(lower) });
  }

  // Busca por critérios (linguagem natural)
  try {
    const reply = await searchByCriteria(lower);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
  }
}
