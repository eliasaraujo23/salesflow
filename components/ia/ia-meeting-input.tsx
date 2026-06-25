'use client';

import React, { useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';

interface IaMeetingInputProps {
  rawText: string;
  onChange: (text: string) => void;
  onAnalyze: () => void;
  onFileLoad: (file: File) => void;
}

const PLACEHOLDER = `Cole aqui as notas da reunião. Exemplos de formato:

Elias: fazer pedido de ouro até sexta (urgente)
Ana: ligar para fornecedor até 30/06
Maria: enviar proposta para cliente (alta)
João: revisar estoque sem prazo
Pedro: fechar orçamento até 15/07`;

export function IaMeetingInput({ rawText, onChange, onAnalyze, onFileLoad }: IaMeetingInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoad(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Format hint */}
      <div className="bg-indigo-50 dark:bg-indigo-500/[0.08] border border-indigo-200/60 dark:border-indigo-500/20 rounded-xl px-4 py-3.5 text-[12.5px] text-indigo-700 dark:text-indigo-300 space-y-1.5">
        <p className="font-semibold text-[13px]">Formato esperado</p>
        <p className="text-indigo-600/80 dark:text-indigo-300/70">
          Uma tarefa por linha: <span className="font-mono bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded">Nome: descrição da tarefa</span>
        </p>
        <p className="text-indigo-600/80 dark:text-indigo-300/70">
          Prioridade: <span className="font-mono">urgente</span> · <span className="font-mono">alta</span> · <span className="font-mono">baixa</span> — Prazo: <span className="font-mono">até 30/06</span> · <span className="font-mono">até sexta</span> · <span className="font-mono">sem prazo</span>
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={rawText}
        onChange={e => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={14}
        className="w-full px-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1] rounded-xl text-[13px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors font-mono leading-relaxed shadow-sm"
      />

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/[0.16] text-[13px] font-medium transition-colors"
        >
          <Upload size={14} /> Carregar .txt
        </button>
        <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />

        <button
          onClick={onAnalyze}
          disabled={!rawText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors shadow-md shadow-indigo-500/20"
        >
          <Sparkles size={14} /> Analisar notas
        </button>
      </div>
    </div>
  );
}
