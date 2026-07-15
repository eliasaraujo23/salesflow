'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Plus, Loader2, ArrowLeftRight, Search, X } from 'lucide-react';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useLancamentos } from '@/hooks/use-lancamentos';
import { type LancamentoRecord } from '@/types/controle';
import { LancamentoFormModal } from '@/components/controle/lancamento-form-modal';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return (ts instanceof Timestamp ? ts.toDate() : new Date()).toLocaleDateString('pt-BR');
}

function displayId(id: string): string {
  return id.startsWith('ac_') ? id.slice(3) : id;
}

const thCls =
  'px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap border-r border-zinc-100 dark:border-white/[0.04] last:border-0';
const tdCls =
  'px-3 py-2 text-[11px] text-center whitespace-nowrap border-r border-zinc-50 dark:border-white/[0.02] last:border-0';
const tdNum =
  'px-3 py-2 text-[11px] font-mono tabular-nums text-center whitespace-nowrap border-r border-zinc-50 dark:border-white/[0.02] last:border-0';

export default function EntradasPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const { records, loading, addRecord, updateRecord, deleteRecord } = useLancamentos(loja.code as LojaCode);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LancamentoRecord | undefined>(undefined);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const y = now.getFullYear();
    const m = now.getMonth();
    const q = search.toLowerCase();
    return records
      .filter(r => {
        const d = r.data instanceof Timestamp ? r.data.toDate() : new Date();
        if (d.getFullYear() !== y || d.getMonth() !== m) return false;
        if (!q) return true;
        return (
          r.tipo.toLowerCase().includes(q) ||
          r.banco.toLowerCase().includes(q) ||
          r.descricao.toLowerCase().includes(q) ||
          displayId(r.id).includes(q)
        );
      })
      .sort((a, b) => {
        const na = parseInt(displayId(a.id), 10) || 0;
        const nb = parseInt(displayId(b.id), 10) || 0;
        return nb - na;
      });
  }, [records, search, now]);

  const total = filtered.reduce((s, r) => s + r.valor, 0);

  const byTipo = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(r => {
      map[r.tipo] = (map[r.tipo] || 0) + r.valor;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function openEdit(r: LancamentoRecord) {
    setEditing(r);
    setShowModal(true);
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Entradas</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <Plus size={14} />
          Novo Lançamento
        </button>
      </div>

      {/* Totais */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-4 py-3 min-w-[160px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-1">
            Total Entradas
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatBRL(total)}
          </div>
        </div>
        {byTipo.slice(0, 4).map(([tipo, valor]) => (
          <div
            key={tipo}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-3 min-w-[140px]"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 truncate">
              {tipo}
            </div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
              {formatBRL(valor)}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por tipo, banco, código..."
          className="w-full pl-8 pr-8 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
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
          <table className="text-sm border-collapse data-table">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08]">
                <th className={thCls}>ID_LANCAMENTO</th>
                <th className={thCls}>Data</th>
                <th className={thCls}>Valor</th>
                <th className={thCls}>Tipo</th>
                <th className={thCls}>Banco</th>
                <th className={thCls}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-zinc-400">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className={`${tdCls} font-mono text-indigo-600 dark:text-indigo-400 font-medium`}>
                      {displayId(r.id)}
                    </td>
                    <td className={`${tdCls} text-zinc-600 dark:text-zinc-400 tabular-nums`}>
                      {formatDate(r.data)}
                    </td>
                    <td className={`${tdNum} font-semibold text-emerald-700 dark:text-emerald-400`}>
                      {formatBRL(r.valor)}
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                        {r.tipo}
                      </span>
                    </td>
                    <td className={`${tdCls} text-zinc-600 dark:text-zinc-400`}>{r.banco || '—'}</td>
                    <td className={`${tdCls} text-zinc-400 max-w-[200px] truncate`} title={r.descricao}>
                      {r.descricao || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <LancamentoFormModal
          record={editing}
          loja={loja}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={async data => {
            if (editing) await updateRecord(editing.id, data);
            else await addRecord(data);
          }}
          onDelete={editing ? async id => deleteRecord(id) : undefined}
        />
      )}
    </div>
  );
}
