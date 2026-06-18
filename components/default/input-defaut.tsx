import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { InputHTMLAttributes } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';

interface InputProps<T extends FieldValues> extends InputHTMLAttributes<HTMLInputElement> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  className?: string;
  formatValue?: (value: any) => string;
  isHidden?: string;
  onChangeValue?: (value: any) => void;
  classLabel?: string;
  linkHref?: string;
}

export const InputDefault = <T extends FieldValues>({
  control,
  name,
  label,
  className,
  formatValue,
  isHidden = '',
  onChangeValue,
  classLabel,
  linkHref,
  ...props
}: InputProps<T>) => {
  const isReadOnly = props.readOnly;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const formattedValue = formatValue ? formatValue(field.value) : field.value;

        return (
          <FormItem className={cn(`${isHidden}`, className)}>
            <FormLabel className={cn(classLabel)}>{label}</FormLabel>
            <div className="relative flex items-center">
              <FormControl>
                <Input
                  {...field}
                  {...props}
                  ref={field.ref}
                  className="m-0 bg-input"
                  {...(formattedValue && {
                    value: formattedValue,
                    onChange: (e) => {
                      const newValue = e.target.value;
                      field.onChange(newValue);
                      if (onChangeValue) onChangeValue(newValue);
                    },
                  })}
                />
              </FormControl>
              {linkHref && (
                <Link href={linkHref} className="absolute right-2" target="_blank">
                  <ExternalLink size={'16px'} />
                </Link>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
