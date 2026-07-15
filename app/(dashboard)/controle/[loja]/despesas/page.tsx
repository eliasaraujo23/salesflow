'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Plus, Loader2, Receipt, Search, X } from 'lucide-react';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useDespesas } from '@/hooks/use-despesas';
import { type DespesaRecord } from '@/types/controle';
import { DespesaFormModal } from '@/components/controle/despesa-form-modal';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date();
  return d.toLocaleDateString('pt-BR');
}

export default function DespesasPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const { records, loading, addRecord, updateRecord, deleteRecord } = useDespesas(loja.code as LojaCode);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DespesaRecord | undefined>(undefined);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const q = search.toLowerCase();
    return records.filter(r => {
      const d = r.data instanceof Timestamp ? r.data.toDate() : new Date(r.data as unknown as string);
      if (d.getFullYear() !== y || d.getMonth() !== m) return false;
      return !q ||
        r.tipo_despesa.toLowerCase().includes(q) ||
        r.banco_caixa.toLowerCase().includes(q) ||
        r.observacao.toLowerCase().includes(q);
    });
  }, [records, search, now]);

  const totalDespesas = filtered.reduce((s, r) => s + r.valor, 0);

  const byTipo = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      map[r.tipo_despesa] = (map[r.tipo_despesa] || 0) + r.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function openNew() {
    setEditing(undefined);
    setShowModal(true);
  }

  function openEdit(r: DespesaRecord) {
    setEditing(r);
    setShowModal(true);
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Despesas</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{filtered.length}</span>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <Plus size={14} />
          Nova Despesa
        </button>
      </div>

      {/* Total + breakdown */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 min-w-[160px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Total Despesas</div>
          <div className="text-lg font-bold text-red-700 dark:text-red-400 tabular-nums">{formatBRL(totalDespesas)}</div>
        </div>
        {byTipo.slice(0, 4).map(([tipo, valor]) => (
          <div key={tipo} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-3 min-w-[140px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 truncate">{tipo}</div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{formatBRL(valor)}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar despesas..."
          className="w-full pl-8 pr-8 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <X size={13} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-zinc-400 text-sm">
          <Loader2 size={15} className="animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tipo</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Forma Pagto.</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Banco/Caixa</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Observação</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-400">
                    Nenhuma despesa encontrada
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0 hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 tabular-nums">{formatDate(r.data)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 text-[11px] font-medium text-red-700 dark:text-red-400">
                        {r.tipo_despesa}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{r.forma_pagamento}</td>
                    <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-500">{r.banco_caixa}</td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs max-w-[200px] truncate">{r.observacao || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                      {formatBRL(r.valor)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <DespesaFormModal
          record={editing}
          loja={loja}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={async data => {
            if (editing) {
              await updateRecord(editing.id, data);
            } else {
              await addRecord(data);
            }
          }}
          onDelete={editing ? async id => deleteRecord(id) : undefined}
        />
      )}
    </div>
  );
}
