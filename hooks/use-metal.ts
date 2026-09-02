'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMetal, addMetal, updateMetal, deleteMetal } from '@/lib/actions/controle-lojas-registros';
import { type LojaCode } from '@/lib/controle-config';
import { type MetalRecord } from '@/types/controle';

export type { MetalRecord };

export function useMetal(loja: LojaCode, mes?: { ano: number; mes: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['controle-lojas-metal', loja, mes?.ano, mes?.mes],
    queryFn: async () => {
      const res = await fetchMetal(loja, mes);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar registros');
      return res.data as unknown as MetalRecord[];
    },
  });

  const records = query.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['controle-lojas-metal', loja] });

  const addMutation = useMutation({
    mutationFn: (data: Omit<MetalRecord, 'id' | 'created_at' | 'datetime' | 'total_peso' | 'pago_por_grama'>) =>
      addMetal(loja, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MetalRecord> }) => updateMetal(loja, id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMetal(loja, id),
    onSuccess: invalidate,
  });

  async function addRecord(data: Omit<MetalRecord, 'id' | 'created_at' | 'datetime' | 'total_peso' | 'pago_por_grama'>) {
    const res = await addMutation.mutateAsync(data);
    if (!res.data) throw new Error(res.message ?? 'Erro ao salvar registro');
  }

  async function updateRecord(id: string, data: Partial<MetalRecord>) {
    const res = await updateMutation.mutateAsync({ id, data });
    if (!res.data) throw new Error(res.message ?? 'Erro ao atualizar registro');
  }

  async function deleteRecord(id: string) {
    const res = await deleteMutation.mutateAsync(id);
    if (!res.data) throw new Error(res.message ?? 'Erro ao excluir registro');
  }

  function generateCodInterno(prefix: string): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    const pattern = new RegExp(`^${prefix}(\\d+)-`);
    let maxSeq = 0;
    for (const r of records) {
      const m = r.cod_interno.match(pattern);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
    return `${prefix}${maxSeq + 1}-${mm}${yyyy}`;
  }

  return { records, loading: query.isLoading, addRecord, updateRecord, deleteRecord, generateCodInterno };
}
