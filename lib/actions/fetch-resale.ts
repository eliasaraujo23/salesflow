'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const resellItemSchema = z.object({
  fornecedor: z.string(),
  qtd: z.number().default(0),
  total_custo: z.number().default(0),
  total_loja: z.number().default(0),
});

export type ResellItem = z.infer<typeof resellItemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchResaleAction(from: string, to: string): Promise<ResponseApi<ResellItem[]>> {
  try {
    const res = await fetch(`${API_BASE}/revenda?from=${from}&to=${to}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(resellItemSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de revenda inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao carregar dados de revenda' };
  }
}
