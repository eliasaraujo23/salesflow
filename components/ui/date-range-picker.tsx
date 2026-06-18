// @ts-nocheck
import { CalendarIcon } from '@radix-ui/react-icons';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import InputMask from 'react-input-mask';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Dispatch, useEffect, useState } from 'react';

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
  const [fromInput, setFromInput] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isRangeComplete, setIsRangeComplete] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setFromInput(dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : '');
    setToInput(dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : '');

    setIsRangeComplete(!!(dateRange?.from && dateRange?.to));
  }, [dateRange]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'from' | 'to') => {
    const value = e.target.value;
    const setInputState = field === 'from' ? setFromInput : setToInput;
    setInputState(value);

    // Se limpar o input, limpa a data correspondente
    if (!value || value.replace(/[/_]/g, '').length === 0) {
      setDateRange((prev) => ({
        from: field === 'from' ? undefined : prev?.from,
        to: field === 'to' ? undefined : prev?.to,
      }));
      return;
    }

    // Se a data estiver completa, valida e aplica
    if (!value.includes('_') && value.length === 10) {
      const parsedDate = parse(value, 'dd/MM/yyyy', new Date());

      if (isValid(parsedDate)) {
        const newRange = {
          from: field === 'from' ? parsedDate : dateRange?.from,
          to: field === 'to' ? parsedDate : dateRange?.to,
        };
        setDateRange(newRange);
      }
    }
  };

  useEffect(() => {
    if (!isPopoverOpen && onDateChange) {
      onDateChange(dateRange);
    }
  }, [isPopoverOpen, dateRange, onDateChange]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            size="sm"
            variant="outline"
            className={cn(
              'h-8 w-full justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground',
              buttonClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy')
              )
            ) : (
              <span className="text-xs text-muted-foreground">Escolha um intervalo de datas...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[100vw] overflow-x-auto p-0" align="end">
          <div className="flex items-center justify-between rounded-t-md border-b bg-card px-4 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">INÍCIO:</p>
              {/* @ts-ignore */}
              <InputMask
                mask="99/99/9999"
                value={fromInput}
                onChange={(e) => handleDateInputChange(e, 'from')}
              >
                {(inputProps: any) => (
                  <input
                    {...inputProps}
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    className="w-full rounded border px-2 py-1 text-xs md:w-[130px]"
                  />
                )}
              </InputMask>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">FIM:</p>
              {/* @ts-ignore */}
              <InputMask
                mask="99/99/9999"
                value={toInput}
                onChange={(e) => handleDateInputChange(e, 'to')}
              >
                {(inputProps: any) => (
                  <input
                    {...inputProps}
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    className="w-full rounded border px-2 py-1 text-xs md:w-[130px]"
                  />
                )}
              </InputMask>
            </div>
          </div>

          <Calendar
            mode="range"
            defaultMonth={dateRange?.from || new Date()}
            selected={dateRange}
            onSelect={(range) => {
              if (isRangeComplete) {
                if (range?.from && range?.to) {
                  const newDate = range.to > (dateRange?.to || range.to) ? range.to : range.from;
                  if (
                    newDate.getTime() !== dateRange?.from?.getTime() &&
                    newDate.getTime() !== dateRange?.to?.getTime()
                  ) {
                    setDateRange({ from: newDate, to: undefined });
                    return;
                  }
                }
              }
              setDateRange(range);
            }}
            numberOfMonths={isMobile ? 1 : 2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
