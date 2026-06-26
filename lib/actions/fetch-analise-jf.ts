import { z } from 'zod';

const coerceNum = () => z.coerce.number().default(0);

const kpisSchema = z.object({
  total:       coerceNum(),
  faturamento: coerceNum(),
  ticket_medio: coerceNum(),
});

const rankingItemSchema = z.object({
  tj:     z.string(),
  sub:    z.string(),
  pedra:  z.string(),
  q:      coerceNum(),
  ticket: coerceNum(),
  fat:    coerceNum(),
});

const tipoItemSchema = z.object({
  produto: z.string(),
  q:       coerceNum(),
});

const pedraItemSchema = z.object({
  tipo_pedra: z.string(),
  q:          coerceNum(),
});

const analiseJfSchema = z.object({
  kpis:     kpisSchema,
  ranking:  z.array(rankingItemSchema).default([]),
  por_tipo: z.array(tipoItemSchema).default([]),
  por_pedra: z.array(pedraItemSchema).default([]),
});

export type AnaliseJfData    = z.infer<typeof analiseJfSchema>;
export type RankingItem      = z.infer<typeof rankingItemSchema>;
export type TipoItem         = z.infer<typeof tipoItemSchema>;
export type PedraItem        = z.infer<typeof pedraItemSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  data?: T;
}

export async function fetchAnaliseJfAction(): Promise<ResponseApi<AnaliseJfData>> {
  try {
    const res = await fetch('/api/analise-jf');
    if (!res.ok) return { httpStatus: res.status, message: 'Erro ao carregar análise JF' };

    const json = await res.json();
    const parsed = analiseJfSchema.safeParse(json);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta inesperada do servidor.', };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (e) {
    return { httpStatus: 500, message: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}
