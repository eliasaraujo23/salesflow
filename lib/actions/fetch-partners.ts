'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const partnerSalesSchema = z.object({
  parceiro: z.string(),
  qtd_pecas: z.number(),
  total_vendas: z.number(),
});

const partnerConsignmentSchema = z.object({
  parceiro: z.string(),
  total_pecas: z.number(),
  total_peso: z.number(),
  total_custo: z.number(),
  total_loja: z.number(),
});

export type PartnerSales = z.infer<typeof partnerSalesSchema>;
export type PartnerConsignment = z.infer<typeof partnerConsignmentSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchPartnerSalesAction(): Promise<ResponseApi<PartnerSales[]>> {
  try {
    const res = await fetch(`${API_BASE}/vendas-parceiro`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(partnerSalesSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de vendas de parceiros inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao obter vendas de parceiros' };
  }
}

export async function fetchPartnerConsignmentsAction(): Promise<ResponseApi<PartnerConsignment[]>> {
  try {
    const res = await fetch(`${API_BASE}/comodato`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(partnerConsignmentSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de comodato inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao obter dados de comodato' };
  }
}
