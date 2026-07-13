import { authFetch, API_BASE } from '@/lib/auth-fetch';

export interface CadastroJoia {
  referencia: string;
  tipo?: string | null;
  produto?: string | null;
  subtipo?: string | null;
  tipo_pedra?: string | null;
  lapidacao?: string | null;
  peso: number;
  custo_real: number;
  data_entrada?: string | null;
}

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchCadastroJoiasAction(from: string, to: string): Promise<ResponseApi<CadastroJoia[]>> {
  try {
    const url = `${API_BASE}/product-details-cadastradas?from=${from}&to=${to}`;
    console.log('[cadastradas] fetching:', url);
    const r = await authFetch(url);
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[cadastradas] HTTP error:', r.status, body.slice(0, 300));
      throw new Error(`HTTP ${r.status}: ${body.slice(0, 100)}`);
    }
    const raw = await r.json();
    console.log('[cadastradas] raw count:', Array.isArray(raw) ? raw.length : typeof raw, raw && raw[0]);
    if (!Array.isArray(raw)) {
      console.error('[cadastradas] response is not array:', JSON.stringify(raw).slice(0, 200));
      return { httpStatus: 400, message: 'API não retornou array' };
    }
    const data: CadastroJoia[] = raw.map((row: Record<string, unknown>) => ({
      referencia: String(row.referencia ?? ''),
      tipo: (row.tipo as string) ?? null,
      produto: (row.produto as string) ?? null,
      subtipo: (row.subtipo as string) ?? null,
      tipo_pedra: (row.tipo_pedra as string) ?? null,
      lapidacao: (row.lapidacao as string) ?? null,
      peso: Number(row.peso ?? 0),
      custo_real: Number(row.custo_real ?? 0),
      data_entrada: (row.data_entrada as string) ?? null,
    }));
    return { httpStatus: 200, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar cadastro de joias';
    console.error('[cadastradas] catch:', msg);
    return { httpStatus: 500, message: msg };
  }
}
