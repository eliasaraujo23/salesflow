import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const coerceNum = () => z.coerce.number().default(0);

const jcResumoSchema = z.object({
  total_jc:       coerceNum(),
  estoque:        coerceNum(),
  vendidos:       coerceNum(),
  vendidos_mes:   coerceNum(),
  ticket_medio:   coerceNum(),
  faturamento_mes: coerceNum(),
});

const jcPecaSchema = z.object({
  referencia:         z.string().default(''),
  tipo:               z.string().nullable().optional(),
  produto:            z.string().nullable().optional(),
  subtipo:            z.string().nullable().optional(),
  tipo_pedra:         z.string().nullable().optional(),
  lapidacao:          z.string().nullable().optional(),
  destino:            z.string().nullable().optional(),
  fabricante:         z.string().nullable().optional(),
  certificada:        z.string().nullable().optional(),
  numero_certificado: z.string().nullable().optional(),
  peso:               coerceNum(),
  custo_real:         coerceNum(),
  preco_cobrado:      z.coerce.number().nullable().optional(),
  diamantes:          z.string().nullable().optional(),
  cts_diamantes:      z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
  pedra_colorida:     z.string().nullable().optional(),
  cts_pedra_colorida: z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
});

const jcDashboardSchema = z.object({
  resumo:       jcResumoSchema,
  listaEstoque: z.array(jcPecaSchema).default([]),
});

export type JcDashboardFeed = z.infer<typeof jcDashboardSchema>;
export type JcPeca = z.infer<typeof jcPecaSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

async function safeFetch(url: string) {
  const r = await authFetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchJcDashboardAction(): Promise<ResponseApi<JcDashboardFeed>> {
  try {
    const [resumoRaw, estoqueRaw] = await Promise.all([
      safeFetch(`${API_BASE}/jc/resumo`),
      safeFetch(`${API_BASE}/jc/lista-estoque`),
    ]);

    const parsed = jcDashboardSchema.safeParse({
      resumo:       resumoRaw,
      listaEstoque: estoqueRaw,
    });

    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato inválido de dados JC', errors: parsed.error };
    }

    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dados JC';
    return { httpStatus: 500, message: msg };
  }
}
