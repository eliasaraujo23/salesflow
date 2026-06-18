import { cn } from '@/lib/utils';
import { Control, FieldValues, Path } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface CheckboxProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  className?: string;
  classLabel?: string;
  onCheckedStatusChange?: (checked: boolean | 'indeterminate') => void;
}

export const CheckboxDefault = <T extends FieldValues>({
  control,
  name,
  label,
  className,
  onCheckedStatusChange,
  classLabel,
}: CheckboxProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-row items-center space-x-1 space-y-0', className)}>
          <FormControl className={'space-x-2'}>
            <Checkbox
              className="w-5 h-5"
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                if (onCheckedStatusChange) {
                  onCheckedStatusChange(checked);
                }
              }}
            />
          </FormControl>
          <FormLabel className={cn(classLabel)}>{label}</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
