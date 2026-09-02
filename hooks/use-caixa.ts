'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCaixa, addCaixa } from '@/lib/actions/controle-lojas-registros';
import { type LojaCode } from '@/lib/controle-config';
import { type CaixaRecord, type CaixaEntry } from '@/types/controle';

export type { CaixaRecord };

export function useCaixa(lojaCode: LojaCode) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['controle-lojas-caixa', lojaCode],
    queryFn: async () => {
      const res = await fetchCaixa(lojaCode);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar caixa');
      return res.data as unknown as CaixaRecord[];
    },
  });

  const addMutation = useMutation({
    mutationFn: ({ bruto, trocados }: { bruto: CaixaEntry[]; trocados: CaixaEntry[] }) =>
      addCaixa(lojaCode, bruto, trocados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['controle-lojas-caixa', lojaCode] }),
  });

  async function addRecord(bruto: CaixaEntry[], trocados: CaixaEntry[]) {
    const res = await addMutation.mutateAsync({ bruto, trocados });
    if (!res.data) throw new Error(res.message ?? 'Erro ao salvar caixa');
  }

  return { records: query.data ?? [], loading: query.isLoading, addRecord };
}
