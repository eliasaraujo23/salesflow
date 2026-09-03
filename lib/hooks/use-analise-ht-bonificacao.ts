'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const subtotalSchema = z.object({
  linhasElegiveis: z.number(),
  pesoTotal: z.number(),
  valorGasto: z.number(),
  valorVenda: z.number(),
  lucro: z.number(),
  comissao: z.number(),
});

const parceiroSchema = subtotalSchema.extend({ parceiro: z.string() });

const resultadoSchema = subtotalSchema.extend({
  avaliador: z.string(),
  individual: subtotalSchema,
  emConjunto: subtotalSchema,
  parceiros: z.array(parceiroSchema),
  loja: z.string(),
  uploadId: z.string(),
});

export type BonificacaoSubtotal = z.infer<typeof subtotalSchema>;
export type BonificacaoParceiro = z.infer<typeof parceiroSchema>;
export type BonificacaoResultado = z.infer<typeof resultadoSchema>;

export interface BonificacaoParamsInput {
  uploadIds: string[];
  teorMedio: number;
  valorFino: number;
  percentual: number;
  limitePagoPorGrama: number;
}

// Chave parametrizada pelos uploadIds — sem isso, telas com filtros
// diferentes (ex: Bonificação filtrada por uma loja vs Resumo sempre com
// todos os uploads) compartilhavam o mesmo cache e um recálculo em uma
// tela apagava o filtro aplicado na outra (ver conversa 2026-09-03).
function queryKey(uploadIds: string[]) {
  return ['analise-ht-bonificacao-resultado', ...[...uploadIds].sort()];
}
const EMPTY: BonificacaoResultado[] = [];

export function useAnaliseHtBonificacao(uploadIds: string[]) {
  const qc = useQueryClient();
  const key = queryKey(uploadIds);
  const { data: resultado = EMPTY } = useQuery<BonificacaoResultado[]>({
    queryKey: key,
    queryFn: () => qc.getQueryData(key) ?? EMPTY,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (params: BonificacaoParamsInput) => {
      const res = await fetch('/api/analise-ht/bonificacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao calcular bonificação.');
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
