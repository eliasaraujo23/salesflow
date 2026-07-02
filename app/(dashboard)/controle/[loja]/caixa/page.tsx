'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Vault, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useCaixa } from '@/hooks/use-caixa';
import { type CaixaEntry } from '@/types/controle';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const inputCls = 'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors text-right tabular-nums';
const labelCls = 'block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1';

export default function CaixaPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const { records, loading, addRecord } = useCaixa(loja.code as LojaCode);

  const [bruto, setBruto] = useState<Record<string, number>>(() =>
    Object.fromEntries(loja.caixa_bruto.map(l => [l, 0]))
  );
  const [trocados, setTrocados] = useState<Record<string, number>>(() =>
    Object.fromEntries((loja.trocados ?? []).map(l => [l, 0]))
  );
  const [saving, setSaving] = useState(false);

  const totalBruto = useMemo(() => Object.values(bruto).reduce((s, v) => s + v, 0), [bruto]);
  const totalTrocados = useMemo(() => Object.values(trocados).reduce((s, v) => s + v, 0), [trocados]);
  const grandTotal = totalBruto + totalTrocados;

  async function handleSave() {
    setSaving(true);
    try {
      const brutoEntries: CaixaEntry[] = loja!.caixa_bruto.map(l => ({ local: l, valor: bruto[l] ?? 0 }));
      const trocadosEntries: CaixaEntry[] = (loja!.trocados ?? []).map(l => ({ local: l, valor: trocados[l] ?? 0 }));
      await addRecord(brutoEntries, trocadosEntries);
      toast.success('Fechamento registrado');
      setBruto(Object.fromEntries(loja!.caixa_bruto.map(l => [l, 0])));
      setTrocados(Object.fromEntries((loja!.trocados ?? []).map(l => [l, 0])));
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Vault size={15} className="text-zinc-400" />
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Fechamento de Caixa</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Caixa Bruto</div>
          {loja.caixa_bruto.map(local => (
            <div key={local}>
              <label className={labelCls}>{local}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bruto[local] ?? 0}
                onChange={e => setBruto(prev => ({ ...prev, [local]: parseFloat(e.target.value) || 0 }))}
                className={inputCls}
              />
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-white/[0.04]">
            <span className="text-xs font-medium text-zinc-500">Total Bruto</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatBRL(totalBruto)}</span>
          </div>
        </div>

        <div className="space-y-4">
          {loja.trocados && loja.trocados.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Trocados</div>
              {loja.trocados.map(local => (
                <div key={local}>
                  <label className={labelCls}>{local}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={trocados[local] ?? 0}
                    onChange={e => setTrocados(prev => ({ ...prev, [local]: parseFloat(e.target.value) || 0 }))}
                    className={inputCls}
                  />
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-zinc-100 dark:border-white/[0.04]">
                <span className="text-xs font-medium text-zinc-500">Total Trocados</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatBRL(totalTrocados)}</span>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">Total em Caixa</span>
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">{formatBRL(grandTotal)}</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {saving ? 'Salvando...' : 'Registrar Fechamento'}
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Histórico de Fechamentos</div>
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
            <Loader2 size={14} className="animate-spin" /> Carregando...
          </div>
        ) : records.length === 0 ? (
          <div className="text-sm text-zinc-400 py-4">Nenhum fechamento registrado</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Data / Hora</th>
                  {loja.caixa_bruto.map(l => (
                    <th key={l} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">{l}</th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bruto</th>
                  {loja.trocados && loja.trocados.length > 0 && (
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Trocados</th>
                  )}
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map(r => {
                  const d = r.updatedAt instanceof Timestamp ? r.updatedAt.toDate() : new Date();
                  const rowBruto = r.bruto.reduce((s, e) => s + e.valor, 0);
                  const rowTrocados = (r.trocados ?? []).reduce((s, e) => s + e.valor, 0);
                  return (
                    <tr key={r.id} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                      <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 tabular-nums text-[12px]">
                        {d.toLocaleDateString('pt-BR')} {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      {loja.caixa_bruto.map(l => {
                        const entry = r.bruto.find(e => e.local === l);
                        return (
                          <td key={l} className="px-3 py-2.5 text-right font-mono text-[11px] text-zinc-500 tabular-nums">
                            {entry && entry.valor > 0 ? formatBRL(entry.valor) : '—'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                        {formatBRL(rowBruto)}
                      </td>
                      {loja.trocados && loja.trocados.length > 0 && (
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                          {formatBRL(rowTrocados)}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatBRL(rowBruto + rowTrocados)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
