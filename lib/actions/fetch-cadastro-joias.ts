import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const cadastroJoiaSchema = z.object({
  referencia:          z.coerce.string().default(''),
  tipo:                z.string().nullable().optional(),
  produto:             z.string().nullable().optional(),
  subtipo:             z.string().nullable().optional(),
  tipo_pedra:          z.string().nullable().optional(),
  lapidacao:           z.string().nullable().optional(),
  peso:                z.coerce.number().default(0),
  custo_real:          z.coerce.number().default(0),
  data_entrada:        z.string().nullable().optional(),
}).passthrough();

export type CadastroJoia = z.infer<typeof cadastroJoiaSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchCadastroJoiasAction(from: string, to: string): Promise<ResponseApi<CadastroJoia[]>> {
  try {
    const r = await authFetch(`${API_BASE}/product-details-cadastradas?from=${from}&to=${to}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(cadastroJoiaSchema).safeParse(raw);
    if (!parsed.success) {
      console.error('[cadastradas] Zod error:', JSON.stringify(parsed.error.issues.slice(0, 5)));
      return { httpStatus: 400, message: 'Formato inválido de product-details', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar cadastro de joias';
    return { httpStatus: 500, message: msg };
  }
}
