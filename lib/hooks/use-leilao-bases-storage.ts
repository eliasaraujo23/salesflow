'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Leilao } from '@/lib/hooks/use-leiloes';

const QUERY_KEY = ['leilao-bases-ativas'];

const dbRowSchema = z.object({
  id:               z.number(),
  codigo_plataforma: z.string().nullable(),
  filename:         z.string(),
  count_pecas:      z.number(),
  refs:             z.array(z.string()),
  excluded:         z.boolean(),
});

type DbRow = z.infer<typeof dbRowSchema>;

export interface UploadedFileStored {
  id:              number;
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
}

async function fetchBases(): Promise<DbRow[]> {
  const res = await fetch('/api/leilao/bases', { cache: 'no-store' });
  if (!res.ok) throw new Error('Erro ao buscar bases');
  const json = await res.json();
  return z.object({ data: z.array(dbRowSchema) }).parse(json).data;
}

export function useLeilaoBasesStorage(leiloes: Leilao[]) {
  const qc = useQueryClient();
  const { data: dbRows = [] } = useQuery({ queryKey: QUERY_KEY, queryFn: fetchBases });

  // Derive typed view
  const uploadedFiles: UploadedFileStored[] = dbRows.map(r => ({
    id:              r.id,
    filename:        r.filename,
    codigoPlatforma: r.codigo_plataforma,
    count:           r.count_pecas,
    leilao:          r.codigo_plataforma
      ? leiloes.find(l => l.codigoPlatforma === r.codigo_plataforma) ?? null
      : null,
  }));

  const refsPerFile = new Map<string, string[]>(dbRows.map(r => [r.filename, r.refs]));
  const excludedFiles = new Set<string>(dbRows.filter(r => r.excluded).map(r => r.filename));

  const addMutation = useMutation({
    mutationFn: async (payload: { codigoPlatforma: string | null; filename: string; count: number; refs: string[] }) => {
      const res = await fetch('/api/leilao/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao salvar base');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/leilao/bases/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, excluded }: { id: number; excluded: boolean }) => {
      await fetch(`/api/leilao/bases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const add = useCallback((file: { filename: string; codigoPlatforma: string | null; count: number; leilao: Leilao | null }, refs: string[]) => {
    addMutation.mutate({
      codigoPlatforma: file.codigoPlatforma,
      filename:        file.filename,
      count:           file.count,
      refs,
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
