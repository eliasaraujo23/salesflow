'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, Loader2, AlertTriangle, TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import { useLeilaoLances } from '@/lib/hooks/use-leilao-lances';
import type { Lance } from '@/lib/hooks/use-leilao-lances';

interface Props {
  leiloes: Leilao[];
}

type SortKey = 'lote' | 'nome' | 'valor' | 'data' | 'status';
type SortDir = 'asc' | 'desc';

const COLS: { key: SortKey; label: string }[] = [
  { key: 'lote',   label: 'Lote'       },
  { key: 'nome',   label: 'Arrematante'},
  { key: 'data',   label: 'Data'       },
  { key: 'status', label: 'Status'     },
  { key: 'valor',  label: 'Lance'      },
];

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(s: string) {
  // "08/08/2026-02:47:18" → "08/08 02:47"
  if (!s) return '—';
  const [date, time] = s.split('-');
  const [d, m] = (date ?? '').split('/');
  const hm = (time ?? '').slice(0, 5);
  return `${d}/${m} ${hm}`;
}

export function LancesPanel({ leiloes }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const { state, fetch: fetchLances, reset } = useLeilaoLances();

  const [sortKey, setSortKey] = useState<SortKey>('lote');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search,  setSearch]  = useState('');

  const selected = leiloes.find(l => l.id === selectedId);

  function handleSelect(id: string) {
    setSelectedId(id);
    reset();
    const leilao = leiloes.find(l => l.id === id);
    if (leilao?.codigoPlatforma && leilao.nome) {
      fetchLances(leilao.codigoPlatforma, leilao.nome);
    }
  }

  function handleRefresh() {
    if (selected?.codigoPlatforma && selected.nome) {
      fetchLances(selected.codigoPlatforma, selected.nome);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    let rows = state.lances;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        String(r.lote).includes(q) ||
        r.nome.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortKey) {
        case 'lote':   va = a.lote;   vb = b.lote;   break;
        case 'nome':   va = a.nome;   vb = b.nome;    break;
        case 'data':   va = a.data;   vb = b.data;    break;
        case 'status': va = a.status; vb = b.status;  break;
        case 'valor':  va = a.valor;  vb = b.valor;   break;
      }
      const cmp = typeof va === 'number' ? va - (vb as number) : (va as string).localeCompare(vb as string, 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [state.lances, search, sortKey, sortDir]);

  // Totais
  const totalLances    = filtered.length;
  const totalValor     = filtered.reduce((s, r) => s + r.valor, 0);
  const vencendo       = filtered.filter(r => r.status.toLowerCase().includes('vencendo')).length;
  const uniqueLotes    = new Set(filtered.map(r => r.lote)).size;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={10} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Lances</h2>
        <p className="text-[11px] text-zinc-400">Acompanhe os lances em tempo real diretamente do leiloesbr</p>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedId}
          onChange={e => handleSelect(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 transition-colors"
        >
          <option value="">— Selecionar leilão —</option>
          {leiloes.map(l => (
            <option key={l.id} value={l.id}>
              N°{l.codigoPlatforma} · #{l.numero} · {l.nome}
            </option>
          ))}
        </select>

        {selected && (
          <button
            onClick={handleRefresh}
            disabled={state.phase === 'loading'}
            title="Atualizar lances"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
          >
            {state.phase === 'loading'
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />}
            Atualizar
          </button>
        )}

        {state.phase === 'done' && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lote, nome..."
            className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 transition-colors w-48"
          />
        )}
      </div>

      {/* Estado: loading */}
      {state.phase === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 py-8 justify-center">
          <Loader2 size={14} className="animate-spin text-indigo-500" />
          Buscando lances no leiloesbr...
        </div>
      )}

      {/* Estado: erro */}
      {state.phase === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {state.error}
        </div>
      )}

      {/* Estado: vazio após busca */}
      {state.phase === 'done' && state.lances.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
          <TrendingUp size={28} className="opacity-30" />
          <p className="text-xs">Nenhum lance encontrado para este leilão</p>
        </div>
      )}

      {/* KPIs */}
      {state.phase === 'done' && state.lances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Lotes com lance', value: uniqueLotes },
            { label: 'Total de lances', value: totalLances },
            { label: 'Vencendo',        value: vencendo, highlight: true },
            { label: 'Volume total',    value: fmtBRL(totalValor) },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-4 py-3 flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">{k.label}</span>
              <span className={`text-lg font-bold tabular-nums ${k.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                {k.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabela */}
      {state.phase === 'done' && filtered.length > 0 && (
        <div className="shrink-0 overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
          <table className="w-full text-xs border-separate border-spacing-0 data-table">
            <thead>
              <tr>
                <th colSpan={COLS.length + 1} className="sticky top-0 z-20 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] text-left font-semibold text-zinc-700 dark:text-zinc-200">
                  {totalLances} lance{totalLances !== 1 ? 's' : ''} · {uniqueLotes} lote{uniqueLotes !== 1 ? 's' : ''}
                  {search && <span className="text-zinc-400 font-normal ml-1">· filtrado</span>}
                </th>
              </tr>
              <tr>
                {COLS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] font-semibold text-zinc-500 cursor-pointer select-none whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
                <th className="sticky top-[41px] z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] font-semibold text-zinc-500">
                  Contrato
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isVencendo = r.status.toLowerCase().includes('vencendo');
                return (
                  <tr key={`${r.lote}-${i}`} className={isVencendo ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                      {r.lote}
                    </td>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">
                      {r.nome || '—'}
                    </td>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-500 whitespace-nowrap tabular-nums">
                      {fmtData(r.data)}
                    </td>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04]">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isVencendo
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500'
                      }`}>
                        {r.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] font-semibold tabular-nums text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                      {fmtBRL(r.valor)}
                    </td>
                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums text-zinc-500 whitespace-nowrap">
                      {r.valorContrato ? fmtBRL(r.valorContrato) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Idle */}
      {state.phase === 'idle' && !selectedId && (
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-400">
          <TrendingUp size={28} className="opacity-30" />
          <p className="text-xs">Selecione um leilão para ver os lances</p>
        </div>
      )}
    </div>
  );
}
