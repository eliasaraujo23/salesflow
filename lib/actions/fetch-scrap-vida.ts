import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const scrapVidaRowSchema = z.object({
  referencia:    z.string().default(''),
  tipo:          z.string().nullable().optional(),
  produto:       z.string().nullable().optional(),
  destino:       z.string().nullable().optional(),
  data_entrada:  z.string().nullable().optional(),
  data_venda:    z.string().nullable().optional(),
  dias_vida:     z.coerce.number().nullable().optional(),
  custo_real:    z.coerce.number().default(0),
  preco_cobrado: z.coerce.number().default(0),
});

export type ScrapVidaRow = z.infer<typeof scrapVidaRowSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchScrapVidaAction(from: string, to: string): Promise<ResponseApi<ScrapVidaRow[]>> {
  try {
    const r = await authFetch(`${API_BASE}/scrap-vida?from=${from}&to=${to}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(scrapVidaRowSchema).safeParse(raw);
    if (!parsed.success) return { httpStatus: 400, message: 'Dados inválidos' };
    return { httpStatus: 200, data: parsed.data };
  } catch (err) {
    return { httpStatus: 500, message: err instanceof Error ? err.message : 'Erro' };
  }
}
