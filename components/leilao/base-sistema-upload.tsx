'use client';

import { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface Props {
  count:    number;
  onParsed: (refs: Set<string>) => void;
  onClear:  () => void;
}

function parseLeiloesBr(text: string): Set<string> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return new Set();

  // Detect separator: tab, semicolon, or comma
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

  // MiniDescrição is the column that holds the product reference
  const miniIdx = headers.findIndex(h =>
    h.toLowerCase().includes('minidescrição') ||
    h.toLowerCase().includes('minidescricao') ||
    h.toLowerCase().includes('mini')
  );
  if (miniIdx < 0) return new Set();

  const refs = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const val = (cols[miniIdx] ?? '').trim().replace(/^"|"$/g, '').toUpperCase();
    if (val) refs.add(val);
  }
  return refs;
}

export function BaseSistemaUpload({ count, onParsed, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const refs = parseLeiloesBr(text);
      onParsed(refs);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  if (count > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 text-xs font-medium">
        <span>{count} peças já em leilão ativo identificadas</span>
        <button onClick={onClear} className="p-0.5 hover:text-amber-900 dark:hover:text-amber-200 transition-colors">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors"
      >
        <Upload size={12} />
        Carregar base ativa (CSV)
      </button>
    </>
  );
}
