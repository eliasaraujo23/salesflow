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

// Remove plural suffix para melhorar o LIKE no banco
function stemKw(w: string): string {
  if (w.length > 5 && w.endsWith('ares')) return w.slice(0, -2); // colares→colar
  if (w.length > 4 && w.endsWith('eis'))  return w.slice(0, -3) + 'el'; // aneis→anel
  if (w.length > 4 && w.endsWith('s'))   return w.slice(0, -1);  // brincos→brinco
  return w;
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

/** Extrai candidatos de destino da mensagem (do mais específico ao mais geral) */
function extractDestinoTerms(lower: string): string[] {
  const candidates: string[] = [];

  // Padrão A: "com o/a X", "no/na X", "do/da X", "pelo/pela/por X" — preposição + artigo
  const mA = lower.match(/\b(?:com\s+(?:o|a)|no|na|do|da|para\s+(?:o|a)|pelos?|pelas?|por)\s+([a-záàâãéèêíìîóòôõúùûç][a-záàâãéèêíìîóòôõúùûç\s]+?)(?:\s*(?:\bem\b|\bcomodato\b|est[aá]|[?!.,]|$))/i);
  if (mA) candidates.push(mA[1].trim());

  // Padrão B: "O/A [DESTINO] está/tem..."
  const mB = lower.match(/(?:^|\s)(?:o|a)\s+(.+?)\s+(?:est[aá]|tem|precisa|falta)/i);
  if (mB) candidates.push(mB[1].trim());

  // Padrão C: "[DESTINO] está/tem..." (sem artigo, no início)
  const mC = lower.match(/^(.+?)\s+(?:est[aá]|tem)\s/i);
  if (mC) candidates.push(mC[1].trim());

  // Padrão D: "[DESTINO] [verbo] quais/qual carros chefe"
  const mD = lower.match(/^(.+?)\s+(?:tem|possui|está\s+com)\s+(?:quais?|todos?)/i);
  if (mD) candidates.push(mD[1].trim());

  // Fallback: remove trigger words e usa o que resta
  const fallback = lower
    .replace(/carros?\s*chefes?|\bcc\b|est[aá]\s*(sem|com\s*(qual|quais))|falt\w*|tem\s*(todos|algum|qual|quais)|cobert\w*|em\s+comodato|comodato/g, ' ')
    .replace(/[?!.,]/g, ' ')
    .replace(/\b(o|a|os|as|um|uma|de|do|da|sem|algum|alguma|todos|todas|qual|quais|para|com|está|tem|no|na)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (fallback.length >= 2) candidates.push(fallback);

  // Retorna únicos não-vazios
  return [...new Set(candidates.filter(c => c.length >= 2))];
}

/**
 * Verifica cobertura de carros chefe para um destino.
 * Retorna null se nenhum destino for encontrado no banco (cai em answerCarrosChefe).
 */
async function checkDestinoCCCoverage(lower: string): Promise<string | null> {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const terms = extractDestinoTerms(lower);
  if (terms.length === 0) return null;

  const client = await pool.connect();
  try {
    // Tentar cada candidato até encontrar um destino no banco
    let destinos: string[] = [];
    let matchedTerm = '';
    for (const term of terms) {
      const res = await client.query<{ destino: string }>(
        `SELECT DISTINCT d.destino FROM destinos d WHERE LOWER(d.destino) LIKE $1 ORDER BY d.destino LIMIT 5`,
        [`%${norm(term)}%`],
      );
      if (res.rows.length > 0) {
        destinos = res.rows.map(r => r.destino);
        matchedTerm = term;
        break;
      }
    }

    // Nenhum destino encontrado → retorna null para o caller tentar answerCarrosChefe
    if (destinos.length === 0) return null;

    const destino = destinos.sort((a, b) => a.length - b.length)[0];
    void matchedTerm; // used only for lookup

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

async function searchByCriteria(lower: string, limit = 5): Promise<string> {
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const stopwords = new Set([
    // artigos
    'o','a','os','as','um','uma','uns','umas',
    // preposições simples
    'de','em','por','com','sem','sob','sobre','apos','ate','ante','entre',
    'contra','desde','durante','perante','tras',
    // preposições + artigo
    'do','da','dos','das','no','na','nos','nas','ao','aos',
    'pelo','pela','pelos','pelas','para','pra','pro','pros','pras',
    // contrações com demonstrativos
    'deste','desta','destes','destas','desse','dessa','desses','dessas',
    'daquele','daquela','neste','nesta','nesse','nessa','nesses','nessas',
    'disso','disto','daquilo','nisso','nisto',
    // pronomes pessoais e oblíquos
    'eu','tu','ele','ela','nos','vos','eles','elas','me','te','se','lhe','lhes',
    'voce','voces','vc','vcs',
    // pronomes possessivos
    'meu','minha','meus','minhas','teu','tua','teus','tuas',
    'seu','sua','seus','suas','nosso','nossa','nossos','nossas',
    // pronomes demonstrativos
    'este','esta','estes','estas','esse','essa','esses','essas',
    'aquele','aquela','aqueles','aquelas','isto','isso','aquilo',
    // pronomes indefinidos
    'algum','alguma','alguns','algumas','nenhum','nenhuma',
    'todo','toda','todos','todas','tudo','nada','ninguem','alguem',
    'outro','outra','outros','outras','mesmo','mesma','proprio','propria',
    'cada','qualquer','quaisquer','certo','certa','tal','tais',
    // pronomes interrogativos e relativos
    'que','quem','qual','quais','quanto','quanta','quantos','quantas',
    'onde','aonde','como','quando','porque','pq','porq',
    // conjunções
    'e','ou','mas','nem','se','pois','porem','contudo','todavia',
    'entretanto','portanto','logo','assim','caso','embora','enquanto',
    'nao','sim','tambem','tb','tbm',
    // advérbios e partículas
    'mais','menos','muito','muita','muitos','muitas','pouco','pouca',
    'tanto','tanta','bem','mal','so','apenas','somente','ainda','ja',
    'sempre','nunca','jamais','agora','hoje','ai','aqui','la','ali',
    'entao','tao','ta','ne','bastante','demais','meio','quase','mt','mto',
    // verbo ser
    'sou','es','somos','sao','era','eramos','eram','fui','foi','fomos','foram',
    'serei','sera','serao','seria','seriamos','seriam','seja','sejam',
    // verbo estar
    'estou','esta','estamos','estao','estava','estavamos','estavam',
    'estive','esteve','estivemos','estiveram','esteja','estejam',
    // verbo ter
    'tenho','tem','temos','tinha','tinhamos','tinham','tive','teve',
    'tivemos','tiveram','terei','tera','teria','teriamos','teriam','tenha','tenham',
    // verbo haver
    'ha','haja','havia','houve','havera',
    // verbo poder
    'posso','pode','podemos','podem','podia','podiamos','podiam',
    'pude','pudemos','puderam','possa','possam',
    // verbo querer
    'quero','quer','queremos','querem','queria','queriamos','queriam',
    'quis','quisemos','quiseram',
    // verbo precisar
    'preciso','precisa','precisamos','precisam','precisava','precisavam',
    // verbo ficar
    'fico','fica','ficamos','ficam','ficava','ficavam','fiquei','ficou','ficaram',
    // verbo ir / vir
    'vou','vai','vamos','vao','ia','iam','venho','vem','vinha','vinham',
    'vim','veio','viemos','vieram',
    // verbo fazer / saber / dar
    'faco','faz','fazemos','fazem','fazia','faziam','fiz','fez','fizemos','fizeram',
    'sei','sabe','sabemos','sabem','sabia','sabiam',
    'dou','da','damos','dao','dava','davam','dei','deu','demos','deram',
    // verbos de busca e comando
    'busco','busca','busque','buscar','procuro','procura','procure','procurar',
    'mostre','mostra','mostrar','exibe','exibir',
    'liste','lista','listar','ver','veja','vejo','olha','olhe','olhar',
    'traz','traga','trazer','passe','passa','passar',
    'encontre','encontra','encontrar','achar','ache','acha',
    'indica','indique','informa','informe','avisa','avise','diz','diga',
    'manda','mande','envia','envie','show','traga',
    'gostaria','adoraria','queria','gostariamos','gostariam',
    // qualificadores genéricos
    'novo','nova','novos','novas','velho','velha','velhos','velhas',
    'antigo','antiga','antigos','antigas','recente','recentes',
    'caro','cara','caros','caras','barato','barata','baratos','baratas',
    'bom','boa','bons','boas','otimo','otima','otimos','otimas',
    'bonito','bonita','bonitos','bonitas','grande','pequeno','pequena',
    'primeiro','primeira','ultimo','ultima','unico','unica',
    'melhor','melhores','pior','piores','maior','maiores','menor','menores',
    // termos genéricos de catálogo
    'produto','produtos','item','itens','modelo','modelos','tipo','tipos',
    'catalogo','colecao','colecoes','lista','listagem',
    'estoque','disponivel','disponiveis','indisponivel',
    'opcao','opcoes','peca','pecas','joia','joias',
    'bijuteria','bijuterias','acessorio','acessorios','comodato',
    // cortesia e gírias de chat
    'obrigado','obrigada','valeu','vlw','tmj','brigado','brigada',
    'favor','pfv','pf','ok','okay','combinado','entendido',
    'existem','existe','tenho','temos',
    'passe','mostre','mostra','liste','listar',
    'qdo','qto','qts','blz','blza','flw','dai','neh','soh',
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

  // translate() remove acentos sem precisar da extensão unaccent
  const tr = (col: string) =>
    `translate(LOWER(${col}), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn')`;

  const kwConditions = keywords.map((_, i) => `(
    ${tr('pd.descricao_jewel')} LIKE $${i + 1}
    OR ${tr('p.produto')} LIKE $${i + 1}
    OR ${tr('s.subtipo')} LIKE $${i + 1}
    OR ${tr('tp.tipo_pedra')} LIKE $${i + 1}
  )`).join(' AND ');
  const kwParams = keywords.map(k => `%${normalize(k)}%`);

  // default: mais recentes primeiro (ASC apenas quando o usuário pedir "antigo/primeiro")
  const orderBy = querCaro   ? 'pd.preco_cobrado DESC NULLS LAST'
                : querBarato ? 'pd.preco_cobrado ASC NULLS LAST'
                : querAntigo ? 'pd.data_entrada ASC NULLS LAST'
                :              'pd.data_entrada DESC NULLS LAST';

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         pd.data_entrada,
         p.produto, s.subtipo, tp.tipo_pedra, d.destino,
         COUNT(*) OVER () AS total_count
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE pd."statusProdutoId" IN (3, 6) AND ${kwConditions}
       ORDER BY CASE WHEN pd."statusProdutoId" = 3 THEN 0 ELSE 1 END, ${orderBy}
       LIMIT ${limit}`,
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
      total_count: string | null;
    }>;

    const total   = parseInt(rows[0]?.total_count ?? '0', 10);
    const qualifier = querAntigo ? 'mais antiga' : querNovo ? 'mais recente' : 'disponível';
    const header = total > rows.length
      ? `Encontrei **${rows.length}** de **${total}** peça(s) ${qualifier} (mostrando as mais recentes — refine para ver mais):`
      : `Encontrei ${rows.length} peça(s) ${qualifier}:`;
    const lines: string[] = [header];

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

async function searchByDestino(
  destinoTerm: string,
  somenteComodato: boolean,
  keywords: string[] = [],
  somenteVendido = false,
): Promise<string | null> {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const client = await pool.connect();
  try {
    const destRes = await client.query<{ destino: string }>(
      `SELECT DISTINCT d.destino FROM destinos d WHERE LOWER(d.destino) LIKE $1 ORDER BY d.destino LIMIT 5`,
      [`%${norm(destinoTerm)}%`],
    );

    if (destRes.rows.length === 0) {
      return null; // destino não encontrado → caller faz fallback para searchByCriteria
    }

    const destinos = destRes.rows.map(r => r.destino);
    const destino = destinos.sort((a, b) => a.length - b.length)[0];

    const statusFilter = somenteVendido  ? `pd."statusProdutoId" IN (2, 4, 13)`
                       : somenteComodato ? `pd."statusProdutoId" = 6`
                       :                  `pd."statusProdutoId" IN (3, 6)`;

    // Montar filtro de keywords de produto (opcional)
    const trD = (col: string) =>
      `translate(LOWER(${col}), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn')`;
    const normD = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    let kwClause = '';
    let params: string[] = [destino];
    if (keywords.length > 0) {
      const kwConds = keywords.map((_, i) => `(
        ${trD('pd.descricao_jewel')} LIKE $${i + 2}
        OR ${trD('p.produto')} LIKE $${i + 2}
        OR ${trD('s.subtipo')} LIKE $${i + 2}
        OR ${trD('tp.tipo_pedra')} LIKE $${i + 2}
      )`).join(' AND ');
      kwClause = ` AND ${kwConds}`;
      params = [destino, ...keywords.map(k => `%${normD(stemKw(k))}%`)];
    }

    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         p.produto, s.subtipo, tp.tipo_pedra
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE ${statusFilter} AND LOWER(d.destino) = LOWER($1)${kwClause}
       ORDER BY pd.referencia`,
      params,
    );

    if (result.rows.length === 0) {
      const label = somenteVendido ? 'vendida' : somenteComodato ? 'em comodato' : 'disponível';
      const kwLabel = keywords.length > 0 ? ` do tipo "${keywords.join(' ')}"` : '';
      return `Nenhuma peça${kwLabel} ${label} encontrada para **${capitalize(destino)}**.`;
    }

    const rows = result.rows as Array<{
      referencia: string; tipo: string; custo_real: number | null;
      preco_cobrado: number | null; preco_parceiro: number | null;
      preco_avista: number | null; preco_parcelado: number | null;
      descricao_jewel: string | null; status_id: number | null;
      produto: string | null; subtipo: string | null; tipo_pedra: string | null;
    }>;

    const label = somenteVendido ? 'vendida' : somenteComodato ? 'em comodato' : 'disponível';
    const kwLabel = keywords.length > 0 ? ` · filtro: ${keywords.join(' ')}` : '';
    const lines: string[] = [
      `📦 **${capitalize(destino)}** — ${rows.length} peça(s) ${label}${kwLabel}:`,
    ];

    for (const r of rows) {
      lines.push('');
      const desc = r.descricao_jewel
        ?? [r.produto, r.subtipo, r.tipo_pedra].filter(Boolean).join(' · ');
      lines.push(`**${r.referencia}** (${r.tipo})${desc ? ' — ' + desc : ''}`);
      lines.push(`Cobrado: ${fmt(r.preco_cobrado)} · Parceiro: ${fmt(r.preco_parceiro)} · À Vista: ${fmt(r.preco_avista)}`);
    }

    if (destinos.length > 1) {
      lines.push(``, `_(Outros destinos encontrados: ${destinos.slice(1).join(', ')})_`);
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

  type HistoryMsg = { role: 'user' | 'assistant'; text: string };
  const body = await req.json() as { message?: string; history?: HistoryMsg[] };
  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ reply: 'Mensagem vazia.' }, { status: 400 });
  }

  const history  = body.history ?? [];
  const lower    = message.toLowerCase();
  const normMsg  = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lowerNorm = normMsg(lower);

  // Follow-up: "só esse?", "tem mais?", "mais algum?", etc.
  // Re-executa a última busca do usuário com limite maior
  const isFollowUp = /^(so\s*(esse|essa|aquele|aquela|isso|um|uma|esses|essas)?|tem\s+mais|mais\s+algum|mais\s+alguma|e\s+so|so\s*tem|nao\s+tem\s+mais|mais\s+nenhum|somente\s+(esse|essa|um|uma)|apenas\s+(um|uma|esse|essa))[?!\s.]*$/.test(lowerNorm);
  if (isFollowUp && history.length > 0) {
    const prevUserMsg = [...history].reverse().find(m => m.role === 'user');
    if (prevUserMsg) {
      try {
        const reply = await searchByCriteria(prevUserMsg.text.toLowerCase(), 20);
        const count = (reply.match(/^Encontrei (\d+)/)?.[1] ?? '0');
        const prefix = count === '1' ? '☝️ Sim, há apenas **1** peça disponível com esse critério:\n\n' : '';
        return NextResponse.json({ reply: prefix + reply });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
      }
    }
  }

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

  // Carros chefe — singular, plural, abreviação, qualquer variação
  if (/carros?\s*chefes?|\bcc\b/.test(lower)) {
    try {
      // Tenta destino check primeiro; retorna null se não achar destino no banco
      const reply = await checkDestinoCCCoverage(lower);
      if (reply !== null) return NextResponse.json({ reply });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
    }
    // Sem destino reconhecido → busca/lista nos CC_DEFAULTS
    return NextResponse.json({ reply: answerCarrosChefe(lower) });
  }

  // Busca por destino: "anel solitário em comodato com o brilho vintage" / "colar vendido pelo X"
  if (/comodato|peças?\s+(no|na|em|do|da|com\s+o|com\s+a)\b|\bcom\s+[oa]\b|\bpel[oa]s?\b|\bpor\b/.test(lower)) {
    const somenteComodato = /comodato/.test(lower);
    const somenteVendido  = /\bvend[ie]d[ao]\b/.test(lower);

    // Extrair destino: preposição + nome do destino
    const destMatch = lower.match(/\b(?:com\s+(?:o|a)|no|na|do|da|para\s+(?:o|a)|pelo|pela|pelos|pelas|por)\s+([a-záàâãéèêíìîóòôõúùûç][a-záàâãéèêíìîóòôõúùûç\s]+?)(?:\s*[?!.,])*$/i);
    const destinoTerm = destMatch ? destMatch[1].trim() : '';

    // Keywords de produto: o que sobrar após remover comodato, destino e palavras de contexto
    const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const kwStopwords = new Set([
      // artigos, preposições, contrações
      'o','a','os','as','um','uma','de','do','da','dos','das',
      'em','no','na','nos','nas','por','pelo','pela','pelos','pelas',
      'para','pra','pro','pros','pras','com','sem','ao','ate',
      // pronomes
      'eu','me','te','se','vc','vcs','voce','voces',
      'meu','minha','seu','sua','nosso','nossa',
      'esse','essa','esses','essas','este','esta','estes','estas','isso','isto',
      'algum','alguma','todo','toda','todos','todas','tudo','cada','qual','quais',
      // conjunções, advérbios
      'e','ou','que','pois','mas','nem','se','tambem','tb','tbm',
      'so','apenas','somente','ainda','ja','mais','menos','muito','pouco',
      'onde','como','quando','ta','ne','ai','la','aqui',
      // verbos ser/estar/ter/haver
      'sou','somos','sao','era','eram','fui','foi','fomos','foram','seja','sejam',
      'estou','esta','estamos','estao','estava','estavam','esteve','esteja',
      'tenho','tem','temos','tinha','tinham','tive','teve','ha','havia','houve',
      // verbos modais e de ação
      'quero','quer','queremos','querem','queria','queriam',
      'preciso','precisa','precisamos','precisam',
      'posso','pode','podemos','podem',
      'vou','vai','vamos','vao',
      // verbos de busca e comando
      'ver','veja','vejo','olha','olhe','traz','traga',
      'passe','passa','mostre','mostra','liste','lista',
      'busca','busque','procura','procure','encontra','encontre',
      'gostaria','adoraria','queria',
      // termos genéricos de catálogo
      'comodato','pecas','peca','produto','produtos','item','itens',
      'tipo','tipos','modelo','modelos','joia','joias',
      // status (status é filtro, não keyword de produto)
      'disponivel','disponiveis','vendido','vendida','vendidos','vendidas',
      // gírias
      'ne','ta','ai','la','pq','porq',
    ]);
    const productPart = lower
      .replace(destMatch ? destMatch[0] : '', '')
      .replace(/comodato|peças?|tudo\s+que\s+(está|esta|tem)|vend[ie]d[ao]s?/g, ' ')
      .replace(/[?!.,]/g, ' ');
    const keywords = productPart
      .split(/\s+/)
      .filter(w => w.length > 2 && !kwStopwords.has(normalize(w)));

    if (destinoTerm.length >= 3) {
      try {
        const reply = await searchByDestino(destinoTerm, somenteComodato, keywords, somenteVendido);
        if (reply !== null) return NextResponse.json({ reply });
        // destino não encontrado no banco → busca pelas keywords de produto sem o nome do destino
        if (keywords.length > 0) {
          const fallback = await searchByCriteria(keywords.join(' '));
          return NextResponse.json({ reply: fallback });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
      }
    }
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
