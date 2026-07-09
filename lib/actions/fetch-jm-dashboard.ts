import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const coerceNum = () => z.coerce.number().default(0);

const jmResumoSchema = z.object({
  total_jm: coerceNum(),
  em_fabricacao: coerceNum(),
  estoque: coerceNum(),
  vendidos: coerceNum(),
  ticket_medio: coerceNum(),
  faturamento_mes: coerceNum(),
  vendidos_mes: coerceNum(),
});

const jmPecaSchema = z.object({
  referencia: z.string().default(''),
  tipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino_manutencao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  data_envio_fabricacao: z.string().nullable().optional(),
  data_saida_manutencao: z.string().nullable().optional(),
  peso: coerceNum(),
  custo_real: coerceNum(),
  dias: coerceNum(),
  preco_cobrado: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  diamantes: z.string().nullable().optional(),
  cts_diamantes: z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
  pedra_colorida: z.string().nullable().optional(),
  cts_pedra_colorida: z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
});

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
  diamantes: z.string().nullable().optional(),
  cts_diamantes: z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
  pedra_colorida: z.string().nullable().optional(),
  cts_pedra_colorida: z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
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

async function safeFetchArr(url: string): Promise<unknown[]> {
  try {
    const r = await authFetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function safeFetchObj(url: string): Promise<Record<string, unknown>> {
  try {
    const r = await authFetch(url);
    if (!r.ok) return {};
    const data = await r.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export async function fetchJmDashboardAction(): Promise<ResponseApi<JmDashboardFeed>> {
  try {
    const [resumo, listaEstoque, emFabricacao, listaFaturamento] = await Promise.all([
      safeFetchObj(`${API_BASE}/jm/resumo`),
      safeFetchArr(`${API_BASE}/jm/lista-estoque`),
      safeFetchArr(`${API_BASE}/jm/em-fabricacao`),
      safeFetchArr(`${API_BASE}/jm/lista-faturamento`),
    ]);

    const parsed = jmDashboardSchema.safeParse({
      resumo,
      listaEstoque,
      emFabricacao,
      listaFaturamento,
    });

    if (!parsed.success) {
      return {
        httpStatus: 400,
        message: `Formato de resposta JM inválido: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        errors: parsed.error,
      };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dashboard JM';
    return { httpStatus: 500, message: msg };
  }
}
