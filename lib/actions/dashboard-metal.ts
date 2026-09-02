import { z } from 'zod';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

const mensalRowSchema = z.object({
  loja: z.string(),
  ano_mes: z.string(),
  aval_s4: z.number(),
  compras: z.number(),
  nc: z.number(),
  conv: z.number(),
  metal: z.number(),
  metal_750: z.number(),
  metal_720: z.number(),
  metal_bx: z.number(),
  metal_24k: z.number(),
  metal_22k: z.number(),
  metal_pt: z.number(),
  metal_platina: z.number(),
  metal_prata: z.number(),
  valor: z.number(),
  valor_750: z.number(),
  valor_720: z.number(),
  valor_bx: z.number(),
  valor_24k: z.number(),
  valor_22k: z.number(),
  valor_pt: z.number(),
  valor_platina: z.number(),
  valor_prata: z.number(),
  ticket_medio: z.number(),
  ticket_sum: z.number(),
  ticket_cnt: z.number(),
});
export type MensalRow = z.infer<typeof mensalRowSchema>;

// Identidade vai pelo cookie de sessão HttpOnly (sf_session), enviado automaticamente
// pelo browser em requisições same-origin.
async function authedFetch(url: string): Promise<Response> {
  return fetch(url, { cache: 'no-store' });
}

async function parseError(result: Response): Promise<Pick<ResponseApi<never>, 'httpStatus' | 'message'>> {
  const body = await result.json().catch(() => ({}));
  return { httpStatus: result.status, message: body.message ?? 'Erro na requisição' };
}

export async function fetchMensal(params: {
  loja?: string;
  inicio?: string; // 'YYYY-MM'
  fim?: string; // 'YYYY-MM'
}): Promise<ResponseApi<MensalRow[]>> {
  const qs = new URLSearchParams();
  if (params.loja) qs.set('loja', params.loja);
  if (params.inicio) qs.set('inicio', params.inicio);
  if (params.fim) qs.set('fim', params.fim);

  const result = await authedFetch(`/api/dashboard-metal/mensal?${qs.toString()}`);
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const { success, error, data } = z.array(mensalRowSchema).safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

const detalhesSchema = z.object({
  valorPorLoja: z.array(z.object({ loja: z.string(), ano_mes: z.string(), valor: z.number() })),
  feedback: z.array(z.object({ feedback_id: z.string(), descricao: z.string().nullable(), total: z.number(), compras: z.number(), metal: z.number() })),
  motivoNc: z.array(z.object({ cod: z.string(), total: z.number(), peso: z.number() })),
  horario: z.array(z.object({ slot: z.number(), total: z.number(), compras: z.number() })),
  avaliadores: z.array(z.object({
    avaliador_id: z.string(), avaliador: z.string(), loja: z.string(), ativo: z.boolean(), aval: z.number(), compras: z.number(),
    metal: z.number(), valor: z.number(), m750: z.number(), m720: z.number(),
    mbx: z.number(), m22k: z.number(), mpt: z.number(), m24k: z.number(),
  })),
  precoAvaliador: z.array(z.object({
    avaliador_id: z.string(), avaliador: z.string(), loja: z.string(), nivel: z.string(), n: z.number(), somaPpg: z.number(),
  })),
  avaliadorMensal: z.array(z.object({
    avaliador_id: z.string(), avaliador: z.string(), ano_mes: z.string(), aval: z.number(), compras: z.number(),
  })),
  avaliadorHorario: z.array(z.object({
    avaliador_id: z.string(), avaliador: z.string(), slot: z.number(), total: z.number(), compras: z.number(),
  })),
});
export type DashboardMetalDetalhes = z.infer<typeof detalhesSchema>;

export async function fetchDetalhes(params: {
  loja?: string;
  inicio?: string;
  fim?: string;
}): Promise<ResponseApi<DashboardMetalDetalhes>> {
  const qs = new URLSearchParams();
  if (params.loja) qs.set('loja', params.loja);
  if (params.inicio) qs.set('inicio', params.inicio);
  if (params.fim) qs.set('fim', params.fim);

  const result = await authedFetch(`/api/dashboard-metal/detalhes?${qs.toString()}`);
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const { success, error, data } = detalhesSchema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}
