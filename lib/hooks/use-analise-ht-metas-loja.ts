'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const metaConfigSchema = z.object({
  id: z.string(),
  loja: z.string(),
  metaPeso: z.number(),
  premioPeso: z.number(),
  metaPagoGrama: z.number(),
  premioPagoGrama: z.number(),
  metaConversao: z.number(),
  premioConversao: z.number(),
  limiteAbaixo250: z.number(),
  metaAbaixo250: z.number(),
  premioAbaixo250: z.number(),
});

export type MetaLojaConfigRow = z.infer<typeof metaConfigSchema>;

const CONFIG_QUERY_KEY = ['analise-ht-metas-loja-config'];
const EMPTY_METAS: MetaLojaConfigRow[] = [];

async function fetchMetas(): Promise<MetaLojaConfigRow[]> {
  const res = await fetch('/api/analise-ht/metas-loja-config', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(metaConfigSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useAnaliseHtMetasLojaConfig() {
  const qc = useQueryClient();
  const { data: metas = EMPTY_METAS, isLoading } = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: fetchMetas,
  });

  const saveMutation = useMutation({
    mutationFn: async (metasEditadas: MetaLojaConfigRow[]) => {
      const res = await fetch('/api/analise-ht/metas-loja-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metas: metasEditadas }),
      });
      if (!res.ok) throw new Error('Falha ao salvar metas.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONFIG_QUERY_KEY });
      toast.success('Metas por loja salvas.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { metas, isLoading, salvar: saveMutation.mutate, isSaving: saveMutation.isPending };
}

const conversaoAvaliadoraSchema = z.object({
  avaliador: z.string(),
  avaliacoes: z.number(),
  compras: z.number(),
  conversao: z.number(),
  metaBatida: z.boolean(),
});

const resultadoSchema = z.object({
  loja: z.string(),
  pesoComprado: z.number(),
  metaPesoBatida: z.boolean(),
  pagoPorGramaMedio: z.number(),
  metaPagoGramaBatida: z.boolean(),
  percentualAbaixo250: z.number(),
  metaAbaixo250Batida: z.boolean(),
  conversaoGeral: z.number(),
  premioGrupo: z.number(),
  premioConversao: z.number(),
  conversaoPorAvaliadora: z.array(conversaoAvaliadoraSchema),
});

export type MetaLojaResultado = z.infer<typeof resultadoSchema>;

const RESULTADO_QUERY_KEY = ['analise-ht-metas-loja-resultado'];

export function useAnaliseHtMetasLoja() {
  const qc = useQueryClient();
  const { data: resultado = [] } = useQuery<MetaLojaResultado[]>({
    queryKey: RESULTADO_QUERY_KEY,
    queryFn: () => qc.getQueryData(RESULTADO_QUERY_KEY) ?? [],
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (uploadIds: string[]) => {
      const res = await fetch('/api/analise-ht/metas-loja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao calcular metas por loja.');
      }
      const body = await res.json();
      const parsed = z.array(resultadoSchema).safeParse(body.data);
      if (!parsed.success) throw new Error('Resposta inesperada do servidor.');
      return parsed.data;
    },
    onSuccess: data => qc.setQueryData(RESULTADO_QUERY_KEY, data),
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    resultado,
    calcular: mutation.mutate,
    isCalculating: mutation.isPending,
  };
}
