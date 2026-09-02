'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ResumoAvaliadora } from '@/lib/hooks/use-analise-ht-resumo';
import { ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

interface Props {
  resumo: ResumoAvaliadora[];
  bonificacaoPorChave: Record<string, number>;
  premiacaoPorChave: Record<string, number>;
  bonusPrimeiroPrecoPorChave: Record<string, number>;
  metaLojaPorChave: Record<string, number>;
  gratificacaoPorChave: Record<string, number>;
  mostrarColunaLoja: boolean;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const fmtKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

type CardCor = 'zinc' | 'amber' | 'sky' | 'emerald' | 'indigo' | 'violet';

interface Card {
  label: string;
  value: string;
  cor: CardCor;
  destaque?: boolean;
}

const HEADER_COR: Record<CardCor, string> = {
  zinc: 'bg-zinc-600 dark:bg-zinc-700',
  amber: 'bg-amber-600 dark:bg-amber-700',
  sky: 'bg-sky-600 dark:bg-sky-700',
  emerald: 'bg-emerald-600 dark:bg-emerald-700',
  indigo: 'bg-indigo-600 dark:bg-indigo-700',
  violet: 'bg-violet-600 dark:bg-violet-700',
};

const selectCls = 'px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500';

export function ResumoTable({ resumo, bonificacaoPorChave, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave, mostrarColunaLoja }: Props) {
  const [lojaSelecionada, setLojaSelecionada] = useState<string | null>(null);
  const [avaliadorSelecionado, setAvaliadorSelecionado] = useState<string | null>(null);

  const porLoja = useMemo(() => {
    const grupos = new Map<string, ResumoAvaliadora[]>();
    for (const r of resumo) {
      const lista = grupos.get(r.loja) ?? [];
      lista.push(r);
      grupos.set(r.loja, lista);
    }
    for (const lista of grupos.values()) lista.sort((a, b) => a.avaliador.localeCompare(b.avaliador));
    const ordemIndice = (loja: string) => {
      const i = ORDEM_LOJAS.indexOf(loja);
      return i === -1 ? ORDEM_LOJAS.length : i;
    };
    return [...grupos.entries()].sort((a, b) => ordemIndice(a[0]) - ordemIndice(b[0]) || a[0].localeCompare(b[0]));
  }, [resumo]);

  const lojaAtual = lojaSelecionada && porLoja.some(([loja]) => loja === lojaSelecionada) ? lojaSelecionada : porLoja[0]?.[0] ?? null;
  const avaliadorasDaLoja = porLoja.find(([loja]) => loja === lojaAtual)?.[1] ?? [];
  const avaliadorAtual = avaliadorasDaLoja.some(r => r.avaliador === avaliadorSelecionado)
    ? avaliadorSelecionado
    : avaliadorasDaLoja[0]?.avaliador ?? null;

  useEffect(() => {
    if (lojaAtual !== lojaSelecionada) setLojaSelecionada(lojaAtual);
  }, [lojaAtual, lojaSelecionada]);

  useEffect(() => {
    if (avaliadorAtual !== avaliadorSelecionado) setAvaliadorSelecionado(avaliadorAtual);
  }, [avaliadorAtual, avaliadorSelecionado]);

  if (resumo.length === 0) return null;

  const atual = avaliadorasDaLoja.find(r => r.avaliador === avaliadorAtual) ?? avaliadorasDaLoja[0];
  if (!atual) return null;

  const chave = `${atual.avaliador}::${atual.loja}`;
  const bonificacao = bonificacaoPorChave[chave] ?? 0;
  const premiacao = premiacaoPorChave[chave] ?? 0;
  const bonusPrimeiroPreco = bonusPrimeiroPrecoPorChave[chave] ?? 0;
  const metaLoja = metaLojaPorChave[chave] ?? 0;
  const gratificacao = gratificacaoPorChave[chave] ?? 0;
  const totalAPagar = bonificacao + premiacao + bonusPrimeiroPreco + metaLoja + gratificacao;

  const grupos: Card[][] = [
    [
      { label: 'Avaliações', value: String(atual.avaliacoes), cor: 'zinc' },
      { label: 'Compras', value: String(atual.compras), cor: 'zinc' },
      { label: 'Não compras', value: String(atual.naoCompras), cor: 'zinc' },
      { label: 'Conversão', value: fmtPct(atual.conversao), cor: 'zinc' },
    ],
    [
      { label: 'Peso Comprado', value: fmtKg(atual.pesoComprado), cor: 'amber' },
      { label: 'Não Comprado', value: fmtKg(atual.pesoNaoComprado), cor: 'amber' },
      { label: '% Bonificação', value: fmtPct(atual.percentualBonificacao), cor: 'amber' },
    ],
    [
      { label: 'Média Geral', value: fmtBRL(atual.mediaGeral), cor: 'sky' },
      { label: '1º Preço', value: fmtBRL(atual.primeiroPreco), cor: 'sky' },
      { label: '2º Preço', value: fmtBRL(atual.segundoPreco), cor: 'sky' },
      { label: '3º Preço', value: fmtBRL(atual.terceiroPreco), cor: 'sky' },
    ],
    [
      { label: 'Bonificação', value: fmtBRL(bonificacao), cor: 'emerald' },
      { label: 'Premiação', value: fmtBRL(premiacao), cor: 'emerald' },
      { label: 'Bônus 1º Preço', value: fmtBRL(bonusPrimeiroPreco), cor: 'emerald' },
      { label: 'Meta Loja', value: fmtBRL(metaLoja), cor: 'emerald' },
      { label: 'Gratificação', value: fmtBRL(gratificacao), cor: 'emerald' },
    ],
    [
      { label: 'Total a Pagar', value: fmtBRL(totalAPagar), cor: 'indigo', destaque: true },
      { label: 'Lucro Gerado', value: fmtBRL(atual.lucroGerado), cor: 'violet' },
    ],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {mostrarColunaLoja && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Loja</label>
            <select
              value={lojaAtual ?? ''}
              onChange={e => { setLojaSelecionada(e.target.value); setAvaliadorSelecionado(null); }}
              className={selectCls}
            >
              {porLoja.map(([loja]) => (
                <option key={loja} value={loja}>{loja}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Avaliadora</label>
          <select
            value={avaliadorAtual ?? ''}
            onChange={e => setAvaliadorSelecionado(e.target.value)}
            className={selectCls}
          >
            {avaliadorasDaLoja.map(r => (
              <option key={r.avaliador} value={r.avaliador}>{r.avaliador}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {grupos.map((grupo, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {grupo.map(card => (
              <div
                key={card.label}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden"
              >
                <div className={`px-3 py-1.5 text-[11px] font-bold text-white uppercase tracking-wide ${HEADER_COR[card.cor]}`}>
                  {card.label}
                </div>
                <div
                  className={`px-3 py-3 text-lg font-bold tabular-nums ${
                    card.destaque ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
