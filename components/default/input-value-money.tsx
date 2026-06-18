import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PopoverAnchor } from '@radix-ui/react-popover';
import { AlertCircleIcon } from 'lucide-react';
import { InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { Control, FieldValues, Path, useController } from 'react-hook-form';
import { Popover, PopoverContent } from '@/components/ui/popover';

interface InputProps<T extends FieldValues> extends InputHTMLAttributes<HTMLInputElement> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  className?: string;
  classLabel?: string;
  classInput?: string;
  formatValue?: (value: any) => string;
  isHidden?: string;
  onChangeValue?: (value: any) => void;
  searchOnType?: (value: string) => void;
  preventPaste?: boolean;
}

export const InputValueMoney = <T extends FieldValues>({
  control,
  name,
  label,
  className,
  formatValue,
  isHidden,
  onChangeValue,
  searchOnType,
  classLabel,
  classInput,
  preventPaste,
  ...props
}: InputProps<T>) => {
  const {
    field,
    fieldState: { error },
  } = useController({ control, name });

  const [internalValue, setInternalValue] = useState<string>('');
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!preventPaste) return;

    e.preventDefault();
    setPopoverOpen(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      setPopoverOpen(false);
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    field.onChange(newValue);
    if (onChangeValue) {
      onChangeValue(newValue);
    }

    if (searchOnType && newValue.replace(/\D/g, '').length === 11) {
      searchOnType(newValue.replace(/\D/g, ''));
    }
  };

  const handleBlur = () => {
    const formattedValue = formatValue ? formatValue(internalValue) : internalValue;
    setInternalValue(formattedValue);
  };

  const handleFocus = () => {
    setInternalValue(field.value || '');
  };

  return (
    <Popover open={preventPaste && isPopoverOpen} onOpenChange={setPopoverOpen}>
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          return (
            <FormItem className={cn(`${isHidden}`, className)}>
              <FormLabel className={cn(classLabel)}>{label}</FormLabel>
              <FormControl>
                <PopoverAnchor asChild={preventPaste}>
                  <Input
                    {...field}
                    {...props}
                    ref={field.ref}
                    className={cn('bg-input', classInput)}
                    value={
                      props.readOnly
                        ? (formatValue?.(field.value) ?? field.value ?? '')
                        : internalValue || formatValue?.(field.value) || field.value || ''
                    }
                    onChange={props.readOnly ? undefined : handleChange}
                    onBlur={props.readOnly ? undefined : handleBlur}
                    onFocus={props.readOnly ? undefined : handleFocus}
                    onPaste={handlePaste}
                    aria-label={label}
                  />
                </PopoverAnchor>
              </FormControl>
              {error && <FormMessage>{error.message}</FormMessage>}
            </FormItem>
          );
        }}
      />

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] border-destructive bg-background p-2"
        side="top"
        align="start"
      >
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4 flex-shrink-0 text-destructive" />
          <p className="text-xs text-destructive">Por favor, digite o valor.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
