'use client';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  align?: 'start' | 'center' | 'end';
}

export function ComboboxDefault<T extends FieldValues>({
  control,
  items,
  name,
  title,
  onChangeSetValue,
  classLabel,
  className,
  align,
}: ComboboxDefaultProps<T>) {
  const [openBox, setOpenBox] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col space-y-1">
          <FormLabel className={cn('text-base font-medium', classLabel)}>{title}</FormLabel>
          <Popover open={openBox} onOpenChange={setOpenBox}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    'w-full justify-between rounded-sm bg-input text-xs text-muted-foreground',
                    !field.value && 'text-muted-foreground',
                    className,
                  )}
                  onClick={() => setOpenBox((prev) => !prev)}
                >
                  {field.value
                    ? items?.find((item) => item.id.toString() === field.value.toString())?.item
                    : 'Selecione...'}
                  <ChevronsUpDown size={12} className="opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className="w-full p-0 md:w-[350px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
              align={align}
            >
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
                          const value = item.id?.toString();
                          field.onChange(value);
                          if (onChangeSetValue) {
                            onChangeSetValue?.(value);
                          }
                          setOpenBox(false);
                        }}
                      >
                        {item.item}
                        <Check
                          className={cn(
                            'ml-auto',
                            item.id?.toString() === field.value?.toString() ? 'opacity-100' : 'opacity-0',
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
