'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const resultadoSchema = z.object({
  avaliador: z.string(),
  avaliacoes: z.number(),
  compras: z.number(),
  naoCompras: z.number(),
  conversao: z.number(),
  pesoComprado: z.number(),
  pesoNaoComprado: z.number(),
  percentualBonificacao: z.number(),
  mediaGeral: z.number(),
  primeiroPreco: z.number(),
  segundoPreco: z.number(),
  terceiroPreco: z.number(),
  lucroGerado: z.number(),
  loja: z.string(),
  uploadId: z.string(),
});

export type ResumoAvaliadora = z.infer<typeof resultadoSchema>;

export interface ResumoParamsInput {
  uploadIds: string[];
  teorMedio: number;
  valorFino: number;
  limitePagoPorGrama: number;
  teorMedioLucro: number;
  valorFinoLucro: number;
}

// Chave parametrizada pelos uploadIds envolvidos — ver bonificação.
function queryKey(uploadIds: string[]) {
  return ['analise-ht-resumo-resultado', ...[...uploadIds].sort()];
}
const EMPTY: ResumoAvaliadora[] = [];

export function useAnaliseHtResumo(uploadIds: string[]) {
  const qc = useQueryClient();
  const key = queryKey(uploadIds);
  const { data: resultado = EMPTY } = useQuery<ResumoAvaliadora[]>({
    queryKey: key,
    queryFn: () => qc.getQueryData(key) ?? EMPTY,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (params: ResumoParamsInput) => {
      const res = await fetch('/api/analise-ht/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao calcular resumo.');
      }
      const body = await res.json();
      const parsed = z.array(resultadoSchema).safeParse(body.data);
      if (!parsed.success) throw new Error('Resposta inesperada do servidor.');
      return parsed.data;
    },
    onSuccess: data => qc.setQueryData(key, data),
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    resultado,
    calcular: mutation.mutate,
    isCalculating: mutation.isPending,
  };
}
