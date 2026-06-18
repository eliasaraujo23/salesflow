'use server';

import { z } from 'zod';

const API_BASE = 'https://goldtech-fabricacoes-api.onrender.com';

const photoBagSchema = z.object({
  id: z.string().or(z.number()),
  cod_saquinho: z.string(),
  responsavel: z.string(),
  dias: z.number().default(0),
  status: z.enum(['pendente', 'fotografado', 'catalogado', 'finalizado']),
  detalhes: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  url_foto: z.string().nullable().optional(),
});

export type PhotoBag = z.infer<typeof photoBagSchema>;

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchPhotoBagsAction(): Promise<ResponseApi<PhotoBag[]>> {
  try {
    const res = await fetch(`${API_BASE}/fotos`, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(photoBagSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de fotos inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao obter saquinhos de fotos' };
  }
}

export async function createPhotoBagAction(data: Partial<PhotoBag>): Promise<ResponseApi<PhotoBag>> {
  try {
    const res = await fetch(`${API_BASE}/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = photoBagSchema.safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta de criação de saquinho inválida', errors: parsed.error };
    }
    return { httpStatus: 201, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao criar saquinho de fotos' };
  }
}

export async function updatePhotoBagAction(id: string | number, data: Partial<PhotoBag>): Promise<ResponseApi<PhotoBag>> {
  try {
    const res = await fetch(`${API_BASE}/fotos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = photoBagSchema.safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta de atualização de saquinho inválida', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao atualizar saquinho de fotos' };
  }
}

export async function deletePhotoBagAction(id: string | number): Promise<ResponseApi<null>> {
  try {
    const res = await fetch(`${API_BASE}/fotos/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { httpStatus: 200, data: null };
  } catch (error: any) {
    return { httpStatus: 500, message: error.message || 'Erro ao deletar saquinho de fotos' };
  }
}
