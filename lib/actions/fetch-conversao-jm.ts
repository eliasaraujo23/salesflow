import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const conversaoJmRowSchema = z.object({
  referencia:     z.string().default(''),
  produto:        z.string().nullable().optional(),
  subtipo:        z.string().nullable().optional(),
  fabricante:     z.string().nullable().optional(),
  custo_real:     z.coerce.number().default(0),
  data_entrada:   z.string().nullable().optional(),
  preco_cobrado:  z.coerce.number().nullable().optional(),
  data_venda:     z.string().nullable().optional(),
  dias_vida:      z.coerce.number().nullable().optional(),
});

export type ConversaoJmRow = z.infer<typeof conversaoJmRowSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchConversaoJm(from: string, to: string): Promise<ResponseApi<ConversaoJmRow[]>> {
  try {
    const r = await authFetch(`${API_BASE}/conversao-jm?from=${from}&to=${to}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(conversaoJmRowSchema).safeParse(raw);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato inválido de conversao-jm', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar conversão JM';
    return { httpStatus: 500, message: msg };
  }
}
