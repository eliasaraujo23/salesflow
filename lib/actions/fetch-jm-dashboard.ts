import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const coerceNum = () => z.coerce.number().default(0);

// Resumo returned by /jm/resumo
const jmResumoSchema = z.object({
  total_jm: coerceNum(),
  em_fabricacao: coerceNum(),
  estoque: coerceNum(),
  vendidos: coerceNum(),
  ticket_medio: coerceNum(),
  faturamento_mes: coerceNum(),
  vendidos_mes: coerceNum(),
});

// Individual piece schema (used by lista-estoque and em-fabricacao)
const jmPecaSchema = z.object({
  referencia: z.string().default(''),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  peso: coerceNum(),
  custo_real: coerceNum(),
  preco_cobrado: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  diamantes: z.string().nullable().optional(),
  cts_diamantes: z.coerce.number().nullable().optional(),
  pedra_colorida: z.string().nullable().optional(),
  cts_pedra_colorida: z.coerce.number().nullable().optional(),
});

// Faturamento piece schema (sold pieces — has nf_joia, status_id)
const jmFaturamentoSchema = z.object({
  referencia: z.string().default(''),
  tipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  peso: coerceNum(),
  custo_real: coerceNum(),
  preco_cobrado: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  nf_joia: z.string().nullable().optional(),
  vendedor_interno: z.string().nullable().optional(),
  status_id: z.coerce.number().nullable().optional(),
});

const jmDashboardSchema = z.object({
  resumo: jmResumoSchema,
  listaEstoque: z.array(jmPecaSchema).default([]),
  emFabricacao: z.array(jmPecaSchema).default([]),
  listaFaturamento: z.array(jmFaturamentoSchema).default([]),
});

export type JmDashboardFeed = z.infer<typeof jmDashboardSchema>;
export type JmPeca = z.infer<typeof jmPecaSchema>;
export type JmFaturamentoItem = z.infer<typeof jmFaturamentoSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

async function safeFetch(url: string): Promise<unknown> {
  try {
    const r = await authFetch(url);
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

export async function fetchJmDashboardAction(): Promise<ResponseApi<JmDashboardFeed>> {
  try {
    const [resumo, listaEstoque, emFabricacao, listaFaturamento] = await Promise.all([
      safeFetch(`${API_BASE}/jm/resumo`),
      safeFetch(`${API_BASE}/jm/lista-estoque`),
      safeFetch(`${API_BASE}/jm/em-fabricacao`),
      safeFetch(`${API_BASE}/jm/lista-faturamento`),
    ]);

    const parsed = jmDashboardSchema.safeParse({
      resumo,
      listaEstoque,
      emFabricacao,
      listaFaturamento,
    });

    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato de resposta do dashboard JM inválido', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dashboard JM';
    return { httpStatus: 500, message: msg };
  }
}
