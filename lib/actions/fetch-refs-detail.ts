import { z } from 'zod';

const refDetailSchema = z.object({
  referencia:   z.string(),
  status_id:    z.number(),
  status_nome:  z.string(),
  destino:      z.string().nullable(),
  preco_avista: z.number().nullable(),
  fotos:        z.number(),
  motivo:       z.string(),
});

const responseSchema = z.object({
  data: z.array(refDetailSchema),
});

export type RefDetail = z.infer<typeof refDetailSchema>;

export async function fetchRefsDetail(refs: string[]): Promise<RefDetail[]> {
  if (refs.length === 0) return [];
  const res = await fetch('/api/leilao/refs-detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refs }),
  });
  if (!res.ok) return [];
  const json = await res.json() as unknown;
  const parsed = responseSchema.safeParse(json);
  return parsed.success ? parsed.data.data : [];
}
