import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const rawRevendaSchema = z.object({
  referencia: z.string().default(''),
  tipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  peso: z.coerce.number().default(0),
  custo_real: z.coerce.number().default(0),
  preco_cobrado: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  nf_joia: z.string().nullable().optional(),
  vendedor_interno: z.string().nullable().optional(),
  status_id: z.coerce.number().nullable().optional(),
});

type RawRevenda = z.infer<typeof rawRevendaSchema>;

export interface AgItem {
  name: string;
  qtd: number;
  faturamento: number;
  custo: number;
}

export interface DonutItem {
  name: string;
  faturamento: number;
  color: string;
}

export interface UltimaVenda {
  referencia: string;
  produto: string;
  destino: string;
  preco: number;
}

export interface ResaleData {
  faturamento: number;
  custo: number;
  qtd: number;
  scrapFat: number;
  scrapCusto: number;
  scrapQtd: number;
  byDestino: AgItem[];
  byProduto: AgItem[];
  scrapByDestino: AgItem[];
  canalVenda: DonutItem[];
  byTipo: DonutItem[];
  byVendedor: AgItem[];
  ultimasVendas: UltimaVenda[];
}

// Legacy type kept for backward compat
export interface ResellItem {
  fornecedor: string;
  qtd: number;
  total_custo: number;
  total_loja: number;
}

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

function agg(rows: RawRevenda[], keyFn: (r: RawRevenda) => string | null | undefined): AgItem[] {
  const map = new Map<string, AgItem>();
  for (const r of rows) {
    const key = keyFn(r) || '(Em branco)';
    const fat = r.preco_cobrado ?? 0;
    const e = map.get(key);
    if (e) {
      e.qtd++;
      e.faturamento += fat;
      e.custo += r.custo_real;
    } else {
      map.set(key, { name: key, qtd: 1, faturamento: fat, custo: r.custo_real });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento);
}

const isScrap = (r: RawRevenda) => r.nf_joia?.toUpperCase() === 'SCRAP';

const canalOf = (destino: string | null | undefined): string => {
  if (!destino) return 'Parceiros';
  const d = destino.toUpperCase();
  if (d === 'ETERNNO') return 'Eternno';
  if (d.includes('LEILÃO') || d.includes('LEILAO')) return 'Leilão';
  return 'Parceiros';
};

const CANAL_COLORS: Record<string, string> = {
  Eternno: '#6366f1',
  Parceiros: '#f59e0b',
  Leilão: '#8b5cf6',
};

const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1',
  JMF: '#f59e0b',
  JR: '#10b981',
  JM: '#8b5cf6',
  JRCP: '#06b6d4',
  JMCP: '#f97316',
};

function buildResaleData(rows: RawRevenda[]): ResaleData {
  const main = rows.filter(r => !isScrap(r));
  const scrap = rows.filter(r => isScrap(r));

  const mainFat = main.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);
  const mainCusto = main.reduce((s, r) => s + r.custo_real, 0);
  const scrapFat = scrap.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);
  const scrapCusto = scrap.reduce((s, r) => s + r.custo_real, 0);

  // Canal de Venda
  const canalMap = new Map<string, number>();
  for (const r of main) {
    const c = canalOf(r.destino);
    canalMap.set(c, (canalMap.get(c) ?? 0) + (r.preco_cobrado ?? 0));
  }
  const canalVenda: DonutItem[] = Array.from(canalMap.entries())
    .map(([name, faturamento]) => ({ name, faturamento, color: CANAL_COLORS[name] ?? '#71717a' }))
    .sort((a, b) => b.faturamento - a.faturamento);

  // Tipo de Fabricação (all rows)
  const tipoMap = new Map<string, number>();
  for (const r of rows) {
    const t = r.tipo || '(Em branco)';
    tipoMap.set(t, (tipoMap.get(t) ?? 0) + (r.preco_cobrado ?? 0));
  }
  const byTipo: DonutItem[] = Array.from(tipoMap.entries())
    .filter(([, v]) => v > 0)
    .map(([name, faturamento]) => ({ name, faturamento, color: TIPO_COLORS[name] ?? '#71717a' }))
    .sort((a, b) => b.faturamento - a.faturamento);

  // Vendedor Interno — Eternno items only
  const eternnoRows = main.filter(r => r.destino?.toUpperCase() === 'ETERNNO');
  const byVendedor = agg(eternnoRows, r => r.vendedor_interno);

  // Últimas vendas
  const ultimasVendas: UltimaVenda[] = [...rows]
    .filter(r => r.data_venda)
    .sort((a, b) => ((b.data_venda ?? '') < (a.data_venda ?? '') ? -1 : 1))
    .slice(0, 12)
    .map(r => ({
      referencia: r.referencia,
      produto: r.produto ?? r.subtipo ?? '—',
      destino: r.destino ?? '—',
      preco: r.preco_cobrado ?? 0,
    }));

  return {
    faturamento: mainFat,
    custo: mainCusto,
    qtd: main.length,
    scrapFat,
    scrapCusto,
    scrapQtd: scrap.length,
    byDestino: agg(main, r => r.destino),
    byProduto: agg(main, r => r.produto ?? r.subtipo),
    scrapByDestino: agg(scrap, r => r.destino),
    canalVenda,
    byTipo,
    byVendedor,
    ultimasVendas,
  };
}

export async function fetchResaleAction(from: string, to: string): Promise<ResponseApi<ResaleData>> {
  try {
    const res = await authFetch(`${API_BASE}/revenda?from=${from}&to=${to}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(rawRevendaSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de revenda inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: buildResaleData(parsed.data) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dados de revenda';
    return { httpStatus: 500, message: msg };
  }
}
