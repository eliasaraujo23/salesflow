'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDownIcon } from 'lucide-react';

interface DatePickerSimpleProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePickerSimple({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className,
}: DatePickerSimpleProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!value}
          className={`h-8 justify-between bg-input text-left font-normal data-[empty=true]:text-muted-foreground ${className ?? 'w-[160px]'}`}
        >
          {value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : <span className="text-xs">{placeholder}</span>}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} defaultMonth={value} locale={ptBR} />
      </PopoverContent>
    </Popover>
  );
}
