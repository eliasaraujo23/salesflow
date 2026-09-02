'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDespesas, addDespesa, updateDespesa, deleteDespesa } from '@/lib/actions/controle-lojas-registros';
import { type LojaCode } from '@/lib/controle-config';
import { type DespesaRecord } from '@/types/controle';

export type { DespesaRecord };

export function useDespesas(loja: LojaCode) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['controle-lojas-despesa', loja],
    queryFn: async () => {
      const res = await fetchDespesas(loja);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar despesas');
      return res.data as unknown as DespesaRecord[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['controle-lojas-despesa', loja] });

  const addMutation = useMutation({
    mutationFn: (data: Omit<DespesaRecord, 'id' | 'created_at'>) => addDespesa(loja, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DespesaRecord> }) => updateDespesa(loja, id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDespesa(loja, id),
    onSuccess: invalidate,
  });

  async function addRecord(data: Omit<DespesaRecord, 'id' | 'created_at'>) {
    const res = await addMutation.mutateAsync(data);
    if (!res.data) throw new Error(res.message ?? 'Erro ao salvar despesa');
  }

  async function updateRecord(id: string, data: Partial<DespesaRecord>) {
    const res = await updateMutation.mutateAsync({ id, data });
    if (!res.data) throw new Error(res.message ?? 'Erro ao atualizar despesa');
  }

  async function deleteRecord(id: string) {
    const res = await deleteMutation.mutateAsync(id);
    if (!res.data) throw new Error(res.message ?? 'Erro ao excluir despesa');
  }

  return { records: query.data ?? [], loading: query.isLoading, addRecord, updateRecord, deleteRecord };
}
