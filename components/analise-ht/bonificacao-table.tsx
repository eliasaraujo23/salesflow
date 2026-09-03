'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from 'lucide-react';
import type { BonificacaoResultado } from '@/lib/hooks/use-analise-ht-bonificacao';
import type { ResumoAvaliadora } from '@/lib/hooks/use-analise-ht-resumo';
import { corDaLoja } from '@/lib/analise-ht/cores-lojas';

interface Props {
  resultado: BonificacaoResultado[];
  // Usado só para saber em quais lojas a avaliadora atuou no mês — garante
  // que a loja apareça na tabela mesmo com todos os valores zerados (ex:
  // nenhuma compra dela ali ficou dentro do limite de pago/grama).
  resumo: ResumoAvaliadora[];
  premiacaoPorChave: Record<string, number>;
  bonusPrimeiroPrecoPorChave: Record<string, number>;
  metaLojaPorChave: Record<string, number>;
  gratificacaoPorChave: Record<string, number>;
  mostrarColunaLoja: boolean;
}

interface LinhaValores {
  linhasElegiveis: number;
  pesoTotal: number;
  valorGasto: number;
  valorVenda: number;
  lucro: number;
  comissao: number;
  premiacao: number;
  bonusPrimeiroPreco: number;
  metaLoja: number;
  gratificacao: number;
  total: number;
}

interface LinhaLoja extends LinhaValores {
  loja: string;
}

interface LinhaAvaliador extends LinhaValores {
  avaliador: string;
  porLoja: LinhaLoja[];
}

type SortKey = 'avaliador' | keyof LinhaValores;

function somaValores(itens: LinhaValores[]): LinhaValores {
  return itens.reduce((acc, v) => ({
    linhasElegiveis: acc.linhasElegiveis + v.linhasElegiveis,
    pesoTotal: acc.pesoTotal + v.pesoTotal,
    valorGasto: acc.valorGasto + v.valorGasto,
    valorVenda: acc.valorVenda + v.valorVenda,
    lucro: acc.lucro + v.lucro,
    comissao: acc.comissao + v.comissao,
    premiacao: acc.premiacao + v.premiacao,
    bonusPrimeiroPreco: acc.bonusPrimeiroPreco + v.bonusPrimeiroPreco,
    metaLoja: acc.metaLoja + v.metaLoja,
    gratificacao: acc.gratificacao + v.gratificacao,
    total: acc.total + v.total,
  }), {
    linhasElegiveis: 0, pesoTotal: 0, valorGasto: 0, valorVenda: 0, lucro: 0,
    comissao: 0, premiacao: 0, bonusPrimeiroPreco: 0, metaLoja: 0, gratificacao: 0, total: 0,
  });
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COLS: { key: SortKey; label: string }[] = [
  { key: 'avaliador', label: 'Avaliador' },
  { key: 'linhasElegiveis', label: 'Compras' },
  { key: 'pesoTotal', label: 'Peso' },
  { key: 'valorGasto', label: 'Valor Gasto' },
  { key: 'valorVenda', label: 'Valor de Venda' },
  { key: 'lucro', label: 'Lucro' },
  { key: 'comissao', label: 'Bonificação' },
  { key: 'premiacao', label: 'Premiação' },
  { key: 'bonusPrimeiroPreco', label: 'Bônus 1º Preço' },
  { key: 'metaLoja', label: 'Comissão' },
  { key: 'gratificacao', label: 'Gratificação' },
  { key: 'total', label: 'Total' },
];

function LojaPill({ loja }: { loja: string }) {
  const cor = corDaLoja(loja);
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
      style={{ color: cor, backgroundColor: `${cor}1a` }}
    >
      {loja}
    </span>
  );
}

export function BonificacaoTable({ resultado, resumo, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave, mostrarColunaLoja }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandido, setExpandido] = useState<string | null>(null);

  const porAvaliador = useMemo(() => {
    const chaves = new Set([
      ...resultado.map(r => `${r.avaliador}::${r.loja}`),
      ...resumo.map(r => `${r.avaliador}::${r.loja}`),
      ...Object.keys(premiacaoPorChave),
      ...Object.keys(bonusPrimeiroPrecoPorChave),
      ...Object.keys(metaLojaPorChave),
      ...Object.keys(gratificacaoPorChave),
    ]);

    const porNome = new Map<string, LinhaLoja[]>();

    for (const chave of chaves) {
      const [avaliador, loja] = chave.split('::');
      const base = resultado.find(r => r.avaliador === avaliador && r.loja === loja);
      const premiacao = premiacaoPorChave[chave] ?? 0;
      const bonusPrimeiroPreco = bonusPrimeiroPrecoPorChave[chave] ?? 0;
      const metaLoja = metaLojaPorChave[chave] ?? 0;
      const gratificacao = gratificacaoPorChave[chave] ?? 0;
      const comissao = base?.comissao ?? 0;
      const linha: LinhaLoja = {
        loja,
        linhasElegiveis: base?.linhasElegiveis ?? 0,
        pesoTotal: base?.pesoTotal ?? 0,
        valorGasto: base?.valorGasto ?? 0,
        valorVenda: base?.valorVenda ?? 0,
        lucro: base?.lucro ?? 0,
        comissao,
        premiacao,
        bonusPrimeiroPreco,
        metaLoja,
        gratificacao,
        total: comissao + premiacao + bonusPrimeiroPreco + metaLoja + gratificacao,
      };
      const atual = porNome.get(avaliador) ?? [];
      atual.push(linha);
      porNome.set(avaliador, atual);
    }

    const resultadoFinal: LinhaAvaliador[] = [...porNome.entries()].map(([avaliador, porLoja]) => ({
      avaliador,
      porLoja: porLoja.sort((a, b) => b.total - a.total),
      ...somaValores(porLoja),
    }));

    return resultadoFinal;
  }, [resultado, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = useMemo(() => {
    return [...porAvaliador].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [porAvaliador, sortKey, sortDir]);

  const totalGeral = porAvaliador.reduce((s, r) => s + r.total, 0);
  const totalCols = COLS.length + 1 + (mostrarColunaLoja ? 1 : 0);

  if (porAvaliador.length === 0) return null;

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl">
      <table className="w-full text-xs border-separate border-spacing-0 data-table">
        <thead>
          <tr>
            <th colSpan={totalCols} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13]">
              <div className="text-left font-bold text-zinc-800 dark:text-zinc-100">
                Bonificação por avaliador — Total: {fmtBRL(totalGeral)}
              </div>
            </th>
          </tr>
          <tr>
            <th className="sticky top-[41px] z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] w-6" />
            {COLS.map((c, i) => (
              <Fragment key={c.key}>
                <th
                  onClick={() => toggleSort(c.key)}
                  className="sticky top-[41px] z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] cursor-pointer select-none px-3 py-2 text-zinc-500 dark:text-zinc-400"
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key
                      ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                      : <ChevronsUpDown size={10} className="opacity-30" />}
                  </span>
                </th>
                {i === 0 && mostrarColunaLoja && (
                  <th className="sticky top-[41px] z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] px-3 py-2 text-zinc-500 dark:text-zinc-400">
                    Loja
                  </th>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const podeExpandir = mostrarColunaLoja && r.porLoja.length > 1;
            const isOpen = expandido === r.avaliador;
            return (
              <Fragment key={r.avaliador}>
                <tr
                  onClick={() => podeExpandir && setExpandido(isOpen ? null : r.avaliador)}
                  className={`${isOpen ? 'bg-indigo-50/60 dark:bg-indigo-500/[0.08]' : ''} hover:bg-zinc-50 dark:hover:bg-white/[0.03] ${podeExpandir ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-2 py-2 text-zinc-400">
                    {podeExpandir && (
                      <ChevronRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    )}
                  </td>
                  <td className="px-3 py-2 font-bold text-sm text-zinc-900 dark:text-zinc-50">{r.avaliador}</td>
                  {mostrarColunaLoja && (
                    <td className="px-3 py-2">
                      <span className="flex flex-wrap gap-1 justify-center">
                        {r.porLoja.map(l => <LojaPill key={l.loja} loja={l.loja} />)}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-2 tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{r.linhasElegiveis}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{fmtKg(r.pesoTotal)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{fmtBRL(r.valorGasto)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{fmtBRL(r.valorVenda)}</td>
                  <td className="px-3 py-2 tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">{fmtBRL(r.lucro)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{fmtBRL(r.comissao)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-amber-700 dark:text-amber-400">{fmtBRL(r.premiacao)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-sky-700 dark:text-sky-400">{fmtBRL(r.bonusPrimeiroPreco)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-fuchsia-700 dark:text-fuchsia-400">{fmtBRL(r.metaLoja)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-teal-700 dark:text-teal-400">{fmtBRL(r.gratificacao)}</td>
                  <td className="px-3 py-2 tabular-nums font-extrabold text-base text-indigo-700 dark:text-indigo-400">{fmtBRL(r.total)}</td>
                </tr>
                {isOpen && r.porLoja.map(linha => (
                  <tr key={`${r.avaliador}::${linha.loja}`} className="bg-zinc-100/70 dark:bg-zinc-950/40 border-l-2 border-indigo-300 dark:border-indigo-500/40">
                    <td className="px-2 py-1" />
                    <td className="px-3 py-1 pl-6 text-[11px] text-zinc-400 dark:text-zinc-500">↳ {r.avaliador}</td>
                    <td className="px-3 py-1">
                      <span className="flex justify-center"><LojaPill loja={linha.loja} /></span>
                    </td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{linha.linhasElegiveis}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{fmtKg(linha.pesoTotal)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{fmtBRL(linha.valorGasto)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{fmtBRL(linha.valorVenda)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">{fmtBRL(linha.lucro)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-emerald-600/70 dark:text-emerald-400/60">{fmtBRL(linha.comissao)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-amber-600/70 dark:text-amber-400/60">{fmtBRL(linha.premiacao)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-sky-600/70 dark:text-sky-400/60">{fmtBRL(linha.bonusPrimeiroPreco)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-fuchsia-600/70 dark:text-fuchsia-400/60">{fmtBRL(linha.metaLoja)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums text-teal-600/70 dark:text-teal-400/60">{fmtBRL(linha.gratificacao)}</td>
                    <td className="px-3 py-1 text-[11px] tabular-nums font-medium text-indigo-600/70 dark:text-indigo-400/60">{fmtBRL(linha.total)}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
