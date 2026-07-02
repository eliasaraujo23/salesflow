'use client';

import React, { useState, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getLojaConfig } from '@/lib/controle-config';

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const inputCls =
  'w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded text-sm font-mono tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors text-right';

function loadLS(key: string): number {
  if (typeof window === 'undefined') return 0;
  return parseFloat(localStorage.getItem(key) ?? '0') || 0;
}

function saveLS(key: string, v: number) {
  if (typeof window !== 'undefined') localStorage.setItem(key, String(v));
}

export default function CaixaPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const prefix = `cx_${lojaCode}_${today}`;

  const [bruto, setBruto] = useState<Record<string, number>>(() =>
    Object.fromEntries(loja.caixa_bruto.map(l => [l, loadLS(`${prefix}_b_${l}`)])),
  );
  const [trocados, setTrocados] = useState<Record<string, number>>(() =>
    Object.fromEntries((loja.trocados ?? []).map(l => [l, loadLS(`${prefix}_t_${l}`)])),
  );
  const [inicioCaixa, setInicioCaixa] = useState(() => loadLS(`${prefix}_inicio`));

  function setBrutoVal(local: string, val: number) {
    saveLS(`${prefix}_b_${local}`, val);
    setBruto(prev => ({ ...prev, [local]: val }));
  }

  function setTrocadoVal(local: string, val: number) {
    saveLS(`${prefix}_t_${local}`, val);
    setTrocados(prev => ({ ...prev, [local]: val }));
  }

  function setInicio(val: number) {
    saveLS(`${prefix}_inicio`, val);
    setInicioCaixa(val);
  }

  const totalBruto = useMemo(() => Object.values(bruto).reduce((s, v) => s + v, 0), [bruto]);
  const totalTrocados = useMemo(() => Object.values(trocados).reduce((s, v) => s + v, 0), [trocados]);
  const totalLoja = totalBruto + totalTrocados;
  const diferenca = totalLoja - inicioCaixa;

  const hasTrocados = (loja.trocados ?? []).length > 0;

  const difStyle =
    diferenca === 0
      ? { header: 'bg-emerald-600', body: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' }
      : diferenca > 0
      ? { header: 'bg-blue-600', body: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' }
      : { header: 'bg-red-600', body: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' };

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-5 items-start max-w-2xl">

        {/* ── Tabela principal ── */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
          <div className="bg-zinc-800 dark:bg-zinc-700 px-4 py-2 text-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-200">
              Dinheiro na Loja
            </span>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {/* Bruto */}
              {loja.caixa_bruto.map(local => (
                <tr key={local} className="border-b border-zinc-50 dark:border-white/[0.03]">
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium w-2/5 whitespace-nowrap">
                    {local}
                  </td>
                  <td className="px-3 py-1.5 w-3/5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bruto[local] ?? 0}
                      onChange={e => setBrutoVal(local, parseFloat(e.target.value) || 0)}
                      className={inputCls}
                    />
                  </td>
                </tr>
              ))}

              {/* Total Bruto */}
              <tr className="bg-zinc-100 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-white/[0.08]">
                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Total Bruto
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatBRL(totalBruto)}
                </td>
              </tr>

              {/* Trocados */}
              {hasTrocados && (
                <>
                  {(loja.trocados ?? []).map(local => (
                    <tr key={local} className="border-b border-zinc-50 dark:border-white/[0.03]">
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                        {local}
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={trocados[local] ?? 0}
                          onChange={e => setTrocadoVal(local, parseFloat(e.target.value) || 0)}
                          className={inputCls}
                        />
                      </td>
                    </tr>
                  ))}

                  {/* Total Trocados */}
                  <tr className="bg-zinc-100 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-white/[0.08]">
                    <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                      Total Trocados
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatBRL(totalTrocados)}
                    </td>
                  </tr>
                </>
              )}

              {/* Total Loja */}
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

        {/* ── Coluna direita ── */}
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
                onChange={e => setInicio(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Diferença de Caixa */}
          <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.08]">
            <div className={`px-4 py-2 text-center ${difStyle.header}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                Diferença de Caixa
              </span>
            </div>
            <div className={`px-4 py-4 text-center ${difStyle.body}`}>
              <span className={`text-xl font-bold font-mono tabular-nums ${difStyle.text}`}>
                {formatBRL(diferenca)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
