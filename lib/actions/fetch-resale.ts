import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const rawRevenda = z.object({
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

// Aggregated type used by the UI table
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

function aggregate(rows: z.infer<typeof rawRevenda>[]): ResellItem[] {
  const map = new Map<string, ResellItem>();
  for (const r of rows) {
    const key = r.destino ?? 'Sem destino';
    const existing = map.get(key);
    if (existing) {
      existing.qtd += 1;
      existing.total_custo += r.custo_real;
      existing.total_loja += r.preco_cobrado ?? 0;
    } else {
      map.set(key, {
        fornecedor: key,
        qtd: 1,
        total_custo: r.custo_real,
        total_loja: r.preco_cobrado ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_loja - a.total_loja);
}

export async function fetchResaleAction(from: string, to: string): Promise<ResponseApi<ResellItem[]>> {
  try {
    const res = await authFetch(`${API_BASE}/revenda?from=${from}&to=${to}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(rawRevenda).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de revenda inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: aggregate(parsed.data) };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dados de revenda';
    return { httpStatus: 500, message: msg };
  }
}
