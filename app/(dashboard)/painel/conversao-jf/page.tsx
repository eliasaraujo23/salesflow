'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { useConversaoJf } from '@/hooks/use-conversao-jf';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

type SortKey = 'referencia' | 'produto' | 'subtipo' | 'fabricante' | 'custo_real' | 'preco_cobrado' | 'dias_vida' | 'data_entrada' | 'data_venda';

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Referência',    key: 'referencia' },
  { label: 'Produto',       key: 'produto' },
  { label: 'Subtipo',       key: 'subtipo' },
  { label: 'Fabricante',    key: 'fabricante' },
  { label: 'Custo Real',    key: 'custo_real' },
  { label: 'Preço Cobrado', key: 'preco_cobrado' },
  { label: 'Dias Vida',     key: 'dias_vida' },
  { label: 'Data Entrada',  key: 'data_entrada' },
  { label: 'Data Venda',    key: 'data_venda' },
];

export default function PainelConversaoJfPage() {
  const { from, to } = usePainelFilters();
  const { data, isLoading, isError, error } = useConversaoJf(from, to);

  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);
  const clearFilter = () => setSelectedProduto(null);

  const [sortKey, setSortKey] = useState<SortKey>('data_entrada');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    if (!selectedProduto) return data.rows;
    return data.rows.filter(r => (r.produto ?? '').toUpperCase() === selectedProduto.toUpperCase());
  }, [data, selectedProduto]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const kpi = data?.kpi;

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* KPI bar */}
          <div className="shrink-0 grid grid-cols-7 gap-3">
            {[
              { label: 'Quantidade Fabricada', value: String(kpi!.qtdFabricada) },
              { label: 'Quantidade Vendida',   value: String(kpi!.qtdVendida) },
              { label: 'Conversão',            value: fmtPct(kpi!.conversao) },
              { label: 'Média Vida',           value: kpi!.mediaVida > 0 ? `${kpi!.mediaVida.toFixed(1)} dias` : '—' },
              { label: 'Custo de Fabricação',  value: fmtBRL(kpi!.custoTotal) },
              { label: 'Arrecadação',          value: fmtBRL(kpi!.arrecadacao) },
              { label: 'Lucratividade',        value: fmtPct(kpi!.lucrat) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</span>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
              <div className="shrink-0 px-4 py-2.5 border-b border-zinc-200 dark:border-white/[0.08]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produto × Quantidade × Custo JF</span>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <HBarChart
                  data={data.porProdutoCusto.map(p => ({ name: p.name, value: p.custo, qty: p.qtd }))}
                  color="#6366f1"
                  formatter={fmtBRL}
                  fill
                  selected={selectedProduto}
                  onSelect={v => { if (selectedProduto === v) clearFilter(); else setSelectedProduto(v); }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
              <div className="shrink-0 px-4 py-2.5 border-b border-zinc-200 dark:border-white/[0.08]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Produto × Quantidade × Arrecadação JF</span>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <HBarChart
                  data={data.porProdutoArrecadacao.map(p => ({ name: p.name, value: p.arrecadacao, qty: p.qtd }))}
                  color="#10b981"
                  formatter={fmtBRL}
                  fill
                  selected={selectedProduto}
                  onSelect={v => { if (selectedProduto === v) clearFilter(); else setSelectedProduto(v); }}
                />
              </div>
            </div>
          </div>

          {/* Tabela detalhada */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr>
                  <th colSpan={9} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Detalhamento — {filteredRows.length} peças · {filteredRows.filter(r => r.preco_cobrado).length} vendidas
                      </span>
                      {selectedProduto && (
                        <button onClick={clearFilter} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold hover:bg-indigo-100 transition-colors">
                          {selectedProduto} <X size={10} />
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
                <tr>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                          : <ChevronsUpDown size={10} className="opacity-30" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.fabricante ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {r.preco_cobrado ? fmtBRL(r.preco_cobrado) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {r.dias_vida != null
                        ? <span className={r.dias_vida <= 30 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : r.dias_vida <= 90 ? 'text-zinc-700 dark:text-zinc-300' : 'text-amber-600 dark:text-amber-400'}>{r.dias_vida}d</span>
                        : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_entrada)}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRows.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma peça fabricada no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
