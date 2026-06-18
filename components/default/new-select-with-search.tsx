import { cn } from '@/lib/utils';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  items: { id: number | string; item: string }[] | null;
  title: string;
  className?: string;
  classLabel?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => Promise<any> | void;
  onChangeSetValue?: (value: string) => void;

  onSearchChange?: (term: string) => void;
  isLoading?: boolean;
  isError?: boolean;

  onScrollEnd?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export const NewSelectDefaultWithSearch = <T extends FieldValues>({
  control,
  items,
  name,
  title,
  className,
  classLabel,
  disabled = false,
  onValueChange,
  onChangeSetValue,
  onSearchChange,
  isLoading = false,
  isError = false,
  onScrollEnd,
  hasNextPage = false,
  isFetchingNextPage = false,
}: SelectProps<T>) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
          onScrollEnd?.();
        }
      },
      { root: null, rootMargin: '20px', threshold: 0.1 },
    );
    observer.observe(sentinelRef);
    return () => observer.disconnect();
  }, [sentinelRef, hasNextPage, isFetchingNextPage, isLoading, onScrollEnd]);

  const isServerSide = typeof onSearchChange === 'function';
  const safeItems = items ?? [];
  const handleSearchInput = (term: string) => {
    setInternalSearch(term);
    if (isServerSide) onSearchChange?.(term);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const currentValue = field.value?.toString?.() ?? '';
        const valueExists = currentValue ? safeItems.some((x) => String(x.id) === String(currentValue)) : true;
        const finalItems = !currentValue
          ? safeItems
          : valueExists
            ? safeItems
            : [{ id: currentValue, item: 'Carregando...' }, ...safeItems];

        const displayItems = (() => {
          if (isServerSide) return finalItems;
          if (!internalSearch) return finalItems;

          const term = internalSearch.toLowerCase();
          return finalItems.filter((i) => i.item.toLowerCase().includes(term));
        })();

        return (
          <FormItem className={cn(className)}>
            <FormLabel className={cn(classLabel)}>{title}</FormLabel>
            <Select
              value={currentValue}
              disabled={disabled}
              onValueChange={(value) => {
                if (isLoading && (value === '__clear__' || value === '')) return;
                const val = value === '__clear__' ? '' : value;
                if (val === currentValue) return;
                field.onChange(val);
                onChangeSetValue?.(val);
                onValueChange?.(val);
              }}
            >
              <FormControl className="bg-input">
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? 'Carregando...' : isError ? 'Erro ao carregar' : 'Selecione...'} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="p-0">
                <div className="sticky top-0 z-10 border-b bg-popover">
                  <InputGroup className="rounded-none border-none shadow-none focus-within:ring-0 focus-within:ring-offset-0">
                    <InputGroupInput
                      placeholder={isServerSide ? 'Buscar...' : 'Filtrar...'}
                      className="h-7 border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      value={internalSearch}
                      onChange={(e) => handleSearchInput(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <InputGroupAddon className="border-none bg-transparent">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" />
                      )}
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="max-h-[200px] overflow-y-auto p-1">
                  <SelectItem value="__clear__">Limpar seleção</SelectItem>

                  {isError ? (
                    <div className="flex items-center justify-center gap-1.5 px-2 py-3 text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <p className="text-xs">Falha ao carregar</p>
                    </div>
                  ) : displayItems.length > 0 ? (
                    displayItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.item}
                      </SelectItem>
                    ))
                  ) : (
                    <p className="p-2 text-center text-sm text-muted-foreground">
                      {isLoading ? 'Buscando...' : 'Nenhum resultado.'}
                    </p>
                  )}

                  {isServerSide && hasNextPage && (
                    <div ref={setSentinelRef} className="flex justify-center p-2 text-xs text-muted-foreground">
                      {isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span>Carregar mais...</span>
                      )}
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
