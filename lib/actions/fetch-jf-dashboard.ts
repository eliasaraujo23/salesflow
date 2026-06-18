import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const coerceNum = () => z.coerce.number().default(0);

const resumoSchema = z.object({
  estoque: coerceNum(),
  em_fabricacao: coerceNum(),
  vendidos: coerceNum(),
  vendidos_mes: coerceNum(),
  ticket_medio: coerceNum(),
  faturamento_mes: coerceNum(),
});

const alertaSchema = z.object({
  subtipo: z.string(),
  estoque: coerceNum(),
  vendidos_90d: coerceNum(),
  em_fabricacao: coerceNum(),
  status_alerta: z.enum(['RUPTURA', 'CRITICO', 'ATENCAO']),
});

const emFabricacaoSchema = z.object({
  referencia: z.string(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  dias: coerceNum(),
});

const categoriaRowSchema = z.object({
  subtipo: z.string(),
  produto: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  estoque: coerceNum(),
  em_fabricacao: coerceNum(),
  vendidos_total: z.coerce.number().optional(),
  vendidos: z.coerce.number().optional(),
  vendidos_90d: coerceNum(),
  ticket_medio: z.coerce.number().nullable().optional(),
}).transform(r => ({
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

const vendasMesSchema = z.object({
  mes: z.string(),
  qtd: coerceNum(),
  total: coerceNum(),
});

const vendasPedraSchema = z.object({
  tipo_pedra: z.string(),
  qtd: coerceNum(),
  ticket_medio: coerceNum(),
});

const jfDashboardSchema = z.object({
  resumo: resumoSchema,
  alertas: z.array(alertaSchema).default([]),
  emFabricacao: z.array(emFabricacaoSchema).default([]),
  estoqueCategoria: z.array(categoriaRowSchema).default([]),
  vendasMes: z.array(vendasMesSchema).default([]),
  vendasPedra: z.array(vendasPedraSchema).default([]),
});

export type JfDashboardFeed = z.infer<typeof jfDashboardSchema>;
export type CategoriaRow = JfDashboardFeed['estoqueCategoria'][number];

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchJfDashboardAction(): Promise<ResponseApi<JfDashboardFeed>> {
  try {
    const [resumo, alertas, fabricacao, categorias, vendasMes, vendasPedra] = await Promise.all([
      authFetch(`${API_BASE}/resumo`).then(r => r.json()),
      authFetch(`${API_BASE}/alertas`).then(r => r.json()),
      authFetch(`${API_BASE}/em-fabricacao`).then(r => r.json()),
      authFetch(`${API_BASE}/estoque-categoria`).then(r => r.json()),
      authFetch(`${API_BASE}/vendas-mes`).then(r => r.json()),
      authFetch(`${API_BASE}/vendas-pedra`).then(r => r.json()),
    ]);

    const parsed = jfDashboardSchema.safeParse({
      resumo,
      alertas,
      emFabricacao: fabricacao,
      estoqueCategoria: categorias,
      vendasMes,
      vendasPedra,
    });

    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato de resposta do dashboard JF inválido', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dashboard JF';
    return { httpStatus: 500, message: msg };
  }
}
