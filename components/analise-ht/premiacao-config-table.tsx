'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAnaliseHtPremiacaoConfig, type PremiacaoFaixaConfig } from '@/lib/hooks/use-analise-ht-premiacao';

const GRUPOS = [
  { key: 'GTT_PTQ_PGT_24K', label: 'GTT, PTQ, PGT e 24K (Tijuca, Taquara, Tijuquinha e Méier)' },
  { key: 'GTI_CI', label: 'GTI e PCI (Ipanema e Copacabana)' },
];

const inputCls = 'w-20 px-1.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.10] rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-center tabular-nums';

const fmtFaixaValor = (min: number, max: number) => `R$${min.toFixed(2)} - R$${max.toFixed(2)}`;
const fmtFaixaPeso = (min: number, max: number | null) => (max === null ? `Acima de ${min}g` : `${min}g - ${max}g`);

export function PremiacaoConfigTable() {
  const { faixas, isLoading, salvar, isSaving } = useAnaliseHtPremiacaoConfig();
  const [edicoes, setEdicoes] = useState<Record<string, PremiacaoFaixaConfig>>({});

  useEffect(() => {
    const map: Record<string, PremiacaoFaixaConfig> = {};
    for (const f of faixas) map[f.id] = f;
    setEdicoes(map);
  }, [faixas]);

  function handleChange(id: string, campo: 'premio1' | 'premio2' | 'premio3', valor: string) {
    setEdicoes(prev => ({ ...prev, [id]: { ...prev[id], [campo]: parseFloat(valor) || 0 } }));
  }

  function handleSalvar() {
    salvar(Object.values(edicoes));
  }

  if (isLoading) return <p className="text-xs text-zinc-400">Carregando configuração...</p>;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-[11px] text-zinc-400">Valores de premiação por faixa de pago/grama e peso (1º, 2º e 3º lugar)</p>
        <button
          onClick={handleSalvar}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-h-0">
        {GRUPOS.map(grupo => {
          const faixasGrupo = Object.values(edicoes).filter(f => f.grupoLojas === grupo.key)
            .sort((a, b) => b.valorMin - a.valorMin || a.pesoMin - b.pesoMin);

          if (faixasGrupo.length === 0) return null;

          return (
            <div key={grupo.key} className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-white/[0.13] font-bold text-sm text-zinc-800 dark:text-zinc-100 shrink-0">
                {grupo.label}
              </div>
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-xs border-separate border-spacing-0 data-table">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Valor (pago/grama)</th>
                      <th className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Peso</th>
                      <th className="sticky top-0 z-10 px-2 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">1º Lugar</th>
                      <th className="sticky top-0 z-10 px-2 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">2º Lugar</th>
                      <th className="sticky top-0 z-10 px-2 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">3º Lugar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faixasGrupo.map((f, i) => (
                      <tr
                        key={f.id}
                        className={`${i % 2 === 1 ? 'bg-zinc-50/60 dark:bg-white/[0.02]' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.06] transition-colors`}
                      >
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{fmtFaixaValor(f.valorMin, f.valorMax)}</td>
                        <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{fmtFaixaPeso(f.pesoMin, f.pesoMax)}</td>
                        {(['premio1', 'premio2', 'premio3'] as const).map(campo => (
                          <td key={campo} className="px-2 py-1.5">
                            <input
                              type="number" step="0.01" value={edicoes[f.id]?.[campo] ?? 0}
                              onChange={e => handleChange(f.id, campo, e.target.value)}
                              className={inputCls}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
