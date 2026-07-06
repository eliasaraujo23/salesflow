'use client';

import React, { useState } from 'react';
import { Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { type Brecho } from '@/hooks/use-breachos';

interface Props {
  breachos: Brecho[];
  onAdd: () => void;
  onRemove: (id: string, nome: string) => Promise<void>;
}

export function BrechoLista({ breachos, onAdd, onRemove }: Props) {
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const filtered = search
    ? breachos.filter(b =>
        b.nome.toLowerCase().includes(search.toLowerCase()) ||
        b.uf.toLowerCase().includes(search.toLowerCase()) ||
        b.estado.toLowerCase().includes(search.toLowerCase())
      )
    : breachos;

  async function handleRemove(b: Brecho) {
    setConfirmId(null);
    setRemoving(b.id);
    try {
      await onRemove(b.id, b.nome);
      toast.success('Brechó removido');
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {breachos.length} brechós
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <Plus size={13} />
          Adicionar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar..."
          className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-px">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
            {search ? 'Nenhum resultado' : 'Nenhum brechó cadastrado'}
          </p>
        ) : (
          filtered.map(b => (
            <div key={b.id}>
              {confirmId === b.id ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10">
                  <span className="text-xs text-red-600 dark:text-red-400 truncate">Excluir <strong>{b.nome}</strong>?</span>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => handleRemove(b)}
                      disabled={removing === b.id}
                      className="px-2 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-40"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] rounded-md hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                      Não
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 group transition-colors">
                  <span className="text-[11px] font-bold text-indigo-500 w-7 shrink-0">{b.uf}</span>
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">{b.nome}</span>
                  <button
                    onClick={() => setConfirmId(b.id)}
                    className="shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
