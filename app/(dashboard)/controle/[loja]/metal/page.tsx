'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Plus, Loader2, Scale, Search, X } from 'lucide-react';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { type MetalRecord, QUALIDADES, QUALIDADE_LABELS } from '@/types/controle';
import { MetalFormModal } from '@/components/controle/metal-form-modal';

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  const d = ts instanceof Timestamp ? ts.toDate() : new Date();
  return d.toLocaleDateString('pt-BR');
}

export default function MetalPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const { records, loading, addRecord, updateRecord, deleteRecord, generateCodInterno } = useMetal(loja.code as LojaCode);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MetalRecord | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [filterTransacao, setFilterTransacao] = useState<'ALL' | 'COMPRA' | 'NAO_COMPRA'>('ALL');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      if (filterTransacao !== 'ALL' && r.transacao !== filterTransacao) return false;
      if (q && !r.nome.toLowerCase().includes(q) && !r.cod_interno.toLowerCase().includes(q) && !r.avaliadores.join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [records, search, filterTransacao]);

  const newCod = generateCodInterno(loja.cod_prefix);

  function openNew() {
    setEditing(undefined);
    setShowModal(true);
  }

  function openEdit(r: MetalRecord) {
    setEditing(r);
    setShowModal(true);
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Avaliações de Metal</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{records.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          {(['ALL', 'COMPRA', 'NAO_COMPRA'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterTransacao(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterTransacao === f
                  ? f === 'COMPRA'
                    ? 'bg-emerald-600 text-white'
                    : f === 'NAO_COMPRA'
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {f === 'ALL' ? 'Todos' : f === 'COMPRA' ? 'Compras' : 'Não Compras'}
            </button>
          ))}
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
            Nova Avaliação
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, código..."
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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cód.</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tipo</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cliente</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Avaliador</th>
                {QUALIDADES.map(q => (
                  <th key={q} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">{QUALIDADE_LABELS[q]}</th>
                ))}
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total (g)</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Valor</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-sm text-zinc-400">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0 hover:bg-zinc-50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-500">{r.cod_interno}</td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400 tabular-nums text-[12px]">{formatDate(r.data)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                        r.transacao === 'COMPRA'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        {r.transacao === 'COMPRA' ? 'Compra' : 'NC'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">{r.nome || '—'}</td>
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400 text-[12px] max-w-[100px] truncate">
                      {r.avaliadores?.join(', ')}
                    </td>
                    {QUALIDADES.map(q => (
                      <td key={q} className="px-2 py-2.5 text-center font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {r[q] > 0 ? r[q].toFixed(3) : '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-zinc-800 dark:text-zinc-200 tabular-nums text-[12px]">
                      {r.total_peso.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-zinc-700 dark:text-zinc-300 tabular-nums">
                      {r.transacao === 'COMPRA' ? formatBRL(r.valor) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-zinc-500 dark:text-zinc-400 max-w-[140px] truncate">{r.feedback}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <MetalFormModal
          record={editing}
          loja={loja}
          codInterno={newCod}
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
