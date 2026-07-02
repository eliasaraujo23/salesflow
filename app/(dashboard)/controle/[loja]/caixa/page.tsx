'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { Vault, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useCaixa } from '@/hooks/use-caixa';
import { type CaixaEntry } from '@/types/controle';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const inputCls =
  'w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm font-mono tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors text-right';

export default function CaixaPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const { records, loading, addRecord } = useCaixa(loja.code as LojaCode);

  const [bruto, setBruto] = useState<Record<string, number>>(() =>
    Object.fromEntries(loja.caixa_bruto.map(l => [l, 0])),
  );
  const [trocados, setTrocados] = useState<Record<string, number>>(() =>
    Object.fromEntries((loja.trocados ?? []).map(l => [l, 0])),
  );

  const [today] = useState(() => new Date());
  const inicioKey = `inicio_caixa_${lojaCode}_${today.toISOString().slice(0, 10)}`;
  const [inicioCaixa, setInicioCaixa] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem(inicioKey) ?? '0') || 0;
    }
    return 0;
  });

  function updateInicio(val: number) {
    localStorage.setItem(inicioKey, String(val));
    setInicioCaixa(val);
  }

  const [saving, setSaving] = useState(false);

  const totalBruto = useMemo(
    () => Object.values(bruto).reduce((s, v) => s + v, 0),
    [bruto],
  );
  const totalTrocados = useMemo(
    () => Object.values(trocados).reduce((s, v) => s + v, 0),
    [trocados],
  );
  const totalLoja = totalBruto + totalTrocados;
  const diferenca = totalLoja - inicioCaixa;

  async function handleSave() {
    setSaving(true);
    try {
      const brutoEntries: CaixaEntry[] = loja!.caixa_bruto.map(l => ({ local: l, valor: bruto[l] ?? 0 }));
      const trocadosEntries: CaixaEntry[] = (loja!.trocados ?? []).map(l => ({ local: l, valor: trocados[l] ?? 0 }));
      await addRecord(brutoEntries, trocadosEntries);
      toast.success('Fechamento registrado');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const difColor =
    diferenca === 0
      ? { border: 'border-emerald-200 dark:border-emerald-500/30', header: 'bg-emerald-600', body: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' }
      : diferenca > 0
      ? { border: 'border-blue-200 dark:border-blue-500/30', header: 'bg-blue-600', body: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' }
      : { border: 'border-red-200 dark:border-red-500/30', header: 'bg-red-600', body: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' };

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Vault size={15} className="text-zinc-400" />
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Fechamento de Caixa</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-5 items-start">
        {/* ── Tabela principal estilo Access ── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <div className="bg-zinc-800 dark:bg-zinc-700 px-4 py-2 text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">
              Dinheiro na Loja
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {loja.caixa_bruto.map(local => (
                <tr key={local} className="border-b border-zinc-50 dark:border-white/[0.02]">
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium w-1/2">{local}</td>
                  <td className="px-3 py-1.5 w-1/2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bruto[local] ?? 0}
                      onChange={e =>
                        setBruto(prev => ({ ...prev, [local]: parseFloat(e.target.value) || 0 }))
                      }
                      className={inputCls}
                    />
                  </td>
                </tr>
              ))}

              <tr className="bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08]">
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Total Bruto
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatBRL(totalBruto)}
                </td>
              </tr>

              {loja.trocados && loja.trocados.length > 0 && (
                <>
                  {loja.trocados.map(local => (
                    <tr key={local} className="border-b border-zinc-50 dark:border-white/[0.02]">
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium">{local}</td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trocados[local] ?? 0}
                          onChange={e =>
                            setTrocados(prev => ({ ...prev, [local]: parseFloat(e.target.value) || 0 }))
                          }
                          className={inputCls}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-white/[0.08]">
                    <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                      Total Trocados
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatBRL(totalTrocados)}
                    </td>
                  </tr>
                </>
              )}

              <tr className="bg-zinc-800 dark:bg-zinc-700">
                <td className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-100">
                  Total Loja
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-white text-base tabular-nums">
                  {formatBRL(totalLoja)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Coluna direita: Início + Diferença + Salvar ── */}
        <div className="space-y-3">
          {/* Início do Caixa */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="bg-indigo-600 px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                Início do Caixa
              </span>
            </div>
            <div className="p-3">
              <input
                type="number"
                step="0.01"
                value={inicioCaixa}
                onChange={e => updateInicio(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Diferença de Caixa */}
          <div className={`rounded-xl overflow-hidden border ${difColor.border}`}>
            <div className={`px-4 py-2 text-center ${difColor.header}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                Diferença de Caixa
              </span>
            </div>
            <div className={`px-4 py-4 text-center ${difColor.body}`}>
              <span className={`text-xl font-bold font-mono tabular-nums ${difColor.text}`}>
                {formatBRL(diferenca)}
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : 'Registrar Fechamento'}
          </button>
        </div>
      </div>

      {/* ── Histórico ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Histórico</p>
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
            <Loader2 size={14} className="animate-spin" /> Carregando...
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4">Nenhum fechamento registrado</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Data / Hora
                  </th>
                  {loja.caixa_bruto.map(l => (
                    <th key={l} className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {l}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Bruto
                  </th>
                  {loja.trocados && loja.trocados.length > 0 && (
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Trocados
                    </th>
                  )}
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 15).map(r => {
                  const d = r.updatedAt instanceof Timestamp ? r.updatedAt.toDate() : new Date();
                  const rowBruto = r.bruto.reduce((s, e) => s + e.valor, 0);
                  const rowTrocados = (r.trocados ?? []).reduce((s, e) => s + e.valor, 0);
                  return (
                    <tr key={r.id} className="border-b border-zinc-50 dark:border-white/[0.02] last:border-0">
                      <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400 tabular-nums text-[12px]">
                        {d.toLocaleDateString('pt-BR')}{' '}
                        {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                        <td className="px-4 py-2.5 text-right font-mono text-[12px] text-zinc-500 dark:text-zinc-400 tabular-nums">
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
