'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLancamentos, addLancamento, updateLancamento, deleteLancamento } from '@/lib/actions/controle-lojas-registros';
import { type LojaCode } from '@/lib/controle-config';
import { type LancamentoRecord } from '@/types/controle';

export type { LancamentoRecord };

export function useLancamentos(loja: LojaCode) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['controle-lojas-lancamento', loja],
    queryFn: async () => {
      const res = await fetchLancamentos(loja);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar lançamentos');
      return res.data as unknown as LancamentoRecord[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['controle-lojas-lancamento', loja] });

  const addMutation = useMutation({
    mutationFn: (data: Omit<LancamentoRecord, 'id' | 'created_at'>) => addLancamento(loja, data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LancamentoRecord> }) => updateLancamento(loja, id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLancamento(loja, id),
    onSuccess: invalidate,
  });

  async function addRecord(data: Omit<LancamentoRecord, 'id' | 'created_at'>) {
    const res = await addMutation.mutateAsync(data);
    if (!res.data) throw new Error(res.message ?? 'Erro ao salvar lançamento');
  }

  async function updateRecord(id: string, data: Partial<LancamentoRecord>) {
    const res = await updateMutation.mutateAsync({ id, data });
    if (!res.data) throw new Error(res.message ?? 'Erro ao atualizar lançamento');
  }

  async function deleteRecord(id: string) {
    const res = await deleteMutation.mutateAsync(id);
    if (!res.data) throw new Error(res.message ?? 'Erro ao excluir lançamento');
  }

  return { records: query.data ?? [], loading: query.isLoading, addRecord, updateRecord, deleteRecord };
}
