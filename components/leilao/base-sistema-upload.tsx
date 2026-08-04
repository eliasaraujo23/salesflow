'use client';

import { useRef } from 'react';
import { Upload, X, FileCheck } from 'lucide-react';
import type { Leilao } from '@/lib/hooks/use-leiloes';

export type ActivePieceInfo = {
  codigoPlatforma: string;
  label: string; // e.g. "N°63872 · ETERNNO"
  cor:   string;
};

export type ActiveRefsMap = Map<string, ActivePieceInfo>; // referencia.toUpperCase() → info

function extractCodigoFromFilename(filename: string): string | null {
  const m = filename.match(/(\d{4,6})/);
  return m ? m[1] : null;
}

function parseLeiloesBr(text: string): string[] {
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

interface UploadedFile {
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
}

interface Props {
  uploaded: UploadedFile[];
  leiloes:  Leilao[];
  onAdd:    (file: UploadedFile, refs: string[]) => void;
  onRemove: (codigo: string | null, filename: string) => void;
}

export function BaseSistemaUpload({ uploaded, leiloes, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const codigo = extractCodigoFromFilename(file.name);
      const leilao = codigo
        ? leiloes.find(l => l.codigoPlatforma === codigo) ?? null
        : null;
      const reader = new FileReader();
      reader.onload = ev => {
        const refs = parseLeiloesBr(ev.target?.result as string);
        onAdd({ filename: file.name, codigoPlatforma: codigo, leilao, count: refs.length }, refs);
      };
      reader.readAsText(file, 'UTF-8');
    });
    e.target.value = '';
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {uploaded.map(f => {
        const label = f.leilao
          ? `N°${f.codigoPlatforma} · ${f.leilao.nome}`
          : f.codigoPlatforma
          ? `N°${f.codigoPlatforma}`
          : f.filename;
        const cor = f.leilao?.cor ?? '#71717a';
        return (
          <div
            key={f.filename}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{ borderColor: cor + '60', background: cor + '15', color: cor }}
          >
            <FileCheck size={12} />
            <span>{label}</span>
            <span className="opacity-60">({f.count})</span>
            <button
              onClick={() => onRemove(f.codigoPlatforma, f.filename)}
              className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
            >
              <X size={11} />
            </button>
          </div>
        );
      })}

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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors"
      >
        <Upload size={12} />
        {uploaded.length > 0 ? 'Adicionar arquivo' : 'Carregar base ativa (CSV)'}
      </button>
    </div>
  );
}
