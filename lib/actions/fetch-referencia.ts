import { z } from 'zod';

const referenciaSchema = z.object({
  referencia: z.string(),
  tipo: z.string(),
  custo_real: z.coerce.number().nullable(),
  preco_cobrado: z.coerce.number().nullable(),
  preco_parceiro: z.coerce.number().nullable(),
  preco_avista: z.coerce.number().nullable(),
  preco_parcelado: z.coerce.number().nullable(),
  peso: z.coerce.number().nullable(),
  diamantes: z.string().nullable(),
  cts_diamantes: z.string().nullable(),
  pedra_colorida: z.string().nullable(),
  cts_pedra_colorida: z.string().nullable(),
  descricao_inteligente: z.string().nullable(),
  produto: z.string().nullable(),
  subtipo: z.string().nullable(),
  tipo_pedra: z.string().nullable(),
  lapidacao: z.string().nullable(),
  status_id: z.coerce.number().nullable(),
  destino: z.string().nullable(),
});

export type ReferenciaData = z.infer<typeof referenciaSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchReferenciaAction(ref: string): Promise<ResponseApi<ReferenciaData>> {
  const res = await fetch(`/api/busca-referencia?ref=${encodeURIComponent(ref.trim().toUpperCase())}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    return { httpStatus: res.status, message: err.error ?? 'Referência não encontrada.' };
  }

  const json = await res.json() as { data: unknown };
  const parsed = referenciaSchema.safeParse(json.data);
  if (!parsed.success) {
    return { httpStatus: 400, message: 'Resposta inesperada do servidor.' };
  }

  return { data: parsed.data };
}
