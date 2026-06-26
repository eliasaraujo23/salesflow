'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange } from 'react-day-picker';
import { pt } from 'date-fns/locale';

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function fmtDisplay(iso: string): string {
  const d = parseISO(iso);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function fmtInput(iso: string): string {
  const d = parseISO(iso);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function inputToISO(txt: string): string | null {
  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

interface Props {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}

export function ResaleDatePicker({ from, to, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseISO(from),
    to: parseISO(to),
  });
  const [startText, setStartText] = useState(fmtInput(from));
  const [endText, setEndText]     = useState(fmtInput(to));
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultMonth = parseISO(from) ?? new Date();

  useEffect(() => {
    setRange({ from: parseISO(from), to: parseISO(to) });
    setStartText(fmtInput(from));
    setEndText(fmtInput(to));
  }, [from, to]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  function handleSelect(r: DateRange | undefined) {
    setRange(r);
    if (r?.from) setStartText(fmtInput(toISO(r.from)));
    if (r?.to)   setEndText(fmtInput(toISO(r.to)));
    else if (r?.from && !r?.to) setEndText('');
  }

  function handleStartBlur() {
    const iso = inputToISO(startText);
    if (iso) setRange(r => ({ from: parseISO(iso), to: r?.to }));
    else setStartText(fmtInput(from));
  }

  function handleEndBlur() {
    const iso = inputToISO(endText);
    if (iso) setRange(r => ({ from: r?.from, to: parseISO(iso) }));
    else setEndText(fmtInput(to));
  }

  function handleApply() {
    if (!range?.from) return;
    onApply(toISO(range.from), range.to ? toISO(range.to) : toISO(range.from));
    setOpen(false);
  }

  const btnCls = 'flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors';

  const inputCls = 'w-28 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button onClick={() => setOpen(v => !v)} className={btnCls}>
        <CalendarIcon size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
        <span className="text-indigo-600 dark:text-indigo-400">{fmtDisplay(from)}</span>
        <span className="text-zinc-400 dark:text-zinc-500">→</span>
        <span className="text-indigo-600 dark:text-indigo-400">{fmtDisplay(to)}</span>
        <ChevronDown size={12} className={`ml-0.5 text-zinc-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40">
          {/* Manual inputs */}
          <div className="flex items-center gap-4 px-4 pt-3 pb-2.5 border-b border-zinc-100 dark:border-white/[0.13]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Início:</span>
              <input value={startText} onChange={e => setStartText(e.target.value)} onBlur={handleStartBlur} placeholder="dd/mm/aaaa" className={inputCls} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Fim:</span>
              <input value={endText} onChange={e => setEndText(e.target.value)} onBlur={handleEndBlur} placeholder="dd/mm/aaaa" className={inputCls} />
            </div>
          </div>

          {/* Calendar — usa .drp-calendar de globals.css para estilização de range */}
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={pt}
            defaultMonth={defaultMonth}
            className="drp-calendar"
            classNames={{
              months:          'flex gap-6 p-4',
              month:           'space-y-2',
              month_caption:   'flex justify-center relative items-center h-8',
              caption_label:   'text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize',
              nav:             'absolute inset-x-0 top-0 flex justify-between pointer-events-none',
              button_previous: 'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
              button_next:     'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
              month_grid:      'w-full border-collapse',
              weekdays:        'flex',
              weekday:         'w-9 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 text-center pb-1',
              weeks:           '',
              week:            'flex mt-1',
              day:             'rdp-day relative w-9 h-9 p-0 text-center',
              day_button:      'rdp-day_button w-full h-full flex items-center justify-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer',
              selected:        'rdp-selected',
              range_start:     'rdp-range_start',
              range_end:       'rdp-range_end',
              range_middle:    'rdp-range_middle',
              today:           'text-indigo-600 dark:text-indigo-400 font-bold',
              outside:         'opacity-30',
              disabled:        'opacity-30 cursor-not-allowed',
              hidden:          'invisible',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft size={16} />
                  : <ChevronRight size={16} />,
            }}
          />

          {/* Aplicar */}
          <div className="flex justify-end px-4 pb-3 pt-0">
            <button onClick={handleApply} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
