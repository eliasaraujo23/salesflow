'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { Leilao } from '@/lib/hooks/use-leiloes';
import type { Lance } from '@/lib/hooks/use-leilao-lances';

interface Props {
  leiloes: Leilao[];
}

type SortKey = 'lote' | 'nome' | 'valor' | 'data' | 'status';
type SortDir = 'asc' | 'desc';

const COLS: { key: SortKey; label: string }[] = [
  { key: 'lote',   label: 'Lote'        },
  { key: 'nome',   label: 'Arrematante' },
  { key: 'data',   label: 'Data'        },
  { key: 'status', label: 'Status'      },
  { key: 'valor',  label: 'Lance'       },
];

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(s: string) {
  if (!s) return '—';
  const [date, time] = s.split('-');
  const [d, m] = (date ?? '').split('/');
  const hm = (time ?? '').slice(0, 5);
  return `${d}/${m} ${hm}`;
}

async function fetchLancesApi(leilao: string, nome: string): Promise<Lance[]> {
  const params = new URLSearchParams({ leilao, nome });
  const res  = await fetch(`/api/leilao/lances?${params}`);
  const data = await res.json() as { lances?: Lance[]; error?: string };
  if (data.error) throw new Error(data.error);
  return data.lances ?? [];
}

// ─── Card de resumo por leilão ────────────────────────────────────────────────

interface ResumoCardProps {
  leilao:   Leilao;
  selected: boolean;
  onClick:  () => void;
}

function ResumoCard({ leilao, selected, onClick }: ResumoCardProps) {
  const [lances,  setLances]  = useState<Lance[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const data = await fetchLancesApi(leilao.codigoPlatforma, leilao.nome);
      setLances(data);
    } catch { setError(true); }
    finally  { setLoading(false); }
  }, [leilao.codigoPlatforma, leilao.nome]);

  useEffect(() => { load(); }, [load]);

  const vencendoRows = lances?.filter(r => r.status.toLowerCase().includes('vencendo')) ?? [];
  const volume       = vencendoRows.reduce((s, r) => s + r.valor, 0);
  const lotes        = new Set(lances?.map(r => r.lote) ?? []).size;
  const vencendo     = vencendoRows.length;

  return (
    <button
      onClick={onClick}
      className={[
        'text-left rounded-xl border p-4 flex flex-col gap-3 transition-all',
        selected
          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 shadow-sm'
          : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/[0.15]',
      ].join(' ')}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: leilao.cor }} />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 truncate">
              N°{leilao.codigoPlatforma} · #{leilao.numero}
            </p>
            <p className="text-[10px] text-zinc-400 truncate">{leilao.nome}</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); load(); }}
          disabled={loading}
          className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Métricas */}
      {loading && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Loader2 size={10} className="animate-spin" /> Carregando...
        </div>
      )}
      {error && !loading && (
        <p className="text-[10px] text-red-400">Erro ao carregar</p>
      )}
      {!loading && !error && lances !== null && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] text-zinc-400 uppercase tracking-wide">Lotes</p>
            <p className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{lotes}</p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-400 uppercase tracking-wide">Vencendo</p>
            <p className={`text-sm font-bold tabular-nums ${vencendo > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
              {vencendo}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-400 uppercase tracking-wide">Vol. vencendo</p>
            <p className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{fmtBRL(volume)}</p>
          </div>
        </div>
      )}
      {!loading && !error && lances?.length === 0 && (
        <p className="text-[10px] text-zinc-400">Sem lances ainda</p>
      )}
    </button>
  );
}

// ─── Painel principal ─────────────────────────────────────────────────────────

export function LancesPanel({ leiloes }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [lances,     setLances]     = useState<Lance[]>([]);
  const [phase,      setPhase]      = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errMsg,     setErrMsg]     = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('lote');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search,  setSearch]  = useState('');

  const selected = leiloes.find(l => l.id === selectedId);

  async function loadDetalhe(leilao: Leilao) {
    setPhase('loading'); setLances([]); setErrMsg('');
    try {
      const data = await fetchLancesApi(leilao.codigoPlatforma, leilao.nome);
      setLances(data); setPhase('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Erro');
      setPhase('error');
    }
  }

  function handleCardClick(id: string) {
    const leilao = leiloes.find(l => l.id === id);
    if (!leilao) return;
    setSelectedId(id);
    setSearch('');
    loadDetalhe(leilao);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    let rows = lances;
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
  }, [lances, search, sortKey, sortDir]);

  const totalLances    = filtered.length;
  const vencendoFilt   = filtered.filter(r => r.status.toLowerCase().includes('vencendo'));
  const totalVol       = vencendoFilt.reduce((s, r) => s + r.valor, 0);
  const vencendo       = vencendoFilt.length;
  const uniqueLotes    = new Set(filtered.map(r => r.lote)).size;

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown size={10} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Lances</h2>
        <p className="text-[11px] text-zinc-400">Resumo por leilão — clique para ver os detalhes</p>
      </div>

      {/* Cards de resumo — excluir finalizados, agrupar por casa, ordem cronológica */}
      {(() => {
        const ativos = leiloes
          .filter(l => l.status !== 'finalizado')
          .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

        if (ativos.length === 0) return (
          <div className="flex flex-col items-center gap-2 py-10 text-zinc-400">
            <TrendingUp size={28} className="opacity-30" />
            <p className="text-xs">Nenhum leilão ativo</p>
          </div>
        );

        const grupos: { label: string; items: Leilao[] }[] = [];
        const eternno = ativos.filter(l => l.nome.toUpperCase().startsWith('ETERNNO'));
        const bruno   = ativos.filter(l => l.nome.toUpperCase().startsWith('BRUNO'));
        const outros  = ativos.filter(l => !l.nome.toUpperCase().startsWith('ETERNNO') && !l.nome.toUpperCase().startsWith('BRUNO'));
        if (eternno.length) grupos.push({ label: 'Eternno', items: eternno });
        if (bruno.length)   grupos.push({ label: 'Bruno Araújo', items: bruno });
        if (outros.length)  grupos.push({ label: 'Outros', items: outros });

        return (
          <div className="flex flex-col gap-4">
            {grupos.map(grupo => (
              <div key={grupo.label} className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{grupo.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {grupo.items.map(l => (
                    <ResumoCard
                      key={l.id}
                      leilao={l}
                      selected={selectedId === l.id}
                      onClick={() => handleCardClick(l.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Detalhe do leilão selecionado */}
      {selectedId && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex-1">
              {selected?.nome} — detalhes
            </p>
            <button
              onClick={() => selected && loadDetalhe(selected)}
              disabled={phase === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] disabled:opacity-40 transition-colors"
            >
              {phase === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Atualizar
            </button>
            {phase === 'done' && (
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar lote, nome..."
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 transition-colors w-44"
              />
            )}
          </div>

          {phase === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 py-6 justify-center">
              <Loader2 size={13} className="animate-spin text-indigo-500" />
              Buscando lances...
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="shrink-0" />
              {errMsg}
            </div>
          )}

          {phase === 'done' && lances.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-6">Nenhum lance encontrado</p>
          )}

          {phase === 'done' && filtered.length > 0 && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Lotes',          value: uniqueLotes },
                  { label: 'Lances',         value: totalLances },
                  { label: 'Vencendo',       value: vencendo, highlight: true },
                  { label: 'Vol. vencendo',  value: fmtBRL(totalVol) },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-4 py-3 flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wide">{k.label}</span>
                    <span className={`text-base font-bold tabular-nums ${k.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
                      {k.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tabela */}
              <div className="overflow-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl">
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
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] font-bold tabular-nums text-zinc-700 dark:text-zinc-200">{r.lote}</td>
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{r.nome || '—'}</td>
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] text-zinc-500 whitespace-nowrap tabular-nums">{fmtData(r.data)}</td>
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04]">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isVencendo
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-500'
                            }`}>
                              {r.status || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] font-semibold tabular-nums text-zinc-800 dark:text-zinc-100 whitespace-nowrap">{fmtBRL(r.valor)}</td>
                          <td className="px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] tabular-nums text-zinc-500 whitespace-nowrap">{r.valorContrato ? fmtBRL(r.valorContrato) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
