'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Check, X, Pencil, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { type AvaliadorItem } from '@/lib/actions/controle-lojas-config';

interface Props {
  items: AvaliadorItem[];
  onAdd: (nome: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onRename: (id: string, nome: string) => Promise<void>;
  onSetAtivo: (id: string, ativo: boolean) => Promise<void>;
  /** Quando true, a lista ocupa toda a altura disponível do container pai em vez de um maxHeight fixo. */
  fill?: boolean;
}

export function AvaliadorListEditor({ items, onAdd, onRemove, onRename, onSetAtivo, fill }: Props) {
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const sorted = [...items].sort((a, b) => {
    if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
    return a.nome.localeCompare(b.nome);
  });
  const filtered = search
    ? sorted.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  useEffect(() => {
    if (editingId && !items.some(i => i.id === editingId)) setEditingId(null);
  }, [items, editingId]);

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
    if (sorted.some(i => i.nome.toLowerCase() === val.toLowerCase())) {
      toast.error('Avaliador já existe na lista');
      return;
    }
    setNewItem('');
    setShowInput(false);
    try {
      await onAdd(val);
    } catch {
      toast.error('Erro ao adicionar');
    }
  }

  async function handleRemove(id: string) {
    setConfirmDelete(null);
    setRemoving(id);
    try {
      await onRemove(id);
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setRemoving(null);
    }
  }

  function startEdit(item: AvaliadorItem) {
    setEditingId(item.id);
    setEditValue(item.nome);
    setTimeout(() => editRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  async function handleEditSave() {
    const val = editValue.trim();
    if (!editingId || !val) return;
    setSaving(true);
    try {
      await onRename(editingId, val);
      cancelEdit();
    } catch {
      toast.error('Erro ao editar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(item: AvaliadorItem) {
    setTogglingId(item.id);
    try {
      await onSetAtivo(item.id, !item.ativo);
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col ${fill ? 'h-full' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04] flex items-center justify-between flex-shrink-0">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Avaliadores</h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
          {sorted.filter(a => a.ativo).length} ativos · {sorted.length} total
        </span>
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
      <div className="px-4 pt-2 pb-3 overflow-y-auto flex-1" style={fill ? undefined : { maxHeight: '220px' }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-3 text-center">
            {search ? 'Nenhum resultado' : 'Nenhum item'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(item => (
              <div key={item.id}>
                {confirmDelete === item.id ? (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-red-50 dark:bg-red-500/10">
                    <span className="text-sm text-red-600 dark:text-red-400 truncate">Excluir <strong>{item.nome}</strong>?</span>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={removing === item.id}
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
                ) : editingId === item.id ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      ref={editRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleEditSave(); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      disabled={saving}
                      className="flex-1 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-indigo-500 rounded-md text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-50"
                    />
                    <button onClick={handleEditSave} disabled={saving} className="p-1 text-indigo-600 hover:text-indigo-500 disabled:opacity-40">
                      <Check size={13} />
                    </button>
                    <button onClick={cancelEdit} disabled={saving} className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-40">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/60 group transition-colors">
                    <span className={`text-sm truncate ${item.ativo ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600 line-through'}`}>
                      {item.nome}
                    </span>
                    <div className="flex items-center gap-0.5 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleToggleAtivo(item)}
                        disabled={togglingId === item.id}
                        title={item.ativo ? 'Marcar como inativo' : 'Reativar'}
                        className={`p-1 rounded disabled:opacity-40 ${
                          item.ativo
                            ? 'text-zinc-300 dark:text-zinc-600 hover:text-amber-500 dark:hover:text-amber-400'
                            : 'text-emerald-500 dark:text-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {item.ativo ? <UserX size={12} /> : <UserCheck size={12} />}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
              placeholder="Nome do avaliador..."
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
