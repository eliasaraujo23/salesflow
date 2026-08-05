'use client';

import { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';
import type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';
import {
  generateCsvUploadImagens,
  generateCsvAtualizarPreco,
  downloadCsv,
} from '@/lib/leilao-csv';

interface Props {
  basePieces:    LeilaoBaseRow[];
  uploadedFiles: UploadedFileStored[];
  refsPerFile:   Map<string, string[]>;
}

function BaseSelect({
  value, onChange, uploadedFiles,
}: {
  value: string;
  onChange: (v: string) => void;
  uploadedFiles: UploadedFileStored[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-8 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
      >
        <option value="">— Selecionar base —</option>
        {uploadedFiles.map(f => (
          <option key={f.filename} value={f.filename}>
            {f.codigoPlatforma ? `N°${f.codigoPlatforma}` : '(sem N°)'}
            {f.leilao ? ` · ${f.leilao.nome}` : ''}
            {' '}— {f.count} peças
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    </div>
  );
}

export function RoboOperacoes({ basePieces, uploadedFiles, refsPerFile }: Props) {
  const [imgBase,    setImgBase]    = useState('');
  const [precoBase,  setPrecoBase]  = useState('');

  const priceMap = new Map<string, LeilaoBaseRow>(
    basePieces.map(p => [p.referencia.toUpperCase(), p])
  );

  function handleUploadImagens() {
    const refs = refsPerFile.get(imgBase) ?? [];
    if (refs.length === 0) return;
    const file = uploadedFiles.find(f => f.filename === imgBase);
    const num  = file?.codigoPlatforma ?? 'base';
    downloadCsv(generateCsvUploadImagens(refs), `upload_imagens_${num}.csv`);
  }

  function handleAtualizarPreco() {
    const refs = refsPerFile.get(precoBase) ?? [];
    if (refs.length === 0) return;
    const file = uploadedFiles.find(f => f.filename === precoBase);
    const num  = file?.codigoPlatforma ?? 'base';
    downloadCsv(generateCsvAtualizarPreco(refs, priceMap), `atualizar_preco_${num}.csv`);
  }

  const imgRefs   = refsPerFile.get(imgBase)   ?? [];
  const precoRefs = refsPerFile.get(precoBase) ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* Upload Imagens */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Upload Imagens</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Gera lista de referências — imagens buscadas pelo banco</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <BaseSelect value={imgBase} onChange={setImgBase} uploadedFiles={uploadedFiles} />
          <button
            onClick={handleUploadImagens}
            disabled={!imgBase || imgRefs.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
          >
            <Download size={13} />
            Baixar CSV — Upload Imagens{imgRefs.length > 0 ? ` (${imgRefs.length})` : ''}
          </button>
        </div>
      </div>

      {/* Atualizar Preço */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Atualizar Preço</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Atualiza preço contratado com o valor à vista do sistema</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <BaseSelect value={precoBase} onChange={setPrecoBase} uploadedFiles={uploadedFiles} />
          <button
            onClick={handleAtualizarPreco}
            disabled={!precoBase || precoRefs.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 dark:disabled:text-zinc-500 text-xs font-semibold transition-colors"
          >
            <Download size={13} />
            Baixar CSV — Atualizar Preço{precoRefs.length > 0 ? ` (${precoRefs.length})` : ''}
          </button>
        </div>
      </div>

    </div>
  );
}
