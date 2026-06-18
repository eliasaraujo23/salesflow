'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const jfDashboardSchema = z.object({
  resumo: z.object({
    estoque: z.number().default(0),
    em_fabricacao: z.number().default(0),
    vendidos: z.number().default(0),
    vendidos_mes: z.number().default(0),
    ticket_medio: z.number().default(0),
    faturamento_mes: z.number().default(0),
  }),
  alertas: z.array(z.object({
    subtipo: z.string(),
    estoque: z.number(),
    vendidos_90d: z.number(),
    em_fabricacao: z.number().default(0),
    status_alerta: z.enum(['RUPTURA', 'CRITICO', 'ATENCAO']),
  })).default([]),
  emFabricacao: z.array(z.object({
    referencia: z.string(),
    subtipo: z.string().nullable().optional(),
    tipo_pedra: z.string().nullable().optional(),
    dias: z.number(),
  })).default([]),
  estoqueSubtipo: z.array(z.object({
    subtipo: z.string(),
    estoque: z.number(),
    em_fabricacao: z.number().default(0),
    vendidos: z.number().default(0),
    ticket_medio: z.number().nullable().optional(),
  })).default([]),
  vendasMes: z.array(z.object({
    mes: z.string(),
    qtd: z.number(),
    total: z.number(),
  })).default([]),
  vendasPedra: z.array(z.object({
    tipo_pedra: z.string(),
    qtd: z.number(),
    ticket_medio: z.number().default(0),
  })).default([]),
  estoqueCategoria: z.array(z.object({
    categoria: z.string(),
    estoque: z.number(),
    em_fabricacao: z.number().default(0),
    vendidos: z.number().default(0),
    ticket_medio: z.number().nullable().optional(),
  })).default([]),
});

export type JfDashboardFeed = z.infer<typeof jfDashboardSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchJfDashboardAction(): Promise<ResponseApi<JfDashboardFeed>> {
  try {
    const [resumo, alertas, fabricacao, subtipo, vendasMes, vendasPedra, categorias] = await Promise.all([
      fetch(`${API_BASE}/resumo`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/alertas`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/em-fabricacao`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/estoque-subtipo`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/vendas-mes`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/vendas-pedra`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/estoque-categoria`, { credentials: 'include' }).then(r => r.json()),
    ]);

    const dataPayload = {
      resumo,
      alertas,
      emFabricacao: fabricacao,
      estoqueSubtipo: subtipo,
      vendasMes,
      vendasPedra,
      estoqueCategoria: categorias,
    };

    const parsed = jfDashboardSchema.safeParse(dataPayload);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato de resposta do dashboard JF inválido', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao carregar dashboard JF' };
  }
}
