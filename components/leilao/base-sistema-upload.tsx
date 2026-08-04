'use client';

import { useRef } from 'react';
import { Upload, X, Eye, EyeOff } from 'lucide-react';
import type { Leilao } from '@/lib/hooks/use-leiloes';

export type ActivePieceInfo = {
  codigoPlatforma: string;
  label: string;
  cor:   string;
};

export type ActiveRefsMap = Map<string, ActivePieceInfo>;

export interface UploadedFile {
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
}

export function extractCodigoFromFilename(filename: string): string | null {
  const m = filename.match(/(\d{4,6})/);
  return m ? m[1] : null;
}

export function parseLeiloesBr(text: string): string[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const idx = headers.findIndex(h => h.includes('mini'));
  if (idx < 0) return [];
  return lines
    .slice(1)
    .map(l => (l.split(sep)[idx] ?? '').trim().replace(/^"|"$/g, '').toUpperCase())
    .filter(Boolean);
}

interface Props {
  uploaded:        UploadedFile[];
  excludedFiles:   Set<string>;
  leiloes:         Leilao[];
  onAdd:           (file: UploadedFile, refs: string[]) => void;
  onRemove:        (filename: string) => void;
  onToggleExclude: (filename: string) => void;
}

export function BaseSistemaUpload({
  uploaded, excludedFiles, leiloes, onAdd, onRemove, onToggleExclude,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(file => {
      const codigo = extractCodigoFromFilename(file.name);
      const leilao = codigo ? leiloes.find(l => l.codigoPlatforma === codigo) ?? null : null;
      const reader = new FileReader();
      reader.onload = ev => {
        const refs = parseLeiloesBr(ev.target?.result as string);
        onAdd({ filename: file.name, codigoPlatforma: codigo, leilao, count: refs.length }, refs);
      };
      reader.readAsText(file, 'UTF-8');
    });
    e.target.value = '';
  }

  // Sort by codigoPlatforma numerically
  const sorted = [...uploaded].sort((a, b) => {
    const na = Number(a.codigoPlatforma ?? 0);
    const nb = Number(b.codigoPlatforma ?? 0);
    return na - nb;
  });

  return (
    <div className="flex flex-col gap-2">
      {/* List of uploaded bases */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sorted.map(f => {
            const excluded = excludedFiles.has(f.filename);
            const cor      = f.leilao?.cor ?? '#71717a';
            const label    = f.leilao
              ? `${f.leilao.nome}`
              : f.codigoPlatforma
              ? `(sem cadastro)`
              : f.filename;

            return (
              <div
                key={f.filename}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all ${
                  excluded
                    ? 'border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40 opacity-50'
                    : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900'
                }`}
              >
                {/* Color dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: excluded ? '#a1a1aa' : cor }}
                />

                {/* Platform N° */}
                <span className={`font-bold tabular-nums shrink-0 ${excluded ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                  N°{f.codigoPlatforma ?? '—'}
                </span>

                {/* Internal # + name */}
                {f.leilao && (
                  <span className={`shrink-0 tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    excluded ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    #{f.leilao.numero}
                  </span>
                )}

                {/* Name */}
                <span className={`flex-1 truncate ${excluded ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {label}
                </span>

                {/* Count */}
                <span className={`shrink-0 tabular-nums ${excluded ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-500'}`}>
                  {f.count} peças
                </span>

                {/* Toggle exclude */}
                <button
                  onClick={() => onToggleExclude(f.filename)}
                  title={excluded ? 'Incluir na cross-referência' : 'Excluir da cross-referência'}
                  className={`shrink-0 p-1 rounded transition-colors ${
                    excluded
                      ? 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {excluded ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>

                {/* Remove */}
                <button
                  onClick={() => onRemove(f.filename)}
                  title="Remover"
                  className="shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors"
      >
        <Upload size={12} />
        {uploaded.length > 0 ? 'Adicionar mais' : 'Carregar bases ativas (CSV)'}
      </button>
    </div>
  );
}
