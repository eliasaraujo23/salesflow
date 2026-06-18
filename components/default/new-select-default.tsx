import { cn } from '@/lib/utils';
import { Control, FieldValues, Path } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  items: { id: number | string; item: string }[] | null;
  title: string;
  className?: string;
  classLabel?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => Promise<any>;
  onChangeSetValue?: (value: string) => void;
}
//passa o id como selecionado
export const NewSelectDefault = <T extends FieldValues>({
  control,
  items,
  name,
  title,
  className,
  classLabel,
  disabled = false,
  onValueChange,
  onChangeSetValue,
}: SelectProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn(className)}>
          <FormLabel className={cn(classLabel)}>{title}</FormLabel>
          <Select
            onValueChange={(value) => {
              if (value === '__clear__') {
                field.onChange(''); // Reseta o campo para vazio
              } else {
                field.onChange(value); // Define o valor selecionado
              }
              if (onChangeSetValue) {
                onChangeSetValue(value);
              }
              if (onValueChange) {
                onValueChange(value);
              }
            }}
            disabled={disabled}
            value={field.value?.toString() || ''}
          >
            <FormControl className="bg-input">
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="__clear__">...</SelectItem>
              {items?.map((item: { id: number | string; item: string }) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
