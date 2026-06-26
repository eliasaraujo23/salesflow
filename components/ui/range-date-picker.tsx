'use client';

import React, { useState, useEffect } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DateRange as DPRange } from 'react-day-picker';
import { pt } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DPY_RANGE, toISO, fromISO, fmtDisplay, parseDisplayDate } from '@/lib/day-picker-config';

export interface DateRangeValue {
  from: string; // 'yyyy-mm-dd' ou ''
  to: string;   // 'yyyy-mm-dd' ou ''
}

export interface RangeDatePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Padrão: 2 no desktop, 1 em telas < 640px */
  numberOfMonths?: 1 | 2;
  className?: string;
}

function toDPRange(v: DateRangeValue): DPRange | undefined {
  const from = fromISO(v.from);
  const to   = fromISO(v.to);
  if (!from && !to) return undefined;
  return { from, to };
}

export function RangeDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar período',
  disabled = false,
  numberOfMonths = 2,
  className,
}: RangeDatePickerProps) {
  const [open, setOpen]         = useState(false);
  const [numMonths, setNumMonths] = useState(1);

  // Estado pendente — só vai ao pai quando o usuário clica "Aplicar"
  const [pending, setPending]   = useState<DateRangeValue>(value);
  const [fromText, setFromText] = useState(fmtDisplay(value.from));
  const [toText, setToText]     = useState(fmtDisplay(value.to));
  const [dpRange, setDpRange]   = useState<DPRange | undefined>(() => toDPRange(value));

  // Meses responsivos: 2 em desktop, 1 em mobile
  useEffect(() => {
    function calc() { setNumMonths(window.innerWidth >= 640 ? numberOfMonths : 1); }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [numberOfMonths]);

  // Sincroniza quando o pai atualiza o valor externamente (ex: reset de formulário)
  useEffect(() => {
    setPending(value);
    setFromText(fmtDisplay(value.from));
    setToText(fmtDisplay(value.to));
    setDpRange(toDPRange(value));
  }, [value.from, value.to]); // eslint-disable-line react-hooks/exhaustive-deps

  function syncPending(v: DateRangeValue) {
    setPending(v);
    setFromText(fmtDisplay(v.from));
    setToText(fmtDisplay(v.to));
    setDpRange(toDPRange(v));
  }

  function handleDpSelect(r: DPRange | undefined) {
    setDpRange(r);
    const f = r?.from ? toISO(r.from) : '';
    const t = r?.to   ? toISO(r.to)   : '';
    setPending({ from: f, to: t });
    setFromText(fmtDisplay(f));
    setToText(fmtDisplay(t));
  }

  function handleFromBlur() {
    const iso = parseDisplayDate(fromText);
    if (iso) {
      const next = { ...pending, from: iso };
      setPending(next);
      setDpRange(toDPRange(next));
    } else {
      setFromText(fmtDisplay(pending.from));
    }
  }

  function handleToBlur() {
    const iso = parseDisplayDate(toText);
    if (iso) {
      const next = { ...pending, to: iso };
      setPending(next);
      setDpRange(toDPRange(next));
    } else {
      setToText(fmtDisplay(pending.to));
    }
  }

  function handleApply() {
    onChange(pending);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (disabled) return;
    setOpen(next);
    if (!next) syncPending(value); // descarta mudanças se fechou sem aplicar
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ from: '', to: '' });
  }

  const hasValue = !!(value.from || value.to);
  const inputCls = 'w-[7.5rem] px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';
  const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 text-left',
            'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08]',
            'rounded-lg text-[13px] transition-colors',
            'focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500',
            'hover:border-zinc-300 dark:hover:border-white/[0.14]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className,
          )}
        >
          <CalendarIcon size={13} className="shrink-0 text-zinc-400 dark:text-zinc-500" />
          {hasValue ? (
            <span className="flex-1 flex items-center gap-1.5">
              <span className={value.from ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}>
                {value.from ? fmtDisplay(value.from) : 'dd/mm/aaaa'}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">→</span>
              <span className={value.to ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-500'}>
                {value.to ? fmtDisplay(value.to) : 'dd/mm/aaaa'}
              </span>
            </span>
          ) : (
            <span className="flex-1 text-zinc-400 dark:text-zinc-500">{placeholder}</span>
          )}
          {hasValue && !disabled && (
            <X
              size={13}
              className="shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="p-0 w-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-xl shadow-black/10 dark:shadow-black/40"
      >
        {/* Inputs de texto para digitação manual */}
        <div className="flex items-center gap-4 px-4 pt-3 pb-2.5 border-b border-zinc-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className={labelCls}>Início</span>
            <input
              value={fromText}
              onChange={e => setFromText(e.target.value)}
              onBlur={handleFromBlur}
              placeholder="dd/mm/aaaa"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Fim</span>
            <input
              value={toText}
              onChange={e => setToText(e.target.value)}
              onBlur={handleToBlur}
              placeholder="dd/mm/aaaa"
              className={inputCls}
            />
          </div>
        </div>

        <DayPicker
          mode="range"
          selected={dpRange}
          onSelect={handleDpSelect}
          locale={pt}
          defaultMonth={fromISO(pending.from) ?? new Date()}
          numberOfMonths={numMonths}
          className="drp-calendar"
          classNames={DPY_RANGE}
          components={{
            Chevron: ({ orientation }) =>
              orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
          }}
        />

        <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-zinc-100 dark:border-white/[0.05]">
          <button
            type="button"
            onClick={() => syncPending({ from: '', to: '' })}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Aplicar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
