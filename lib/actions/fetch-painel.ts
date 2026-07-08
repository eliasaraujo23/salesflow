import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

export const painelRowSchema = z.object({
  referencia: z.string().default(''),
  tipo: z.string().nullable().optional(),
  produto: z.string().nullable().optional(),
  subtipo: z.string().nullable().optional(),
  tipo_pedra: z.string().nullable().optional(),
  lapidacao: z.string().nullable().optional(),
  destino: z.string().nullable().optional(),
  peso: z.coerce.number().default(0),
  custo_real: z.coerce.number().default(0),
  preco_cobrado: z.coerce.number().nullable().optional(),
  data_venda: z.string().nullable().optional(),
  nf_joia: z.string().nullable().optional(),
  vendedor_interno: z.string().nullable().optional(),
  status_id: z.coerce.number().nullable().optional(),
});

export type PainelRow = z.infer<typeof painelRowSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchPainelRows(from: string, to: string): Promise<ResponseApi<PainelRow[]>> {
  try {
    const r = await authFetch(`${API_BASE}/revenda?from=${from}&to=${to}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(painelRowSchema).safeParse(raw);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar dados';
    return { httpStatus: 500, message: msg };
  }
}
