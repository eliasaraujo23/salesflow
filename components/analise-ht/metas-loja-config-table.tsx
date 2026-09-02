'use client';

import { useEffect, useState } from 'react';
import type { MetaLojaConfigRow } from '@/lib/hooks/use-analise-ht-metas-loja';
import { corDaLoja, ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

type CampoPct = 'metaConversao' | 'metaAbaixo250';
type CampoNum = 'metaPeso' | 'premioPeso' | 'metaPagoGrama' | 'premioPagoGrama' | 'premioConversao' | 'limiteAbaixo250' | 'premioAbaixo250';

const inputCls = 'w-20 px-1.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.10] rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-center tabular-nums';
const groupHeaderCls = 'px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 border-l border-zinc-200 dark:border-white/[0.10]';
const subHeaderCls = 'px-2 py-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60';

function chavePct(id: string, campo: CampoPct) {
  return `${id}::${campo}`;
}

interface Props {
  metas: MetaLojaConfigRow[];
  isLoading: boolean;
  edicoes: Record<string, MetaLojaConfigRow>;
  setEdicoes: React.Dispatch<React.SetStateAction<Record<string, MetaLojaConfigRow>>>;
}

export function MetasLojaConfigTable({ metas, isLoading, edicoes, setEdicoes }: Props) {
  // Texto bruto dos campos de % — separado de `edicoes` porque formatar o
  // valor numérico a cada tecla (toFixed) reposiciona o cursor no meio da
  // digitação, impedindo digitar a vírgula decimal.
  const [textosPct, setTextosPct] = useState<Record<string, string>>({});

  useEffect(() => {
    const textos: Record<string, string> = {};
    for (const m of metas) {
      textos[chavePct(m.id, 'metaConversao')] = (m.metaConversao * 100).toFixed(2);
      textos[chavePct(m.id, 'metaAbaixo250')] = (m.metaAbaixo250 * 100).toFixed(2);
    }
    setTextosPct(textos);
  }, [metas]);

  function handleChangeNum(id: string, campo: CampoNum, valor: string) {
    setEdicoes(prev => ({ ...prev, [id]: { ...prev[id], [campo]: parseFloat(valor) || 0 } }));
  }

  function handleChangePct(id: string, campo: CampoPct, valor: string) {
    setTextosPct(prev => ({ ...prev, [chavePct(id, campo)]: valor }));
    setEdicoes(prev => ({ ...prev, [id]: { ...prev[id], [campo]: (parseFloat(valor.replace(',', '.')) || 0) / 100 } }));
  }

  if (isLoading) return <p className="text-xs text-zinc-400">Carregando metas...</p>;

  const linhas = Object.values(edicoes).sort(
    (a, b) => ORDEM_LOJAS.indexOf(a.loja) - ORDEM_LOJAS.indexOf(b.loja)
  );

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <p className="text-[11px] text-zinc-400 shrink-0">Metas e prêmios por loja — cada meta batida paga o valor cheio a toda avaliadora da loja base</p>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs border-separate border-spacing-0 data-table">
          <thead>
            <tr>
              <th rowSpan={2} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 align-bottom border-b border-zinc-200 dark:border-white/[0.13]">
                Loja
              </th>
              <th colSpan={2} className={`${groupHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Peso</th>
              <th colSpan={2} className={`${groupHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Pago por grama</th>
              <th colSpan={2} className={`${groupHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Conversão</th>
              <th colSpan={3} className={`${groupHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Abaixo de X R$/g</th>
            </tr>
            <tr>
              <th className={`${subHeaderCls} border-l border-b border-zinc-200 dark:border-white/[0.13]`}>Meta (g)</th>
              <th className={`${subHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Prêmio</th>
              <th className={`${subHeaderCls} border-l border-b border-zinc-200 dark:border-white/[0.13]`}>Meta (R$)</th>
              <th className={`${subHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Prêmio</th>
              <th className={`${subHeaderCls} border-l border-b border-zinc-200 dark:border-white/[0.13]`}>Meta (%)</th>
              <th className={`${subHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Prêmio</th>
              <th className={`${subHeaderCls} border-l border-b border-zinc-200 dark:border-white/[0.13]`}>Limite (R$)</th>
              <th className={`${subHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Meta (%)</th>
              <th className={`${subHeaderCls} border-b border-zinc-200 dark:border-white/[0.13]`}>Prêmio</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((m, i) => (
              <tr
                key={m.id}
                className={`${i % 2 === 1 ? 'bg-zinc-50/60 dark:bg-white/[0.02]' : ''} hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.06] transition-colors`}
              >
                <td className="px-3 py-2">
                  <span className="inline-flex items-center justify-center gap-1.5 font-bold" style={{ color: corDaLoja(m.loja) }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: corDaLoja(m.loja) }} />
                    {m.loja}
                  </span>
                </td>
                <td className="px-2 py-2 border-l border-zinc-100 dark:border-white/[0.06]">
                  <input type="number" step="1" value={edicoes[m.id]?.metaPeso ?? 0} onChange={e => handleChangeNum(m.id, 'metaPeso', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2">
                  <input type="number" step="0.01" value={edicoes[m.id]?.premioPeso ?? 0} onChange={e => handleChangeNum(m.id, 'premioPeso', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2 border-l border-zinc-100 dark:border-white/[0.06]">
                  <input type="number" step="0.01" value={edicoes[m.id]?.metaPagoGrama ?? 0} onChange={e => handleChangeNum(m.id, 'metaPagoGrama', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2">
                  <input type="number" step="0.01" value={edicoes[m.id]?.premioPagoGrama ?? 0} onChange={e => handleChangeNum(m.id, 'premioPagoGrama', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2 border-l border-zinc-100 dark:border-white/[0.06]">
                  <input type="text" inputMode="decimal" value={textosPct[chavePct(m.id, 'metaConversao')] ?? ''} onChange={e => handleChangePct(m.id, 'metaConversao', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2">
                  <input type="number" step="0.01" value={edicoes[m.id]?.premioConversao ?? 0} onChange={e => handleChangeNum(m.id, 'premioConversao', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2 border-l border-zinc-100 dark:border-white/[0.06]">
                  <input type="number" step="0.01" value={edicoes[m.id]?.limiteAbaixo250 ?? 0} onChange={e => handleChangeNum(m.id, 'limiteAbaixo250', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2">
                  <input type="text" inputMode="decimal" value={textosPct[chavePct(m.id, 'metaAbaixo250')] ?? ''} onChange={e => handleChangePct(m.id, 'metaAbaixo250', e.target.value)} className={inputCls} />
                </td>
                <td className="px-2 py-2">
                  <input type="number" step="0.01" value={edicoes[m.id]?.premioAbaixo250 ?? 0} onChange={e => handleChangeNum(m.id, 'premioAbaixo250', e.target.value)} className={inputCls} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
