'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  parceiros: string[];
  selected: Set<string>;
  onToggle: (p: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function ParceirosDestinoSidebar({ parceiros, selected, onToggle, onSelectAll, onClearAll }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => parceiros.filter(p => p.toLowerCase().includes(search.toLowerCase())),
    [parceiros, search],
  );

  const allSelected = selected.size === parceiros.length && parceiros.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  function handleSelectAll() {
    if (allSelected || someSelected) onClearAll();
    else onSelectAll();
  }

  return (
    <div className="flex flex-col w-[180px] shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-800">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Destino
        </span>
      </div>

      <div className="px-2 py-2 border-b border-zinc-100 dark:border-white/[0.05]">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-white/[0.08]">
          <Search size={11} className="text-zinc-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar"
            className="flex-1 text-[11px] bg-transparent outline-none text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Select all row */}
        <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-white/[0.04]">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected; }}
            onChange={handleSelectAll}
            className="accent-indigo-600 w-3 h-3 shrink-0"
          />
          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 truncate">
            Selecionar tudo
          </span>
        </label>

        {filtered.map(p => (
          <label key={p} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
            <input
              type="checkbox"
              checked={selected.has(p)}
              onChange={() => onToggle(p)}
              className="accent-indigo-600 w-3 h-3 shrink-0"
            />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate" title={p}>
              {p}
            </span>
          </label>
        ))}

        {filtered.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-zinc-400 text-center">Nenhum resultado</p>
        )}
      </div>
    </div>
  );
}
