'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { useCadastroJoias } from '@/hooks/use-cadastro-joias';
import { HBarChart } from '@/components/painel/h-bar-chart';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.substring(0, 10).split('-');
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const TIPO_COLOR: Record<string, string> = {
  JF: '#6366f1', JM: '#a855f7', JR: '#10b981', JC: '#f59e0b',
};
const TIPO_HEADER: Record<string, string> = {
  JF: 'bg-indigo-600 text-white',
  JM: 'bg-purple-600 text-white',
  JR: 'bg-emerald-600 text-white',
  JC: 'bg-amber-500 text-white',
};
const TIPO_LABEL: Record<string, string> = {
  JF: 'Joias Fabricadas — JF',
  JM: 'Joias Modificadas — JM',
  JR: 'Joias Revenda — JR',
  JC: 'Joias Consignadas — JC',
};
const TIPO_CLASS: Record<string, string> = {
  JF: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  JM: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
  JC: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  JR: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

type SortKey = 'referencia' | 'tipo' | 'produto' | 'subtipo' | 'tipo_pedra' | 'peso' | 'custo_real' | 'data_entrada';

const COLS: { label: string; key: SortKey }[] = [
  { label: 'Referência',  key: 'referencia' },
  { label: 'Tipo',        key: 'tipo' },
  { label: 'Produto',     key: 'produto' },
  { label: 'Subtipo',     key: 'subtipo' },
  { label: 'Tipo Pedra',  key: 'tipo_pedra' },
  { label: 'Peso',        key: 'peso' },
  { label: 'Custo Real',  key: 'custo_real' },
  { label: 'Data Entrada', key: 'data_entrada' },
];

export default function PainelCadastradasPage() {
  const { from, to } = usePainelFilters();
  const { data, isLoading, isError, error } = useCadastroJoias(from, to);

  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);

  function clearFilter() { setSelectedTipo(null); setSelectedProduto(null); }

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => {
      if (selectedTipo && r.tipo !== selectedTipo) return false;
      if (selectedProduto && (r.produto ?? r.subtipo ?? '').toUpperCase() !== selectedProduto) return false;
      return true;
    });
  }, [data, selectedTipo, selectedProduto]);

  const [sortKey, setSortKey] = useState<SortKey>('data_entrada');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

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

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">

      {data && !isLoading && (
        <div className="shrink-0 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
          <div className="px-4 py-2 bg-zinc-900 dark:bg-zinc-800 text-white">
            <span className="text-xs font-bold uppercase tracking-widest">Total do Período</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-white/[0.08]">
            {[
              { label: 'Qtd Cadastrada', value: String(data.total.qtd) },
              { label: 'Custo Total',    value: fmtBRL(data.total.custo) },
              { label: 'Peso Total',     value: `${data.total.peso.toFixed(2)}g` },
            ].map(k => (
              <div key={k.label} className="flex flex-col gap-0.5 px-4 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {/* Cards por tipo */}
          <div className="flex-1 min-h-0 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(data.porTipo.length, 1)}, 1fr)` }}>
            {data.porTipo.map(t => (
              <div key={t.tipo} className={`bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden flex flex-col transition-colors ${selectedTipo === t.tipo ? 'border-indigo-400 dark:border-indigo-500' : 'border-zinc-200 dark:border-white/[0.08]'}`}>
                <div className={`${TIPO_HEADER[t.tipo] ?? 'bg-zinc-600 text-white'} px-4 py-2 shrink-0`}>
                  <span className="text-xs font-bold uppercase tracking-widest">{TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-white/[0.08] border-b border-zinc-200 dark:border-white/[0.08] shrink-0">
                  <div className="px-3 py-2 flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Qtd</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{t.qtd}</span>
                  </div>
                  <div className="px-3 py-2 flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Custo Total</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{fmtBRL(t.custo)}</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0 p-3">
                  <HBarChart
                    data={t.porProduto.map(p => ({ name: p.name, value: p.custo, qty: p.qtd }))}
                    color={TIPO_COLOR[t.tipo] ?? '#6366f1'}
                    formatter={fmtBRL}
                    fill
                    selected={selectedTipo === t.tipo ? selectedProduto : null}
                    onSelect={v => {
                      if (selectedTipo === t.tipo && selectedProduto === v) {
                        clearFilter();
                      } else {
                        setSelectedTipo(t.tipo);
                        setSelectedProduto(v);
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Tabela detalhada */}
          <div className="shrink-0 h-56 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-xs border-separate border-spacing-0 data-table">
              <thead>
                <tr>
                  <th colSpan={8} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08] text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        Joias Cadastradas — {filteredRows.length} peças
                      </span>
                      {(selectedTipo || selectedProduto) && (
                        <button
                          onClick={clearFilter}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${TIPO_CLASS[selectedTipo ?? ''] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'} hover:opacity-80`}
                        >
                          {selectedTipo ? (TIPO_LABEL[selectedTipo] ?? selectedTipo) : ''}{selectedProduto ? ` — ${selectedProduto}` : ''} ×
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
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TIPO_CLASS[r.tipo ?? ''] ?? TIPO_CLASS.JR}`}>{r.tipo ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{r.produto ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.subtipo ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.tipo_pedra ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.peso > 0 ? `${r.peso}g` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{fmtBRL(r.custo_real)}</td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{fmtDate(r.data_entrada)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedRows.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">Nenhuma joia cadastrada no período.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
