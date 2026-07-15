import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const rowSchema = z.object({
  mes:   z.string(),
  loja:  z.string(),
  count: z.coerce.number(),
});

const responseSchema = z.object({
  cadastradas: z.array(rowSchema),
  vendidas:    z.array(rowSchema),
});

export type EvolucaoJoiasRow = z.infer<typeof rowSchema>;
export type EvolucaoJoiasData = z.infer<typeof responseSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchEvolucaoJoiasAction(from: string, to: string): Promise<ResponseApi<EvolucaoJoiasData>> {
  try {
    const r = await authFetch(`${API_BASE}/evolucao-joias?from=${from}&to=${to}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) return { httpStatus: 400, message: 'Dados inválidos' };
    return { httpStatus: 200, data: parsed.data };
  } catch (err) {
    return { httpStatus: 500, message: err instanceof Error ? err.message : 'Erro' };
  }
}
