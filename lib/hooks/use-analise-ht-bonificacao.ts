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

// Chave global fixa (não por parâmetro) — o resultado calculado fica em
// cache entre trocas de rota (Bonificação/Resumo/Config são páginas
// separadas) até o próximo "Calcular", sem precisar recalcular ao navegar.
const QUERY_KEY = ['analise-ht-bonificacao-resultado'];

export function useAnaliseHtBonificacao() {
  const qc = useQueryClient();
  const { data: resultado = [] } = useQuery<BonificacaoResultado[]>({
    queryKey: QUERY_KEY,
    queryFn: () => qc.getQueryData(QUERY_KEY) ?? [],
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
    onSuccess: data => qc.setQueryData(QUERY_KEY, data),
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    resultado,
    calcular: mutation.mutate,
    isCalculating: mutation.isPending,
  };
}
