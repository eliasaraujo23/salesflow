import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const itemSchema = z.object({
  mes:         z.string(),
  destino:     z.string(),
  faturamento: z.coerce.number().default(0),
  quantidade:  z.coerce.number().default(0),
});

export type EvolucaoParceiroItem = z.infer<typeof itemSchema>;

export interface EvolucaoParceiroParams {
  meses?: number;
  tipo?: 'todos' | 'JF' | 'JMF' | 'JM' | 'JR' | 'JC' | 'JMCP' | 'JMSP' | 'JRCP' | 'JRSP';
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
}

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchEvolucaoParceiroAction(
  params: EvolucaoParceiroParams = {},
): Promise<ResponseApi<EvolucaoParceiroItem[]>> {
  try {
    const { meses = 6, tipo, dataInicio, dataFim } = params;
    const qs = new URLSearchParams();

    if (dataInicio && dataFim) {
      qs.set('dataInicio', dataInicio);
      qs.set('dataFim', dataFim);
    } else {
      qs.set('meses', String(meses));
    }
    if (tipo && tipo !== 'todos') qs.set('tipo', tipo);

    const r = await authFetch(`${API_BASE}/evolucao-parceiros?${qs.toString()}`);
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
