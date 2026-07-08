'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useJfDashboard } from '@/hooks/use-jf-dashboard';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

interface KpiCellProps { label: string; value: string; sub?: string; border?: boolean; }
function KpiCell({ label, value, sub, border = true }: KpiCellProps) {
  return (
    <div className={`flex flex-col justify-center gap-0.5 px-5 py-3 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
      {sub && <span className="text-[10px] text-zinc-400">{sub}</span>}
    </div>
  );
}

export default function PainelProducaoPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useJfDashboard();

  const custoFabricacao = useMemo(
    () => (data?.emFabricacao ?? []).reduce((s, r) => s + r.custo_real, 0),
    [data]
  );

  const totalFabricado = useMemo(() => {
    if (!data?.estoqueCategoria) return 0;
    return data.estoqueCategoria.reduce((s, r) => s + r.vendidos + r.estoque + r.em_fabricacao, 0);
  }, [data]);

  // Produto x Custo x Quantidade em fabricação
  const byProdutoCusto = useMemo(() => {
    if (!data?.emFabricacao) return [];
    const map = new Map<string, { custo: number; qtd: number }>();
    for (const r of data.emFabricacao) {
      const key = r.produto ?? r.subtipo ?? 'Outro';
      const e = map.get(key) ?? { custo: 0, qtd: 0 };
      e.custo += r.custo_real;
      e.qtd++;
      map.set(key, e);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.custo - a.custo)
      .map(([name, { custo, qtd }]) => ({ name: `${name} (${qtd})`, value: custo }));
  }, [data]);

  // Estoque por produto (from estoqueCategoria)
  const byProdutoEstoque = useMemo(() => {
    if (!data?.estoqueCategoria) return [];
    const map = new Map<string, number>();
    for (const r of data.estoqueCategoria) {
      if (!r.produto) continue;
      map.set(r.produto, (map.get(r.produto) ?? 0) + r.estoque);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // Conversão: vendidos / totalFabricado
  const conversao = totalFabricado > 0
    ? ((data?.resumo.vendidos ?? 0) / totalFabricado * 100).toFixed(2)
    : '0.00';

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      {/* KPI bar */}
      <div className="grid border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900 text-sm" style={{ gridTemplateColumns: 'repeat(6, 1fr) auto' }}>
        <KpiCell label="Fabricando" value={isLoading ? '—' : String(data?.resumo.em_fabricacao ?? 0)} />
        <KpiCell label="Custo em Fabricação" value={isLoading ? '—' : fmtBRL(custoFabricacao)} />
        <KpiCell label="Total Fabricado" value={isLoading ? '—' : String(totalFabricado)} />
        <KpiCell label="Vendidos" value={isLoading ? '—' : String(data?.resumo.vendidos ?? 0)} />
        <KpiCell label="Em Estoque" value={isLoading ? '—' : String(data?.resumo.estoque ?? 0)} />
        <KpiCell label="Conversão" value={isLoading ? '—' : `${conversao}%`} border={false} />
        <button onClick={() => refetch()} disabled={isFetching} className="px-4 border-l border-zinc-200 dark:border-white/[0.08] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Produto × Custo × Quantidade em Fabricação</p>
              {byProdutoCusto.length > 0 ? (
                <HBarChart data={byProdutoCusto} color="#6366f1" formatter={fmtBRL} maxItems={15} />
              ) : (
                <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Nenhum item em fabricação</div>
              )}
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Estoque por Produto</p>
              {byProdutoEstoque.length > 0 ? (
                <HBarChart data={byProdutoEstoque} color="#10b981" formatter={v => String(v)} maxItems={15} />
              ) : (
                <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* Em Fabricação table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Em Fabricação — {data.emFabricacao.length} peças
              </p>
              <span className="text-[10px] text-zinc-500">Custo Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">{fmtBRL(custoFabricacao)}</span></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-white/[0.06]">
                    {['Referência', 'Produto', 'Subtipo', 'Tipo Pedra', 'Custo Real', 'Fabricante', 'Data Envio', 'Dias'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.emFabricacao.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.destino_manutencao ?? r.destino ?? '—'}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.data_envio_fabricacao ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className={r.dias > 30 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}>
                          {r.dias}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.emFabricacao.length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nenhum item em fabricação no momento.</div>
              )}
            </div>
          </div>

          {/* Conversão section */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Conversão de Venda — JF Acumulado</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Quantidade Fabricada', value: String(totalFabricado), color: 'text-zinc-900 dark:text-zinc-100' },
                { label: 'Quantidade Vendida', value: String(data.resumo.vendidos), color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Conversão', value: `${conversao}%`, color: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Ticket Médio JF', value: fmtBRL(data.resumo.ticket_medio), color: 'text-zinc-900 dark:text-zinc-100' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
