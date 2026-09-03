'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const resultadoSchema = z.object({
  avaliador: z.string(),
  premio: z.number(),
  loja: z.string(),
  uploadId: z.string(),
});

export type PremiacaoResultado = z.infer<typeof resultadoSchema>;

export interface PremiacaoAlvo {
  uploadId: string;
  grupoLojas: string;
}

export interface PremiacaoParamsInput {
  alvos: PremiacaoAlvo[];
  limiteValorGrama: number;
  pesoMinimo: number;
}

// Chave parametrizada pelos uploadIds envolvidos — ver bonificação.
function resultadoQueryKey(uploadIds: string[]) {
  return ['analise-ht-premiacao-resultado', ...[...uploadIds].sort()];
}
const EMPTY_RESULTADO: PremiacaoResultado[] = [];

export function useAnaliseHtPremiacao(uploadIds: string[]) {
  const qc = useQueryClient();
  const key = resultadoQueryKey(uploadIds);
  const { data: resultado = EMPTY_RESULTADO } = useQuery<PremiacaoResultado[]>({
    queryKey: key,
    queryFn: () => qc.getQueryData(key) ?? EMPTY_RESULTADO,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (params: PremiacaoParamsInput) => {
      const res = await fetch('/api/analise-ht/premiacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao calcular premiação.');
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

const faixaSchema = z.object({
  id: z.string(),
  grupoLojas: z.string(),
  valorMin: z.number(),
  valorMax: z.number(),
  pesoMin: z.number(),
  pesoMax: z.number().nullable(),
  premio1: z.number(),
  premio2: z.number(),
  premio3: z.number(),
});

export type PremiacaoFaixaConfig = z.infer<typeof faixaSchema>;

const QUERY_KEY = ['analise-ht-premiacao-config'];

async function fetchFaixas(): Promise<PremiacaoFaixaConfig[]> {
  const res = await fetch('/api/analise-ht/premiacao-config', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(faixaSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

const EMPTY_FAIXAS: PremiacaoFaixaConfig[] = [];

export function useAnaliseHtPremiacaoConfig() {
  const qc = useQueryClient();
  const { data: faixas = EMPTY_FAIXAS, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchFaixas,
  });

  const saveMutation = useMutation({
    mutationFn: async (faixasEditadas: PremiacaoFaixaConfig[]) => {
      const res = await fetch('/api/analise-ht/premiacao-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faixas: faixasEditadas }),
      });
      if (!res.ok) throw new Error('Falha ao salvar configuração.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Configuração de premiação salva.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { faixas, isLoading, salvar: saveMutation.mutate, isSaving: saveMutation.isPending };
}
