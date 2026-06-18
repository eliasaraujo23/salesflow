import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const coerceNum = () => z.coerce.number().default(0);

const jmResumoSchema = z.object({
  estoque: coerceNum(),
  em_fabricacao: coerceNum(),
  vendidos_mes: coerceNum(),
  ticket_medio: coerceNum(),
  faturamento_mes: coerceNum(),
});

const jmEstoqueItemSchema = z.object({
  subtipo: z.string().default(''),
  produto: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  estoque: coerceNum(),
  em_fabricacao: coerceNum(),
  vendidos_total: coerceNum().optional(),
  vendidos: coerceNum().optional(),
  vendidos_90d: coerceNum(),
  ticket_medio: z.coerce.number().nullable().optional(),
}).transform((r) => ({
  subtipo: r.subtipo,
  produto: r.produto ?? null,
  tipo_pedra: r.tipo_pedra ?? null,
  lapidacao: r.lapidacao ?? null,
  estoque: r.estoque,
  em_fabricacao: r.em_fabricacao,
  vendidos: r.vendidos ?? r.vendidos_total ?? 0,
  vendidos_90d: r.vendidos_90d,
  ticket_medio: r.ticket_medio ?? null,
}));

const jmFabricacaoItemSchema = z.object({
  referencia: z.string().default(''),
  subtipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  dias: coerceNum(),
  responsavel: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

const jmFaturamentoItemSchema = z.object({
  referencia: z.string().default(''),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  preco_loja: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  vendedor: z.string().nullable().optional(),
});

const jmDashboardSchema = z.object({
  resumo: jmResumoSchema,
  listaEstoque: z.array(jmEstoqueItemSchema).default([]),
  emFabricacao: z.array(jmFabricacaoItemSchema).default([]),
  listaFaturamento: z.array(jmFaturamentoItemSchema).default([]),
});

export type JmDashboardFeed = z.infer<typeof jmDashboardSchema>;
export type JmEstoqueItem = JmDashboardFeed['listaEstoque'][number];
export type JmFabricacaoItem = JmDashboardFeed['emFabricacao'][number];
export type JmFaturamentoItem = JmDashboardFeed['listaFaturamento'][number];

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
