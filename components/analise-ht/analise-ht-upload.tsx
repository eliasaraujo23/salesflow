'use client';

import { useRef } from 'react';
import { Upload, X, FileSpreadsheet } from 'lucide-react';
import type { AnaliseHtUpload } from '@/lib/hooks/use-analise-ht-uploads';

interface Props {
  uploads: AnaliseHtUpload[];
  isUploading: boolean;
  onUpload: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
}

export function AnaliseHtUploadSection({ uploads, isUploading, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files);
    e.target.value = '';
  }

  return (
    <section className="flex flex-col gap-2 shrink-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
        <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2 min-w-0">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Planilhas HT</h2>
          <p className="text-[11px] text-zinc-400">Importe CSVs de Histórico de Trabalho por loja/mês</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input ref={inputRef} type="file" accept=".csv" multiple className="hidden" onChange={handleFiles} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <Upload size={12} />
            {isUploading ? 'Importando...' : uploads.length > 0 ? 'Adicionar mais' : 'Adicionar CSV'}
          </button>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uploads.map(u => (
            <div
              key={u.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 text-xs"
            >
              <FileSpreadsheet size={14} className="shrink-0 text-zinc-400" />
              <span className="font-bold tabular-nums shrink-0 text-zinc-800 dark:text-zinc-100">{u.loja}</span>
              <span className="shrink-0 tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {u.ano_mes}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-500">{u.row_count} registros</span>
              <button
                onClick={() => onRemove(u.id)}
                title="Remover"
                className="shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
