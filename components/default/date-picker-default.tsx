'use client';

import { cn } from '@/lib/utils';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Control, FieldValues, Path, useFormContext } from 'react-hook-form';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface DatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  className?: string;
  classLabel?: string;
  minDate?: Date;
  maxDate?: Date;
}

export const DatePickerDefault = <T extends FieldValues>({
  control,
  name,
  label,
  className,
  classLabel,
  minDate = new Date('1900-01-01'),
  maxDate,
}: DatePickerProps<T>) => {
  const { setValue, watch } = useFormContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const fieldValue = watch(name as string);

  const setDateWithCurrentTime = (date: Date) => {
    const now = new Date();
    const newDate = new Date(date);
    newDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return newDate.toISOString();
  };

  const parseMaybeIsoOrBr = (value: string | Date | undefined) => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      if (value.includes('T') || value.includes('Z')) return new Date(value);
      return parse(value, 'dd/MM/yyyy', new Date());
    }
    return undefined;
  };

  useEffect(() => {
    const parsed = parseMaybeIsoOrBr(fieldValue);
    if (parsed && isValid(parsed)) {
      setInputValue(format(parsed, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [fieldValue]);

  const handleClickOutside = (event: MouseEvent) => {
    if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const parsed = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) {
      setValue(name as string, setDateWithCurrentTime(parsed), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    } else {
      setValue(name as string, undefined, { shouldDirty: true, shouldTouch: true });
    }
  };

  const handleDayClick = (day: Date) => {
    setInputValue(format(day, 'dd/MM/yyyy'));
    setValue(name as string, setDateWithCurrentTime(day), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setIsOpen(false);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <FormField
      control={control}
      name={name}
      render={() => {
        const displayDate = (() => {
          const parsed = parseMaybeIsoOrBr(fieldValue);
          return parsed && isValid(parsed) ? parsed : undefined;
        })();

        return (
          <FormItem className={cn('space-y-0', className)}>
            <FormLabel className={cn(classLabel)}>{label}</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type="text"
                  value={inputValue}
                  onClick={() => setIsOpen(true)}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={() => handleInputChange(inputValue)}
                  placeholder="Selecione uma data"
                  className="h-7 w-full rounded border bg-input px-3 py-1 text-xs placeholder:text-xs hover:placeholder:text-primary/70"
                />
                <CalendarIcon
                  className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform opacity-30 hover:opacity-50"
                  onClick={() => setIsOpen(true)}
                />
                {isOpen && (
                  <div
                    ref={calendarRef}
                    className="absolute left-0 top-full z-50 mt-2 rounded border bg-white shadow-lg"
                  >
                    <Calendar
                      selected={displayDate}
                      defaultMonth={displayDate ?? new Date()}
                      onDayClick={handleDayClick}
                      disabled={(day: Date) => {
                        if (minDate && day < minDate) return true;
                        if (maxDate && day > maxDate) return true;
                        return false;
                      }}
                      mode="single"
                      locale={ptBR}
                    />
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
