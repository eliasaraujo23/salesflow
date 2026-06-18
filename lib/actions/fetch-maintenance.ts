'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const maintenanceItemSchema = z.object({
  referencia: z.string(),
  tipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  data_saida_manutencao: z.string().nullable().optional(),
  dias: z.number().default(0),
  preco_minimo: z.union([z.number(), z.string()]).nullable().optional(),
  preco_loja: z.union([z.number(), z.string()]).nullable().optional(),
});

export type MaintenanceItem = z.infer<typeof maintenanceItemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchMaintenanceAction(): Promise<ResponseApi<MaintenanceItem[]>> {
  try {
    const res = await fetch(`${API_BASE}/manutencao`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(maintenanceItemSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de manutenção inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao obter manutenções' };
  }
}
