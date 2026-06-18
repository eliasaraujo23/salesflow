'use client';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';

interface ComboboxDefaultProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  items: { id: number; item: string }[] | null;
  title: string;
  onChangeSetValue?: (value: string) => void;
  classLabel?: string;
  className?: string;
}

export function ComboboxDefaultItem<T extends FieldValues>({
  control,
  items,
  name,
  title,
  onChangeSetValue,
  classLabel,
  className,
}: ComboboxDefaultProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-col space-y-1', className)}>
          <FormLabel className={cn('text-base font-medium', classLabel)}>{title}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    'w-full justify-between bg-input text-xs rounded-sm text-muted-foreground',
                    !field.value && 'text-muted-foreground',
                  )}
                  onClick={() => setOpen((prev) => !prev)}
                >
                  {field.value
                    ? items?.find((item) => item.item === field.value.toString())?.item
                    : 'Selecione...'}
                  <ChevronsUpDown size={12} className="opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full md:w-[350px] p-0">
              <Command>
                <CommandInput placeholder="Search..." className="h-9" />
                <CommandList>
                  <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                  <CommandGroup>
                    {items?.map((item) => (
                      <CommandItem
                        value={item.item}
                        key={item.id}
                        onSelect={() => {
                          const value = item.item;
                          field.onChange(value);
                          if (onChangeSetValue) {
                            onChangeSetValue?.(value);
                          }
                          setOpen(false);
                        }}
                      >
                        {item.item}
                        <Check
                          className={cn(
                            'ml-auto',
                            item.item === field.value.toString() ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
