import { authFetch, API_BASE } from '@/lib/auth-fetch';
import { z } from 'zod';

const photoBagSchema = z.object({
  id: z.union([z.string(), z.number()]),
  data_recebimento: z.string().default(''),
  qtd_fabricado: z.coerce.number().default(0),
  foto_fabricado: z.coerce.number().default(0),
  edit_fabricado: z.coerce.number().default(0),
  qtd_second: z.coerce.number().default(0),
  foto_second: z.coerce.number().default(0),
  edit_second: z.coerce.number().default(0),
  qtd_scrap: z.coerce.number().default(0),
  foto_scrap: z.coerce.number().default(0),
  edit_scrap: z.coerce.number().default(0),
  data_finalizacao: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
});

export type PhotoBag = z.infer<typeof photoBagSchema>;

export type BatchStatus = 'pendente' | 'fotografando' | 'editando' | 'finalizado';

export function getBatchStatus(b: PhotoBag): BatchStatus {
  if (b.data_finalizacao) return 'finalizado';
  const totalQtd = b.qtd_fabricado + b.qtd_second + b.qtd_scrap;
  const totalFoto = b.foto_fabricado + b.foto_second + b.foto_scrap;
  const totalEdit = b.edit_fabricado + b.edit_second + b.edit_scrap;
  if (totalQtd > 0 && totalEdit >= totalQtd) return 'finalizado';
  if (totalQtd > 0 && totalFoto >= totalQtd) return 'editando';
  if (totalFoto > 0) return 'fotografando';
  return 'pendente';
}

export function getBatchDias(b: PhotoBag): number {
  if (!b.data_recebimento) return 0;
  const from = new Date(b.data_recebimento.slice(0, 10) + 'T00:00:00');
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export interface ResponseApi<T> {
  httpStatus?: number;
  message?: string;
  errors?: unknown;
  data?: T;
}

export async function fetchPhotoBagsAction(): Promise<ResponseApi<PhotoBag[]>> {
  try {
    const res = await authFetch(`${API_BASE}/fotos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = z.array(photoBagSchema).safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Dados de fotos inválidos', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao obter lotes de fotos' };
  }
}

export async function createPhotoBagAction(data: Partial<PhotoBag>): Promise<ResponseApi<PhotoBag>> {
  try {
    const res = await authFetch(`${API_BASE}/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = photoBagSchema.safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta de criação inválida', errors: parsed.error };
    }
    return { httpStatus: 201, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao criar lote de fotos' };
  }
}

export async function updatePhotoBagAction(id: string | number, data: Partial<PhotoBag>): Promise<ResponseApi<PhotoBag>> {
  try {
    const res = await authFetch(`${API_BASE}/fotos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    const parsed = photoBagSchema.safeParse(rawData);
    if (!parsed.success) {
      return { httpStatus: 400, message: 'Resposta de atualização inválida', errors: parsed.error };
    }
    return { httpStatus: 200, data: parsed.data };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao atualizar lote de fotos' };
  }
}

export async function deletePhotoBagAction(id: string | number): Promise<ResponseApi<null>> {
  try {
    const res = await authFetch(`${API_BASE}/fotos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { httpStatus: 200, data: null };
  } catch (error: unknown) {
    return { httpStatus: 500, message: error instanceof Error ? error.message : 'Erro ao deletar lote de fotos' };
  }
}
