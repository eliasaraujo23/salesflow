import { z } from 'zod';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

const metalRowSchema = z.object({
  id: z.string(),
  loja: z.string(),
  cod_interno: z.string(),
  data: z.string(),
  hora: z.string(),
  datetime: z.string(),
  avaliadores: z.array(z.string()),
  nome: z.string(),
  cpf: z.string(),
  transacao: z.enum(['COMPRA', 'NAO_COMPRA']),
  feedback_id: z.string().nullable(),
  feedback_nc_id: z.string().nullable(),
  modalidade_id: z.string().nullable(),
  empresa_id: z.string().nullable(),
  ouro_24k: z.coerce.number(),
  ouro_22k: z.coerce.number(),
  pt: z.coerce.number(),
  ouro_750: z.coerce.number(),
  ouro_720: z.coerce.number(),
  bx: z.coerce.number(),
  platina: z.coerce.number(),
  prata: z.coerce.number(),
  total_peso: z.coerce.number(),
  preco: z.coerce.number(),
  valor: z.coerce.number(),
  pago_por_grama: z.coerce.number(),
  observacao: z.string(),
  created_at: z.string(),
});
export type MetalRow = z.infer<typeof metalRowSchema>;

const despesaRowSchema = z.object({
  id: z.string(),
  loja: z.string(),
  data: z.string(),
  tipo_despesa_id: z.string().nullable(),
  forma_pagamento_id: z.string().nullable(),
  banco_caixa_id: z.string().nullable(),
  valor: z.coerce.number(),
  observacao: z.string(),
  created_at: z.string(),
});
export type DespesaRow = z.infer<typeof despesaRowSchema>;

const lancamentoRowSchema = z.object({
  id: z.string(),
  loja: z.string(),
  data: z.string(),
  tipo_lancamento_id: z.string().nullable(),
  banco_caixa_id: z.string().nullable(),
  descricao: z.string(),
  valor: z.coerce.number(),
  created_at: z.string(),
});
export type LancamentoRow = z.infer<typeof lancamentoRowSchema>;

const caixaEntrySchema = z.object({ local: z.string(), valor: z.coerce.number() });
const caixaRowSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
  bruto: z.array(caixaEntrySchema),
  trocados: z.array(caixaEntrySchema),
});
export type CaixaRow = z.infer<typeof caixaRowSchema>;

async function parseError(result: Response): Promise<Pick<ResponseApi<never>, 'httpStatus' | 'message'>> {
  const body = await result.json().catch(() => ({}));
  return { httpStatus: result.status, message: body.message ?? 'Erro na requisição' };
}

async function jsonRequest<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<ResponseApi<T>> {
  // Identidade vai pelo cookie de sessão HttpOnly (sf_session), enviado automaticamente
  // pelo browser em requisições same-origin — não precisa de header manual.
  const result = await fetch(url, init);
  if (!result.ok) return parseError(result);
  const response = await result.json();
  const { success, error, data } = schema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function fetchMetal(loja: string, mes?: { ano: number; mes: number }): Promise<ResponseApi<MetalRow[]>> {
  const query = mes ? `?ano=${mes.ano}&mes=${mes.mes}` : '';
  return jsonRequest(`/api/controle-lojas/metal/${loja}${query}`, z.array(metalRowSchema), { cache: 'no-store' });
}
export async function addMetal(loja: string, body: Record<string, unknown>): Promise<ResponseApi<MetalRow>> {
  return jsonRequest(`/api/controle-lojas/metal/${loja}`, metalRowSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function updateMetal(loja: string, id: string, body: Record<string, unknown>): Promise<ResponseApi<MetalRow>> {
  return jsonRequest(`/api/controle-lojas/metal/${loja}/${id}`, metalRowSchema, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function deleteMetal(loja: string, id: string): Promise<ResponseApi<{ id: string }>> {
  return jsonRequest(`/api/controle-lojas/metal/${loja}/${id}`, z.object({ id: z.string() }), { method: 'DELETE' });
}

export async function fetchDespesas(loja: string): Promise<ResponseApi<DespesaRow[]>> {
  return jsonRequest(`/api/controle-lojas/despesa/${loja}`, z.array(despesaRowSchema), { cache: 'no-store' });
}
export async function addDespesa(loja: string, body: Record<string, unknown>): Promise<ResponseApi<DespesaRow>> {
  return jsonRequest(`/api/controle-lojas/despesa/${loja}`, despesaRowSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function updateDespesa(loja: string, id: string, body: Record<string, unknown>): Promise<ResponseApi<DespesaRow>> {
  return jsonRequest(`/api/controle-lojas/despesa/${loja}/${id}`, despesaRowSchema, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function deleteDespesa(loja: string, id: string): Promise<ResponseApi<{ id: string }>> {
  return jsonRequest(`/api/controle-lojas/despesa/${loja}/${id}`, z.object({ id: z.string() }), { method: 'DELETE' });
}

export async function fetchLancamentos(loja: string): Promise<ResponseApi<LancamentoRow[]>> {
  return jsonRequest(`/api/controle-lojas/lancamento/${loja}`, z.array(lancamentoRowSchema), { cache: 'no-store' });
}
export async function addLancamento(loja: string, body: Record<string, unknown>): Promise<ResponseApi<LancamentoRow>> {
  return jsonRequest(`/api/controle-lojas/lancamento/${loja}`, lancamentoRowSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function updateLancamento(loja: string, id: string, body: Record<string, unknown>): Promise<ResponseApi<LancamentoRow>> {
  return jsonRequest(`/api/controle-lojas/lancamento/${loja}/${id}`, lancamentoRowSchema, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
export async function deleteLancamento(loja: string, id: string): Promise<ResponseApi<{ id: string }>> {
  return jsonRequest(`/api/controle-lojas/lancamento/${loja}/${id}`, z.object({ id: z.string() }), { method: 'DELETE' });
}

export async function fetchCaixa(loja: string): Promise<ResponseApi<CaixaRow[]>> {
  return jsonRequest(`/api/controle-lojas/caixa/${loja}`, z.array(caixaRowSchema), { cache: 'no-store' });
}
export async function addCaixa(
  loja: string,
  bruto: Array<{ local: string; valor: number }>,
  trocados: Array<{ local: string; valor: number }>
): Promise<ResponseApi<CaixaRow>> {
  return jsonRequest(`/api/controle-lojas/caixa/${loja}`, caixaRowSchema, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bruto, trocados }),
  });
}
