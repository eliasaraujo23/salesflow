'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  title: string;
  items: string[];
  onAdd: (item: string) => Promise<void>;
  onRemove: (item: string) => Promise<void>;
  placeholder?: string;
}

export function ConfigListEditor({ title, items, onAdd, onRemove, placeholder }: Props) {
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // remove from optimistic once Firestore confirms
  useEffect(() => {
    setOptimistic(prev => prev.filter(i => !items.includes(i)));
  }, [items]);

  const allItems = [...new Set([...items, ...optimistic])].sort((a, b) => a.localeCompare(b));
  const filtered = search
    ? allItems.filter(i => i.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  function openAdd() {
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelAdd() {
    setShowInput(false);
    setNewItem('');
  }

  async function handleAdd() {
    const val = newItem.trim();
    if (!val) return;
    if (allItems.includes(val)) {
      toast.error('Item já existe na lista');
      return;
    }
    setOptimistic(prev => [...prev, val]);
    setNewItem('');
    setShowInput(false);
    setAdding(true);
    try {
      await onAdd(val);
    } catch {
      setOptimistic(prev => prev.filter(i => i !== val));
      toast.error('Erro ao adicionar');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(item: string) {
    setConfirmDelete(null);
    setRemoving(item);
    try {
      await onRemove(item);
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04] flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{allItems.length} itens</span>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-2 pb-3 overflow-y-auto flex-1" style={{ maxHeight: '220px' }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-3 text-center">
            {search ? 'Nenhum resultado' : 'Nenhum item'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(item => (
              <div key={item}>
                {confirmDelete === item ? (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-500/10">
                    <span className="text-sm text-red-600 dark:text-red-400 truncate">Excluir <strong>{item}</strong>?</span>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleRemove(item)}
                        disabled={removing === item}
                        className="px-2 py-1 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-40"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] rounded-md transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/60 group transition-colors">
                    <span className={`text-sm truncate ${optimistic.includes(item) ? 'text-zinc-400 dark:text-zinc-500 italic' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {item}
                    </span>
                    {!optimistic.includes(item) && (
                      <button
                        onClick={() => setConfirmDelete(item)}
                        className="ml-2 flex-shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-white/[0.04] flex-shrink-0">
        {showInput ? (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') cancelAdd();
              }}
              placeholder={placeholder ?? 'Novo item...'}
              className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-indigo-500 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!newItem.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Check size={15} />
            </button>
            <button
              onClick={cancelAdd}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/[0.08] rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={openAdd}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-zinc-200 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg transition-colors"
          >
            <Plus size={14} />
            Adicionar item
          </button>
        )}
      </div>
    </div>
  );
}
