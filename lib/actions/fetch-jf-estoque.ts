import { z } from 'zod';
import { authFetch, API_BASE } from '@/lib/auth-fetch';

const jfEstoqueItemSchema = z.object({
  referencia:          z.string().default(''),
  tipo:                z.string().nullable().optional(),
  produto:             z.string().nullable().optional(),
  subtipo:             z.string().nullable().optional(),
  tipo_pedra:          z.string().nullable().optional(),
  lapidacao:           z.string().nullable().optional(),
  destino:             z.string().nullable().optional(),
  peso:                z.coerce.number().default(0),
  custo_real:          z.coerce.number().default(0),
  preco_cobrado:       z.coerce.number().nullable().optional(),
  diamantes:           z.string().nullable().optional(),
  cts_diamantes:       z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
  pedra_colorida:      z.string().nullable().optional(),
  cts_pedra_colorida:  z.string().nullable().optional().transform(v => (!v || v.trim() === '') ? null : parseFloat(v.replace(',', '.')) || null),
  fabricante:          z.string().nullable().optional(),
  certificada:         z.string().nullable().optional(),
  numero_certificado:  z.string().nullable().optional(),
});

export type JfEstoqueItem = z.infer<typeof jfEstoqueItemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchJfEstoqueAction(): Promise<ResponseApi<JfEstoqueItem[]>> {
  try {
    const r = await authFetch(`${API_BASE}/lista-estoque`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const raw = await r.json();
    const parsed = z.array(jfEstoqueItemSchema).safeParse(raw);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Formato inválido de lista-estoque JF', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar estoque JF';
    return { httpStatus: 500, message: msg };
  }
}
