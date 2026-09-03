'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const resultadoSchema = z.object({
  avaliador: z.string(),
  linhas: z.number(),
  mediaPagoPorGrama: z.number(),
  bonus: z.number(),
  loja: z.string(),
  uploadId: z.string(),
});

export type BonusPrimeiroPrecoResultado = z.infer<typeof resultadoSchema>;

export interface BonusPrimeiroPrecoParamsInput {
  uploadIds: string[];
  valorBonus: number;
  limiteMedia: number;
}

// Chave parametrizada pelos uploadIds envolvidos — ver bonificação.
function queryKey(uploadIds: string[]) {
  return ['analise-ht-bonus-primeiro-preco-resultado', ...[...uploadIds].sort()];
}
const EMPTY: BonusPrimeiroPrecoResultado[] = [];

export function useAnaliseHtBonusPrimeiroPreco(uploadIds: string[]) {
  const qc = useQueryClient();
  const key = queryKey(uploadIds);
  const { data: resultado = EMPTY } = useQuery<BonusPrimeiroPrecoResultado[]>({
    queryKey: key,
    queryFn: () => qc.getQueryData(key) ?? EMPTY,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (params: BonusPrimeiroPrecoParamsInput) => {
      const res = await fetch('/api/analise-ht/bonus-primeiro-preco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao calcular bônus 1º preço.');
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
