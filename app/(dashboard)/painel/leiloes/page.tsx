'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas, type PainelDetailRow } from '@/hooks/use-painel-vendas';
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

const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

type SortKey = 'leilao' | 'referencia' | 'produto' | 'subtipo' | 'tipo' | 'custo_real' | 'preco_cobrado' | 'tipo_pedra' | 'lucrat' | 'data_venda';

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Leilão',        key: 'leilao' },
  { label: 'Referência',    key: 'referencia' },
  { label: 'Produto',       key: 'produto' },
  { label: 'Subtipo',       key: 'subtipo' },
  { label: 'Tipo',          key: 'tipo' },
  { label: 'Custo Real',    key: 'custo_real' },
  { label: 'Preço Cobrado', key: 'preco_cobrado' },
  { label: 'Tipo Pedra',    key: 'tipo_pedra' },
  { label: 'Lucrat.',       key: 'lucrat' },
  { label: 'Data Venda',    key: 'data_venda' },
];

interface KpiCellProps { label: string; value: string; border?: boolean; }
function KpiCell({ label, value, border = true }: KpiCellProps) {
  return (
    <div className={`flex flex-col justify-center gap-0.5 px-4 py-2.5 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
    </div>
  );
}

type DetailRow = PainelDetailRow & { leilao: string };

export default function PainelLeiloesPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from, to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const [selectedLeilao, setSelectedLeilao] = useState<string | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('data_venda');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredRows = useMemo((): DetailRow[] => {
    if (!data) return [];
    return data.leiloes.flatMap(l => {
      const nomeCurto = l.nome.replace('LEILÃO ', '');
      if (selectedLeilao && nomeCurto !== selectedLeilao) return [];
      return l.rows
        .filter(r => !selectedProduto || r.produto === selectedProduto)
        .map(r => ({ ...r, leilao: nomeCurto }));
    });
  }, [data, selectedLeilao, selectedProduto]);

  const sortedRows = useMemo((): DetailRow[] => {
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey as keyof DetailRow] ?? '';
      const bv = b[sortKey as keyof DetailRow] ?? '';
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const clearFilter = () => { setSelectedLeilao(null); setSelectedProduto(null); };

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
        data.leiloes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">
            Nenhuma venda em leilão no período selecionado.
          </div>
        ) : (
          <>
            {/* Charts — mesma altura, fill */}
            <div className={`flex-1 min-h-0 grid gap-3 ${data.leiloes.length === 1 ? 'grid-cols-1' : data.leiloes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {data.leiloes.map(leilao => {
                const nonScrap = leilao.byProduto.filter(p => p.name !== 'SCRAP');
                const scrap = leilao.byProduto.find(p => p.name === 'SCRAP');
                const nomeCurto = leilao.nome.replace('LEILÃO ', '');
                const isActive = selectedLeilao === nomeCurto;

                return (
                  <div key={leilao.nome} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden flex flex-col transition-colors ${isActive ? 'border-purple-400 dark:border-purple-500' : 'border-zinc-200 dark:border-white/[0.08]'}`}>
                    {/* KPI header */}
                    <div className="shrink-0 grid divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08]"
                      style={{ gridTemplateColumns: '100px repeat(5, 1fr)' }}>
                      <div className="flex flex-col justify-center px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Leilão</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{nomeCurto}</span>
                      </div>
                      <KpiCell label="Faturamento"   value={fmtBRL(leilao.faturamento)} />
                      <KpiCell label="Qtd"           value={String(leilao.qtd)} />
                      <KpiCell label="Lucrat."       value={fmtPct(leilao.lucrat)} />
                      <KpiCell label="TM Fabricado"  value={leilao.tmJF > 0 ? fmtBRL(leilao.tmJF) : '—'} />
                      <KpiCell label="TM Revenda"    value={leilao.tmRevenda > 0 ? fmtBRL(leilao.tmRevenda) : '—'} border={false} />
                    </div>

                    {/* Scrap */}
                    {scrap && (
                      <div className="shrink-0 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/[0.06] border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Scrap</span>
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">{fmtBRL(scrap.faturamento)}</span>
                        <span className="text-[10px] text-amber-500">· {scrap.qtd} un</span>
                      </div>
                    )}

                    {/* Chart fill */}
                    <div className="flex-1 min-h-0 p-3 pb-2 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 shrink-0">Por Produto</p>
                      <div className="flex-1 min-h-0">
                        <HBarChart
                          data={nonScrap.map(p => ({ name: p.name, value: p.faturamento, qty: p.qtd }))}
                          color="#a855f7"
                          formatter={fmtBRL}
                          fill
                          selected={isActive ? selectedProduto : null}
                          onSelect={v => {
                            if (selectedLeilao === nomeCurto && selectedProduto === v) {
                              clearFilter();
                            } else {
                              setSelectedLeilao(nomeCurto);
                              setSelectedProduto(v);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabela única — sticky, padrão do painel */}
            <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th colSpan={10} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          Detalhamento — {filteredRows.length} vendas
                        </span>
                        {(selectedLeilao || selectedProduto) && (
                          <button
                            onClick={clearFilter}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold hover:bg-purple-100 transition-colors"
                          >
                            {selectedLeilao}{selectedProduto ? ` — ${selectedProduto}` : ''} ×
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
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-semibold">{r.leilao}</td>
                      <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.referencia}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo] ?? TIPO_CLASS.JR}`}>
                          {r.tipo}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.preco_cobrado)}</td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                        <span className={r.lucrat >= 40 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : r.lucrat >= 0 ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-500'}>
                          {r.lucrat.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_venda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedRows.length === 0 && (
                <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma venda no período.</div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}
