'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const jmDashboardSchema = z.object({
  resumo: z.object({
    estoque: z.number().default(0),
    em_fabricacao: z.number().default(0),
    vendidos_mes: z.number().default(0),
    ticket_medio: z.number().default(0),
    faturamento_mes: z.number().default(0),
  }),
  listaEstoque: z.array(z.any()).default([]),
  emFabricacao: z.array(z.any()).default([]),
  listaFaturamento: z.array(z.any()).default([]),
});

export type JmDashboardFeed = z.infer<typeof jmDashboardSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchJmDashboardAction(): Promise<ResponseApi<JmDashboardFeed>> {
  try {
    const [resumo, listaEstoque, emFabricacao, listaFaturamento] = await Promise.all([
      fetch(`${API_BASE}/jm/resumo`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/jm/lista-estoque`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/jm/em-fabricacao`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/jm/lista-faturamento`, { credentials: 'include' }).then(r => r.json()),
    ]);

    const dataPayload = {
      resumo,
      listaEstoque,
      emFabricacao,
      listaFaturamento,
    };

    const parsed = jmDashboardSchema.safeParse(dataPayload);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato de resposta do dashboard JM inválido', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao carregar dashboard JM' };
  }
}
