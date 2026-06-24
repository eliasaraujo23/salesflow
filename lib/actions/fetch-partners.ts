import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const partnerSalesSchema = z.object({
  destino: z.string(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  total_vendas: z.coerce.number().default(0),
  ticket_medio: z.coerce.number().nullable().optional(),
  total_faturado: z.coerce.number().default(0),
});

const comodatoItemSchema = z.object({
  referencia: z.string().default(''),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  data_saida: z.string().nullable().optional(),
  dias_campo: z.coerce.number().default(0),
  custo_real: z.coerce.number().default(0),
  preco_minimo: z.coerce.number().nullable().optional(),
  preco_loja: z.coerce.number().default(0),
});

export type PartnerSales = z.infer<typeof partnerSalesSchema>;
export type PartnerConsignment = z.infer<typeof comodatoItemSchema>;

const jmStockItemSchema = z.object({
  referencia: z.string().default(''),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  dias: z.coerce.number().default(0),
  custo_real: z.coerce.number().default(0),
  preco_cobrado: z.coerce.number().nullable().optional(),
});

export type JmStockItem = z.infer<typeof jmStockItemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchPartnerSalesAction(): Promise<ResponseApi<PartnerSales[]>> {
  try {
    const res = await authFetch(`${API_BASE}/vendas-parceiro`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(partnerSalesSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de vendas de parceiros inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao obter vendas de parceiros' };
  }
}

export async function fetchJmStockAction(): Promise<ResponseApi<JmStockItem[]>> {
  try {
    const res = await authFetch(`${API_BASE}/jm/lista-estoque`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const arr = Array.isArray(rawData) ? rawData : [];
    const parsed = z.array(jmStockItemSchema).safeParse(arr);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados JM inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao obter estoque JM' };
  }
}

export async function fetchPartnerConsignmentsAction(): Promise<ResponseApi<PartnerConsignment[]>> {
  try {
    const res = await authFetch(`${API_BASE}/comodato`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(comodatoItemSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de comodato inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao obter dados de comodato' };
  }
}
