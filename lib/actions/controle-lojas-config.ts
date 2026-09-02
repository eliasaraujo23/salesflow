import { z } from 'zod';

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

const itemSchema = z.object({ id: z.string(), nome: z.string() });
const empresaSchema = z.object({ id: z.string(), nome: z.string(), modalidade_id: z.string().nullable() });
const avaliadorSchema = z.object({ id: z.string(), nome: z.string(), ativo: z.boolean() });

export type ConfigTable =
  | 'avaliadores'
  | 'bancos_caixa'
  | 'motivos_nc'
  | 'modalidades'
  | 'empresas'
  | 'tipos_despesa'
  | 'formas_pagamento'
  | 'tipos_lancamento';

export interface ConfigItem { id: string; nome: string; }
export interface EmpresaItem extends ConfigItem { modalidade_id: string | null; }
export interface AvaliadorItem extends ConfigItem { ativo: boolean; }

// Identidade vai pelo cookie de sessão HttpOnly (sf_session), enviado automaticamente
// pelo browser em requisições same-origin.
function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init);
}

async function parseError(result: Response): Promise<Pick<ResponseApi<never>, 'httpStatus' | 'message'>> {
  const body = await result.json().catch(() => ({}));
  return { httpStatus: result.status, message: body.message ?? 'Erro na requisição' };
}

export async function fetchConfigList(table: ConfigTable): Promise<ResponseApi<ConfigItem[]>> {
  const result = await authedFetch(`/api/controle-lojas/config/${table}`, { cache: 'no-store' });
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const schema = table === 'empresas'
    ? z.array(empresaSchema)
    : table === 'avaliadores'
    ? z.array(avaliadorSchema)
    : z.array(itemSchema);
  const { success, error, data } = schema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data: data as ConfigItem[] };
}

export async function setAvaliadorAtivo(id: string, ativo: boolean): Promise<ResponseApi<AvaliadorItem>> {
  const result = await authedFetch(`/api/controle-lojas/config/avaliadores`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ativo }),
  });
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const { success, error, data } = avaliadorSchema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function addConfigItem(table: ConfigTable, nome: string): Promise<ResponseApi<ConfigItem>> {
  const result = await authedFetch(`/api/controle-lojas/config/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  });
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const { success, error, data } = itemSchema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function renameConfigItem(
  table: ConfigTable,
  id: string,
  nome: string,
  modalidadeId?: string | null
): Promise<ResponseApi<ConfigItem>> {
  const result = await authedFetch(`/api/controle-lojas/config/${table}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nome, ...(modalidadeId !== undefined ? { modalidade_id: modalidadeId } : {}) }),
  });
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const schema = table === 'avaliadores' ? avaliadorSchema : itemSchema;
  const { success, error, data } = schema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function removeConfigItem(table: ConfigTable, id: string): Promise<ResponseApi<{ id: string }>> {
  const result = await authedFetch(`/api/controle-lojas/config/${table}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!result.ok) return parseError(result);
  const response = await result.json();
  return { data: response.data };
}

export async function fetchFeedbacks(loja: string): Promise<ResponseApi<ConfigItem[]>> {
  const result = await authedFetch(`/api/controle-lojas/feedbacks/${loja}`, { cache: 'no-store' });
  if (!result.ok) return parseError(result);

  const response = await result.json();
  const { success, error, data } = z.array(itemSchema).safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function addFeedbackItem(loja: string, nome: string): Promise<ResponseApi<ConfigItem>> {
  const result = await authedFetch(`/api/controle-lojas/feedbacks/${loja}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  });
  if (!result.ok) return parseError(result);
  const response = await result.json();
  const { success, error, data } = itemSchema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function renameFeedbackItem(loja: string, id: string, nome: string): Promise<ResponseApi<ConfigItem>> {
  const result = await authedFetch(`/api/controle-lojas/feedbacks/${loja}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, nome }),
  });
  if (!result.ok) return parseError(result);
  const response = await result.json();
  const { success, error, data } = itemSchema.safeParse(response.data);
  if (!success) return { httpStatus: 400, message: 'Resposta inesperada do servidor.', errors: error };
  return { data };
}

export async function removeFeedbackItem(loja: string, id: string): Promise<ResponseApi<{ id: string }>> {
  const result = await authedFetch(`/api/controle-lojas/feedbacks/${loja}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!result.ok) return parseError(result);
  const response = await result.json();
  return { data: response.data };
}
