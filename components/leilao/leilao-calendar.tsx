'use client';

import { useMemo, useState } from 'react';
import {
  format, getDay, parseISO, isBefore, isAfter,
  startOfWeek, endOfWeek,
  eachDayOfInterval, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Leilao } from '@/lib/hooks/use-leiloes';

interface Props {
  leiloes:  Leilao[];
  onAdd:    (date?: string) => void;
  onEdit:   (leilao: Leilao) => void;
  onUpdate: (leilao: Leilao) => void;
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function buildWeeks(year: number, month: number): Date[][] {
  const monthStart = new Date(year, month, 1);
  const monthEnd  = new Date(year, month + 1, 0);
  const calStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd    = endOfWeek(monthEnd,     { weekStartsOn: 0 });
  const days      = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

interface EventSegment {
  leilao:          Leilao;
  colStart:        number; // 1-indexed CSS grid column start
  colEnd:          number; // exclusive CSS grid column end
  continuesBefore: boolean;
  continuesAfter:  boolean;
}

function getSegments(week: Date[], leiloes: Leilao[]): EventSegment[] {
  const weekStart = week[0];
  const weekEnd   = week[6];
  const segments: EventSegment[] = [];

  for (const l of leiloes) {
    const start = parseISO(l.dataInicio);
    const end   = parseISO(l.dataFim);
    if (isBefore(weekEnd, start) || isBefore(end, weekStart)) continue;
    const clippedStart = isBefore(start, weekStart) ? weekStart : start;
    const clippedEnd   = isAfter(end,   weekEnd)    ? weekEnd   : end;
    segments.push({
      leilao:          l,
      colStart:        getDay(clippedStart) + 1,
      colEnd:          getDay(clippedEnd)   + 2,
      continuesBefore: isBefore(start, weekStart),
      continuesAfter:  isAfter(end,   weekEnd),
    });
  }

  return segments.sort((a, b) => a.colStart - b.colStart);
}

export function LeilaoCalendar({ leiloes, onAdd, onEdit, onUpdate }: Props) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    const comCodigo = leiloes.filter(l => l.codigoPlatforma?.trim());
    if (comCodigo.length === 0) { toast.error('Nenhum leilão com código da plataforma'); return; }

    setSyncing(true);
    let ok = 0, fail = 0;

    await Promise.all(comCodigo.map(async l => {
      try {
        const params = new URLSearchParams({ leilao: l.codigoPlatforma, nome: l.nome });
        const res  = await fetch(`/api/leilao/sync-ficha?${params}`);
        const data = await res.json() as { status?: string; dataInicio?: string; dataFim?: string; error?: string };
        if (data.error) { fail++; return; }
        const patch: Partial<Leilao> = {};
        if (data.status    && data.status    !== l.status)    patch.status    = data.status    as Leilao['status'];
        if (data.dataInicio && data.dataInicio !== l.dataInicio) patch.dataInicio = data.dataInicio;
        if (data.dataFim    && data.dataFim    !== l.dataFim)   patch.dataFim   = data.dataFim;
        if (Object.keys(patch).length > 0) onUpdate({ ...l, ...patch });
        ok++;
      } catch { fail++; }
    }));

    setSyncing(false);
    if (fail === 0) toast.success(`${ok} leilão${ok !== 1 ? 'es' : ''} sincronizado${ok !== 1 ? 's' : ''}`);
    else            toast.warning(`${ok} sincronizados, ${fail} com erro`);
  }

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);

  // Upcoming leiloes list (next 60 days)
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 60);
    return [...leiloes]
      .filter(l => {
        const start = parseISO(l.dataInicio);
        return !isBefore(parseISO(l.dataFim), today) && !isAfter(start, horizon);
      })
      .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  }, [leiloes]);

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday()   {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button
            onClick={goToday}
            className="px-2.5 py-0.5 text-xs font-medium rounded border border-zinc-200 dark:border-white/[0.12] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            Hoje
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-500 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-white/[0.12] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sincronizar
          </button>
          <button
            onClick={() => onAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Novo Leilão
          </button>
        </div>
      </div>

      {/* ── Main area: calendar + sidebar ───────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Calendar grid ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 border border-zinc-200 dark:border-white/[0.10] rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b-2 border-zinc-200 dark:border-white/[0.10] bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
            {WEEK_DAYS.map((d, i) => (
              <div
                key={d}
                className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider ${
                  i === 0 || i === 6 ? 'text-rose-400' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex-1 flex flex-col divide-y divide-zinc-200 dark:divide-white/[0.08] overflow-auto">
            {weeks.map((week, wi) => {
              const segments = getSegments(week, leiloes);
              return (
                <div key={wi} className="flex-1 flex flex-col min-h-[90px] relative">
                  {/* Vertical column lines — hide dividers inside event spans */}
                  {(() => {
                    const hidden = new Set<number>();
                    segments.forEach(seg => {
                      for (let i = seg.colStart; i <= seg.colEnd - 2; i++) hidden.add(i);
                    });
                    return [1,2,3,4,5,6].map(i => hidden.has(i) ? null : (
                      <div
                        key={i}
                        className="absolute inset-y-0 border-r border-zinc-200 dark:border-white/[0.06] pointer-events-none"
                        style={{ left: `${(i / 7) * 100}%` }}
                      />
                    ));
                  })()}
                  {/* Day number row */}
                  <div className="grid grid-cols-7">
                    {week.map((day, di) => {
                      const inMonth  = day.getMonth() === month;
                      const today    = isToday(day);
                      const weekend  = di === 0 || di === 6;
                      return (
                        <div
                          key={di}
                          onClick={() => onAdd(format(day, 'yyyy-MM-dd'))}
                          className={`group py-1 px-2 cursor-pointer select-none ${
                            weekend ? 'bg-rose-50/60 dark:bg-rose-950/10' : ''
                          } ${!inMonth ? 'opacity-35' : ''}`}
                        >
                          <span
                            className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-medium transition-colors ${
                              today
                                ? 'bg-indigo-600 text-white'
                                : weekend
                                ? 'text-rose-500 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-950/30'
                                : 'text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-100 dark:group-hover:bg-white/[0.06]'
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Event bars */}
                  {segments.length > 0 && (
                    <div
                      className="grid grid-cols-7 px-0.5 pb-2 gap-y-1"
                      style={{ gridAutoRows: '30px' }}
                    >
                      {segments.map((seg, si) => {
                        const br = seg.continuesBefore && seg.continuesAfter ? '0'
                          : seg.continuesBefore ? '0 8px 8px 0'
                          : seg.continuesAfter  ? '8px 0 0 8px'
                          : '8px';
                        return (
                          <button
                            key={`${seg.leilao.id}-${si}`}
                            onClick={e => { e.stopPropagation(); onEdit(seg.leilao); }}
                            className="flex items-center px-3 text-white text-[12px] font-bold truncate h-[28px] hover:brightness-110 transition-all shadow-sm"
                            style={{
                              gridColumn:  `${seg.colStart} / ${seg.colEnd}`,
                              background:  seg.leilao.cor,
                              borderRadius: br,
                            }}
                          >
                            {!seg.continuesBefore && (
                              <span className="truncate flex items-center gap-1.5">
                                <span className="font-bold">N°{seg.leilao.codigoPlatforma || '—'}</span>
                                <span className="opacity-70 text-[11px]">#{seg.leilao.numero}</span>
                                <span>{seg.leilao.nome}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Upcoming sidebar ────────────────────────────────── */}
        <div className="w-56 shrink-0 flex flex-col border border-zinc-200 dark:border-white/[0.08] rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-white/[0.08]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Próximos 60 dias</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
                <p className="text-xs text-zinc-400">Nenhum leilão próximo</p>
                <button
                  onClick={() => onAdd()}
                  className="text-xs text-indigo-500 hover:underline"
                >
                  Adicionar
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                {(() => {
                  const groups: { monthKey: string; label: string; items: typeof upcoming }[] = [];
                  for (const l of upcoming) {
                    const start    = parseISO(l.dataInicio);
                    const monthKey = format(start, 'yyyy-MM');
                    const label    = format(start, 'MMMM yyyy', { locale: ptBR });
                    const last     = groups[groups.length - 1];
                    if (!last || last.monthKey !== monthKey) groups.push({ monthKey, label, items: [l] });
                    else last.items.push(l);
                  }
                  return groups.map(group => (
                    <div key={group.monthKey}>
                      <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 border-y border-zinc-100 dark:border-white/[0.05]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 capitalize">
                          {group.label}
                        </span>
                      </div>
                      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.04]">
                        {group.items.map(l => {
                          const start = parseISO(l.dataInicio);
                          const end   = parseISO(l.dataFim);
                          const days  = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
                          return (
                            <button
                              key={l.id}
                              onClick={() => onEdit(l)}
                              className="flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                            >
                              <span
                                className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ background: l.cor }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                  N° {l.codigoPlatforma || '—'}
                                </p>
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                  #{l.numero} · {l.nome}
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">
                                  {format(start, "dd/MM")} → {format(end, "dd/MM")}
                                  <span className="ml-1 text-zinc-300 dark:text-zinc-600">({days}d)</span>
                                </p>
                                {l.observacao && (
                                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{l.observacao}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
