'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { ResumoAvaliadora } from '@/lib/hooks/use-analise-ht-resumo';
import { corDaLoja, ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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

function montarGruposBase(atual: ResumoAvaliadora): Card[][] {
  return [
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
  ];
}

// Grupos financeiros — ocultos por padrão, só aparecem depois de o usuário
// confirmar explicitamente pelo olho (ver conversa 2026-09-04).
function montarGruposFinanceiros(atual: ResumoAvaliadora, totais: { bonificacao: number; premiacao: number; bonusPrimeiroPreco: number; metaLoja: number; gratificacao: number }): Card[][] {
  const { bonificacao, premiacao, bonusPrimeiroPreco, metaLoja, gratificacao } = totais;
  const totalAPagar = bonificacao + premiacao + bonusPrimeiroPreco + metaLoja + gratificacao;

  return [
    [
      { label: 'Bonificação', value: fmtBRL(bonificacao), cor: 'emerald' },
      { label: 'Premiação', value: fmtBRL(premiacao), cor: 'emerald' },
      { label: 'Bônus 1º Preço', value: fmtBRL(bonusPrimeiroPreco), cor: 'emerald' },
      { label: 'Comissão', value: fmtBRL(metaLoja), cor: 'emerald' },
      { label: 'Gratificação', value: fmtBRL(gratificacao), cor: 'emerald' },
    ],
    [
      { label: 'Total a Pagar', value: fmtBRL(totalAPagar), cor: 'indigo', destaque: true },
      { label: 'Lucro Gerado', value: fmtBRL(atual.lucroGerado), cor: 'violet' },
    ],
  ];
}

export function ResumoTable({ resumo, bonificacaoPorChave, premiacaoPorChave, bonusPrimeiroPrecoPorChave, metaLojaPorChave, gratificacaoPorChave }: Props) {
  const [avaliadorSelecionado, setAvaliadorSelecionado] = useState<string | null>(null);
  const [mostrarFinanceiro, setMostrarFinanceiro] = useState(false);
  const [confirmandoExibir, setConfirmandoExibir] = useState(false);

  const porAvaliador = useMemo(() => {
    const grupos = new Map<string, ResumoAvaliadora[]>();
    for (const r of resumo) {
      const lista = grupos.get(r.avaliador) ?? [];
      lista.push(r);
      grupos.set(r.avaliador, lista);
    }
    const ordemIndice = (loja: string) => {
      const i = ORDEM_LOJAS.indexOf(loja);
      return i === -1 ? ORDEM_LOJAS.length : i;
    };
    for (const lista of grupos.values()) lista.sort((a, b) => ordemIndice(a.loja) - ordemIndice(b.loja) || a.loja.localeCompare(b.loja));
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [resumo]);

  const avaliadorAtual = porAvaliador.some(([nome]) => nome === avaliadorSelecionado)
    ? avaliadorSelecionado
    : porAvaliador[0]?.[0] ?? null;

  useEffect(() => {
    if (avaliadorAtual !== avaliadorSelecionado) setAvaliadorSelecionado(avaliadorAtual);
  }, [avaliadorAtual, avaliadorSelecionado]);

  if (resumo.length === 0) return null;

  const linhasDaAvaliadora = porAvaliador.find(([nome]) => nome === avaliadorAtual)?.[1] ?? [];
  if (linhasDaAvaliadora.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-500 dark:text-zinc-400">Avaliadora</label>
          <select
            value={avaliadorAtual ?? ''}
            onChange={e => setAvaliadorSelecionado(e.target.value)}
            className={selectCls}
          >
            {porAvaliador.map(([nome]) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => (mostrarFinanceiro ? setMostrarFinanceiro(false) : setConfirmandoExibir(true))}
          title={mostrarFinanceiro ? 'Ocultar valores financeiros' : 'Exibir valores financeiros'}
          className="flex items-center justify-center h-[34px] w-[34px] rounded-lg border border-zinc-200 dark:border-white/[0.13] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          {mostrarFinanceiro ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>

      <ConfirmDialog
        open={confirmandoExibir}
        onOpenChange={setConfirmandoExibir}
        title="Exibir valores financeiros?"
        description=""
        confirmLabel="Exibir"
        onConfirm={() => setMostrarFinanceiro(true)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {linhasDaAvaliadora.map(atual => {
          const chave = `${atual.avaliador}::${atual.loja}`;
          const totais = {
            bonificacao: bonificacaoPorChave[chave] ?? 0,
            premiacao: premiacaoPorChave[chave] ?? 0,
            bonusPrimeiroPreco: bonusPrimeiroPrecoPorChave[chave] ?? 0,
            metaLoja: metaLojaPorChave[chave] ?? 0,
            gratificacao: gratificacaoPorChave[chave] ?? 0,
          };
          const grupos = mostrarFinanceiro
            ? [...montarGruposBase(atual), ...montarGruposFinanceiros(atual, totais)]
            : montarGruposBase(atual);
          const cor = corDaLoja(atual.loja);

          return (
            <div
              key={atual.loja}
              className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-3"
              style={{ borderTopColor: cor, borderTopWidth: 3 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cor }}>{atual.loja}</span>
              </div>
              <div className="flex flex-col gap-2">
                {grupos.map((grupo, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {grupo.map(card => (
                      <div
                        key={card.label}
                        className="min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg overflow-hidden"
                      >
                        <div className={`px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide truncate ${HEADER_COR[card.cor]}`}>
                          {card.label}
                        </div>
                        <div
                          className={`px-2 py-1.5 text-xs font-bold tabular-nums ${
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
        })}
      </div>
    </div>
  );
}
