'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { parseAnaliseHtCsv, extractLojaAnoMesFromFilename } from '@/lib/analise-ht/parse-csv';

const QUERY_KEY = ['analise-ht-uploads'];

const uploadRowSchema = z.object({
  id: z.string(),
  filename: z.string(),
  loja: z.string(),
  ano_mes: z.string(),
  row_count: z.number(),
  uploaded_by: z.string().nullable(),
  created_at: z.string(),
});

export type AnaliseHtUpload = z.infer<typeof uploadRowSchema>;

async function fetchUploads(): Promise<AnaliseHtUpload[]> {
  const res = await fetch('/api/analise-ht/uploads', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(uploadRowSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useAnaliseHtUploads() {
  const qc = useQueryClient();
  const { data: uploads = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchUploads,
    refetchOnWindowFocus: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const { rows, errors } = parseAnaliseHtCsv(text);
      if (rows.length === 0) {
        throw new Error(errors[0] ?? 'Nenhum registro encontrado no CSV.');
      }
      const { loja: lojaFromName, anoMes: anoMesFromName } = extractLojaAnoMesFromFilename(file.name);
      const loja = lojaFromName ?? rows.find(r => r.loja)?.loja ?? 'DESCONHECIDA';
      const anoMes = anoMesFromName ?? '000000';

      const res = await fetch('/api/analise-ht/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, loja, anoMes, rows }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Falha ao importar CSV.');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('CSV importado com sucesso.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analise-ht/uploads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => toast.error('Erro ao remover upload.'),
  });

  const uploadFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => uploadMutation.mutate(file));
  }, [uploadMutation]);

  const remove = useCallback((id: string) => removeMutation.mutate(id), [removeMutation]);

  return { uploads, isLoading, uploadFiles, remove, isUploading: uploadMutation.isPending };
}
