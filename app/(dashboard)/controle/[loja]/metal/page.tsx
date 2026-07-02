'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Plus, Loader2, Scale, Search, X } from 'lucide-react';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { type MetalRecord } from '@/types/controle';
import { MetalFormModal } from '@/components/controle/metal-form-modal';
import { MesNav } from '@/components/controle/mes-nav';

function fmtDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  return (ts instanceof Timestamp ? ts.toDate() : new Date()).toLocaleDateString('pt-BR');
}

function fmtN(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const thCls =
  'px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400 whitespace-nowrap border-r border-zinc-100 dark:border-white/[0.04] last:border-0';
const tdCls =
  'px-2 py-1.5 text-[11px] whitespace-nowrap border-r border-zinc-50 dark:border-white/[0.02] last:border-0';
const tdNum =
  'px-2 py-1.5 text-[11px] font-mono tabular-nums text-right whitespace-nowrap border-r border-zinc-50 dark:border-white/[0.02] last:border-0';

export default function MetalPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const { records, loading, addRecord, updateRecord, deleteRecord, generateCodInterno } =
    useMetal(loja.code as LojaCode);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MetalRecord | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [filterTransacao, setFilterTransacao] = useState<'ALL' | 'COMPRA' | 'NAO_COMPRA'>('ALL');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records
      .filter(r => {
        const d = r.data instanceof Timestamp ? r.data.toDate() : new Date(r.data as unknown as string);
        if (d.getFullYear() !== selectedYear || d.getMonth() + 1 !== selectedMonth) return false;
        if (filterTransacao !== 'ALL' && r.transacao !== filterTransacao) return false;
        if (
          q &&
          !r.nome.toLowerCase().includes(q) &&
          !r.cod_interno.toLowerCase().includes(q) &&
          !(r.avaliadores ?? []).join(' ').toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const ta = a.data instanceof Timestamp ? a.data.toMillis() : 0;
        const tb2 = b.data instanceof Timestamp ? b.data.toMillis() : 0;
        return tb2 - ta;
      });
  }, [records, search, filterTransacao, selectedYear, selectedMonth]);

  const newCod = generateCodInterno(loja.cod_prefix);

  function openEdit(r: MetalRecord) {
    setEditing(r);
    setShowModal(true);
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale size={15} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Avaliações de Metal</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <MesNav
          year={selectedYear}
          month={selectedMonth}
          onChange={(y, m) => { setSelectedYear(y); setSelectedMonth(m); }}
        />
        <div className="flex items-center gap-2">
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
            onClick={() => { setEditing(undefined); setShowModal(true); }}
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
          <table className="text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08]">
                <th className={thCls}>#</th>
                <th className={thCls}>Cód. Interno</th>
                <th className={thCls}>Data</th>
                <th className={thCls}>Hora</th>
                <th className={thCls}>Feedback</th>
                <th className={`${thCls} text-right`}>Preço</th>
                <th className={thCls}>Motivo NC</th>
                <th className={thCls}>Transação</th>
                <th className={`${thCls} text-right`}>24K</th>
                <th className={`${thCls} text-right`}>22K</th>
                <th className={`${thCls} text-right`}>PT</th>
                <th className={`${thCls} text-right`}>750</th>
                <th className={`${thCls} text-right`}>720</th>
                <th className={`${thCls} text-right`}>BX</th>
                <th className={`${thCls} text-right`}>Platina</th>
                <th className={`${thCls} text-right`}>Prata</th>
                <th className={`${thCls} text-right`}>Peso Total</th>
                <th className={`${thCls} text-right`}>Valor Gasto</th>
                <th className={`${thCls} text-right`}>P/Grama</th>
                <th className={thCls}>Observação</th>
                <th className={thCls}>Avaliador</th>
                <th className={thCls}>AV1</th>
                <th className={thCls}>AV2</th>
                <th className={thCls}>AV3</th>
                <th className={thCls}>AV4</th>
                <th className={thCls}>CPF</th>
                <th className={thCls}>Nome</th>
                <th className={thCls}>Razão Social</th>
                <th className={thCls}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={29} className="py-10 text-center text-sm text-zinc-400">
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const isCompra = r.transacao === 'COMPRA';
                  const avs = r.avaliadores ?? [];
                  const qVals = [r.ouro_24k, r.ouro_22k, r.pt, r.ouro_750, r.ouro_720, r.bx, r.platina, r.prata];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openEdit(r)}
                      className={`border-b border-zinc-50 dark:border-white/[0.02] last:border-0 cursor-pointer transition-colors ${
                        isCompra
                          ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5'
                          : 'hover:bg-red-50/50 dark:hover:bg-red-500/5'
                      }`}
                    >
                      <td className={`${tdCls} text-zinc-400 select-none`}>{filtered.length - idx}</td>
                      <td className={`${tdCls} font-mono text-indigo-600 dark:text-indigo-400 font-medium`}>{r.cod_interno}</td>
                      <td className={`${tdCls} text-zinc-600 dark:text-zinc-400 tabular-nums`}>{fmtDate(r.data)}</td>
                      <td className={`${tdCls} text-zinc-500 tabular-nums`}>{r.hora || '—'}</td>
                      <td className={`${tdCls} text-zinc-600 dark:text-zinc-400 max-w-[120px] truncate`}>{r.feedback || '—'}</td>
                      <td className={`${tdNum} text-zinc-500`}>{r.preco > 0 ? r.preco : '—'}</td>
                      <td className={`${tdCls} text-zinc-500 max-w-[140px] truncate`}>{r.motivo_nc || '—'}</td>
                      <td className={tdCls}>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isCompra
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                          {isCompra ? 'COMPRA' : 'NÃO COMPRA'}
                        </span>
                      </td>
                      {qVals.map((v, i) => (
                        <td key={i} className={tdNum}>
                          {(v ?? 0) > 0
                            ? <span className="font-semibold text-zinc-800 dark:text-zinc-100">{fmtN(v ?? 0)}</span>
                            : <span className="text-zinc-300 dark:text-zinc-600">0,000</span>
                          }
                        </td>
                      ))}
                      <td className={`${tdNum} font-semibold text-zinc-800 dark:text-zinc-100`}>{fmtN(r.total_peso)}</td>
                      <td className={`${tdNum} ${isCompra ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'}`}>
                        {isCompra ? fmtBRL(r.valor) : '—'}
                      </td>
                      <td className={`${tdNum} text-zinc-500`}>
                        {isCompra && r.pago_por_grama > 0 ? fmtBRL(r.pago_por_grama) : '—'}
                      </td>
                      <td className={`${tdCls} text-zinc-500 max-w-[160px] truncate`} title={r.observacao}>
                        {r.observacao || '—'}
                      </td>
                      <td className={`${tdCls} text-zinc-600 dark:text-zinc-400`}>{avs[0] || '—'}</td>
                      <td className={`${tdCls} text-zinc-500`}>{avs[1] || '—'}</td>
                      <td className={`${tdCls} text-zinc-500`}>{avs[2] || '—'}</td>
                      <td className={`${tdCls} text-zinc-500`}>{avs[3] || '—'}</td>
                      <td className={`${tdCls} text-zinc-500`}>{avs[4] || '—'}</td>
                      <td className={`${tdCls} font-mono text-zinc-500 text-[10px]`}>{r.cpf || '—'}</td>
                      <td className={`${tdCls} text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate`}>{r.nome || '—'}</td>
                      <td className={`${tdCls} text-zinc-500 max-w-[160px] truncate`}>{r.razao_social || '—'}</td>
                      <td className={`${tdCls} text-zinc-500`}>{r.tipo || '—'}</td>
                    </tr>
                  );
                })
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
            if (editing) await updateRecord(editing.id, data);
            else await addRecord(data);
          }}
          onDelete={editing ? async id => deleteRecord(id) : undefined}
        />
      )}
    </div>
  );
}
