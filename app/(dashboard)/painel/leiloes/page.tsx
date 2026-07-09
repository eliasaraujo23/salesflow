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

type SortKey = 'referencia' | 'produto' | 'subtipo' | 'tipo' | 'custo_real' | 'preco_cobrado' | 'tipo_pedra' | 'lucrat' | 'data_venda';

const COLS: { label: string; key: SortKey }[] = [
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
    <div className={`flex flex-col justify-center gap-0.5 px-4 py-3 ${border ? 'border-r border-zinc-200 dark:border-white/[0.08]' : ''}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums truncate">{value}</span>
    </div>
  );
}

interface LeilaoCardProps {
  nome: string;
  faturamento: number;
  qtd: number;
  lucrat: number;
  tmJF: number;
  tmRevenda: number;
  byProduto: { name: string; faturamento: number; qtd: number }[];
  rows: PainelDetailRow[];
}

function LeilaoCard({ nome, faturamento, qtd, lucrat, tmJF, tmRevenda, byProduto, rows }: LeilaoCardProps) {
  const nonScrap = byProduto.filter(p => p.name !== 'SCRAP');
  const scrap = byProduto.find(p => p.name === 'SCRAP');

  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('data_venda');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredRows = useMemo(() => {
    if (!selectedProduto) return rows;
    return rows.filter(r => r.produto === selectedProduto || r.subtipo === selectedProduto);
  }, [rows, selectedProduto]);

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

  const chartData = nonScrap.map(p => ({ name: p.name, value: p.faturamento, qty: p.qtd }));

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden flex flex-col">
      {/* KPI header */}
      <div className="shrink-0 grid divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08]" style={{ gridTemplateColumns: '120px repeat(5, 1fr)' }}>
        <div className="flex flex-col justify-center px-4 py-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Leilão</span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {nome.replace('LEILÃO ', '')}
          </span>
        </div>
        <KpiCell label="Faturamento"   value={fmtBRL(faturamento)} />
        <KpiCell label="Qtd"           value={String(qtd)} />
        <KpiCell label="Lucratividade" value={fmtPct(lucrat)} />
        <KpiCell label="TM Fabricado"  value={tmJF > 0 ? fmtBRL(tmJF) : '—'} />
        <KpiCell label="TM Revenda"    value={tmRevenda > 0 ? fmtBRL(tmRevenda) : '—'} border={false} />
      </div>

      {/* Scrap destaque */}
      {scrap && (
        <div className="shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-500/[0.06] border-b border-amber-200 dark:border-amber-500/20 flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Scrap</span>
          <span className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">{fmtBRL(scrap.faturamento)}</span>
          <span className="text-xs text-amber-500 dark:text-amber-400">· {scrap.qtd} un</span>
        </div>
      )}

      {/* Chart — fill adaptativo */}
      <div className="shrink-0 p-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Por Produto</p>
        <HBarChart
          data={chartData}
          color="#a855f7"
          formatter={fmtBRL}
          selected={selectedProduto}
          onSelect={setSelectedProduto}
        />
      </div>

      {/* Tabela de detalhamento — padrão sticky */}
      <div className="shrink-0 overflow-auto border-t border-zinc-200 dark:border-white/[0.08]" style={{ maxHeight: '280px' }}>
        <table className="w-full text-xs border-separate border-spacing-0">
          <thead>
            <tr>
              <th colSpan={9} className="sticky top-0 z-20 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Detalhamento — {filteredRows.length} vendas
                  </span>
                  {selectedProduto && (
                    <button
                      onClick={() => setSelectedProduto(null)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors"
                    >
                      {selectedProduto} ×
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
                  className="sticky top-[37px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
        {rows.length === 0 && (
          <div className="text-center py-8 text-zinc-400 text-sm">Nenhuma venda no período.</div>
        )}
      </div>
    </div>
  );
}

export default function PainelLeiloesPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 items-start">
              {data.leiloes.map(leilao => (
                <LeilaoCard key={leilao.nome} {...leilao} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
