'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import type { Leilao } from '@/lib/hooks/use-leiloes';

const QUERY_KEY = ['leilao-bases-ativas'];

export interface UploadedFileStored {
  id:              string;
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
  vendidos:        string[];
  pricePerRef:     Record<string, number>;
  loteParaRef:     Record<string, string>;
}

const rowSchema = z.object({
  id: z.string(),
  codigo_plataforma: z.string().nullable(),
  filename: z.string(),
  count_pecas: z.number(),
  refs: z.array(z.string()),
  refs_vendidos: z.array(z.string()),
  excluded: z.boolean(),
  price_per_ref: z.record(z.string(), z.number()),
  lote_para_ref: z.record(z.string(), z.string()),
});

type Row = z.infer<typeof rowSchema>;

async function fetchBases(): Promise<Row[]> {
  const res = await fetch('/api/leilao/bases-ativas', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(rowSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useLeilaoBasesStorage(leiloes: Leilao[]) {
  const qc = useQueryClient();
  const { data: dbRows = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBases,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const uploadedFiles: UploadedFileStored[] = dbRows.map(r => ({
    id:              r.id,
    filename:        r.filename,
    codigoPlatforma: r.codigo_plataforma,
    count:           r.count_pecas,
    vendidos:        r.refs_vendidos,
    pricePerRef:     r.price_per_ref,
    loteParaRef:     r.lote_para_ref,
    leilao:          r.codigo_plataforma
      ? leiloes.find(l => l.codigoPlatforma === r.codigo_plataforma) ?? null
      : null,
  }));

  const refsPerFile   = new Map<string, string[]>(dbRows.map(r => [r.filename, r.refs]));
  const excludedFiles = new Set<string>(dbRows.filter(r => r.excluded).map(r => r.filename));

  const addMutation = useMutation({
    mutationFn: async (payload: {
      codigoPlatforma: string | null;
      filename:        string;
      count:           number;
      refs:            string[];
      refsVendidos:    string[];
      pricePerRef:     Record<string, number>;
      loteParaRef:     Record<string, string>;
    }) => {
      const res = await fetch('/api/leilao/bases-ativas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao salvar base: ${err.message}`),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leilao/bases-ativas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, excluded }: { id: string; excluded: boolean }) => {
      const res = await fetch(`/api/leilao/bases-ativas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded }),
      });
      if (!res.ok) throw new Error('toggle failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const add = useCallback((
    file: { filename: string; codigoPlatforma: string | null; count: number; leilao: Leilao | null; vendidos?: string[]; pricePerRef?: Record<string, number>; loteParaRef?: Record<string, string> },
    refs: string[],
  ) => {
    addMutation.mutate({
      codigoPlatforma: file.codigoPlatforma,
      filename:        file.filename,
      count:           file.count,
      refs,
      refsVendidos:    file.vendidos ?? [],
      pricePerRef:     file.pricePerRef ?? {},
      loteParaRef:     file.loteParaRef ?? {},
    });
  }, [addMutation]);

  const remove = useCallback((filename: string) => {
    const row = dbRows.find(r => r.filename === filename);
    if (row) removeMutation.mutate(row.id);
  }, [dbRows, removeMutation]);

  const toggleExclude = useCallback((filename: string) => {
    const row = dbRows.find(r => r.filename === filename);
    if (row) toggleMutation.mutate({ id: row.id, excluded: !row.excluded });
  }, [dbRows, toggleMutation]);

  return { uploadedFiles, refsPerFile, excludedFiles, add, remove, toggleExclude };
}
