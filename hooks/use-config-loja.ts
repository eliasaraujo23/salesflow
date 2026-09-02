'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFeedbacks, addFeedbackItem, renameFeedbackItem, removeFeedbackItem,
  type ConfigItem,
} from '@/lib/actions/controle-lojas-config';
import { type LojaCode } from '@/lib/controle-config';

export interface ConfigLoja {
  feedbacks_compra: ConfigItem[];
  loading: boolean;
  addFeedback: (nome: string) => Promise<void>;
  renameFeedback: (id: string, nome: string) => Promise<void>;
  removeFeedback: (id: string) => Promise<void>;
}

export function useConfigLoja(lojaCode: LojaCode): ConfigLoja {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['controle-lojas-feedbacks', lojaCode],
    queryFn: async () => {
      const res = await fetchFeedbacks(lojaCode);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar feedbacks');
      return res.data;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['controle-lojas-feedbacks', lojaCode] });

  const addMutation = useMutation({
    mutationFn: (nome: string) => addFeedbackItem(lojaCode, nome),
    onSuccess: invalidate,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => renameFeedbackItem(lojaCode, id, nome),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFeedbackItem(lojaCode, id),
    onSuccess: invalidate,
  });

  async function addFeedback(nome: string) {
    const res = await addMutation.mutateAsync(nome);
    if (!res.data) throw new Error(res.message ?? 'Erro ao adicionar feedback');
  }

  async function renameFeedback(id: string, nome: string) {
    const res = await renameMutation.mutateAsync({ id, nome });
    if (!res.data) throw new Error(res.message ?? 'Erro ao renomear feedback');
  }

  async function removeFeedback(id: string) {
    const res = await removeMutation.mutateAsync(id);
    if (!res.data) throw new Error(res.message ?? 'Erro ao remover feedback');
  }

  return {
    feedbacks_compra: query.data ?? [],
    loading: query.isLoading,
    addFeedback,
    renameFeedback,
    removeFeedback,
  };
}
