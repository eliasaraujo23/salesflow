'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { pt } from 'date-fns/locale';
import { type DateRange, DayPicker } from 'react-day-picker';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import React, { type Dispatch, useEffect, useState } from 'react';

// ── helpers ─────────────────────────────────────────────────────────────────

function parseInput(txt: string): Date | null {
  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function fmtInput(d: Date | undefined): string {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ── pill label ───────────────────────────────────────────────────────────────

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function pillDate(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

// ── component ────────────────────────────────────────────────────────────────

interface CalendarDateRangePickerProps {
  className?: string;
  buttonClassName?: string;
  dateRange: DateRange | undefined;
  setDateRange: Dispatch<React.SetStateAction<DateRange | undefined>>;
  onDateChange?: (dateRange: DateRange | undefined) => void;
}

export function CalendarDateRangePicker({
  className,
  buttonClassName,
  dateRange,
  setDateRange,
  onDateChange,
}: CalendarDateRangePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(dateRange);
  const [fromText, setFromText] = useState(fmtInput(dateRange?.from));
  const [toText,   setToText]   = useState(fmtInput(dateRange?.to));

  // Reseta ao abrir o popover ou quando o range aplicado muda externamente
  useEffect(() => {
    setPendingRange(dateRange);
    setFromText(fmtInput(dateRange?.from));
    setToText(fmtInput(dateRange?.to));
  }, [dateRange, isPopoverOpen]);

  // Clique direto num dia do calendário
  const handleDayClick = (day: Date) => {
    const hasComplete = !!(pendingRange?.from && pendingRange?.to);
    if (!pendingRange?.from || hasComplete) {
      setPendingRange({ from: day, to: undefined });
      setFromText(fmtInput(day));
      setToText('');
    } else {
      const [from, to] = day < pendingRange.from
        ? [day, pendingRange.from]
        : [pendingRange.from, day];
      setPendingRange({ from, to });
      setFromText(fmtInput(from));
      setToText(fmtInput(to));
    }
  };

  // Validação no blur dos campos de texto
  const handleFromBlur = () => {
    const d = parseInput(fromText);
    if (d) setPendingRange(prev => ({ from: d, to: prev?.to }));
    else   setFromText(fmtInput(pendingRange?.from));
  };

  const handleToBlur = () => {
    const d = parseInput(toText);
    if (d) setPendingRange(prev => ({ from: prev?.from, to: d }));
    else   setToText(fmtInput(pendingRange?.to));
  };

  const handleApply = () => {
    setDateRange(pendingRange);
    if (onDateChange) onDateChange(pendingRange);
    setIsPopoverOpen(false);
  };

  const pillLabel = dateRange?.from
    ? dateRange.to
      ? `${pillDate(dateRange.from)} → ${pillDate(dateRange.to)}`
      : `De ${pillDate(dateRange.from)}`
    : 'Selecionar período';

  const inputCls =
    'w-28 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs text-zinc-700 dark:text-zinc-300 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

  return (
    <div className={cn('shrink-0', className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-full border-2 border-zinc-800 dark:border-zinc-300',
              'text-sm font-semibold text-zinc-800 dark:text-zinc-100',
              'bg-white dark:bg-zinc-900',
              'hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors whitespace-nowrap',
              buttonClassName,
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {pillLabel}
            <ChevronDown size={12} className="text-zinc-400 dark:text-zinc-500" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto max-w-[100vw] overflow-x-auto p-0 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-2xl"
          align="start"
          sideOffset={8}
        >
          {/* INÍCIO / FIM */}
          <div className="flex items-center gap-4 px-5 pt-4 pb-3 border-b border-zinc-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Início:
              </span>
              <input
                value={fromText}
                onChange={e => setFromText(e.target.value)}
                onBlur={handleFromBlur}
                placeholder="dd/mm/aaaa"
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Fim:
              </span>
              <input
                value={toText}
                onChange={e => setToText(e.target.value)}
                onBlur={handleToBlur}
                placeholder="dd/mm/aaaa"
                className={inputCls}
              />
            </div>
          </div>

          {/* Calendar */}
          {(() => {
            const numMonths = typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2;
            return (
              <DayPicker
                mode="range"
                defaultMonth={pendingRange?.from ?? new Date()}
                selected={pendingRange}
                onDayClick={handleDayClick}
                numberOfMonths={numMonths}
                locale={pt}
                className="drp-calendar"
                classNames={{
                  months:          'flex gap-6 p-4',
                  month:           'space-y-2',
                  month_caption:   'flex justify-between items-center h-10 px-1',
                  caption_label:   'text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize mx-auto',
                  nav:             'contents',
                  button_previous: 'h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors shrink-0',
                  button_next:     'h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors shrink-0',
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
                  Chevron: ({ orientation }: { orientation?: string }) =>
                    orientation === 'left'
                      ? <ChevronLeft size={16} />
                      : <ChevronRight size={16} />,
                }}
              />
            );
          })()}

          {/* Aplicar */}
          <div className="flex justify-end px-5 pb-4 pt-2 border-t border-zinc-100 dark:border-white/[0.05]">
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
