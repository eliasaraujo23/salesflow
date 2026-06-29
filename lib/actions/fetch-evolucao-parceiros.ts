import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const itemSchema = z.object({
  mes:         z.string(),
  destino:     z.string(),
  faturamento: z.coerce.number().default(0),
  quantidade:  z.coerce.number().default(0),
});

export type EvolucaoParceiroItem = z.infer<typeof itemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchEvolucaoParceiroAction(
  meses = 6,
): Promise<ResponseApi<EvolucaoParceiroItem[]>> {
  try {
    const r = await authFetch(`${API_BASE}/evolucao-parceiros?meses=${meses}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(itemSchema).safeParse(raw);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato inválido de evolucao-parceiros' };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (e) {
    return { httpStatus: 500, message: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
