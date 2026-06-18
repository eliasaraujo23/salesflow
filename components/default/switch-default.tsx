import { cn } from "@/lib/utils";
import { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface SwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  className?: string;
  classLabel?: string;
  onCheckedStatusChange?: (checked: boolean) => void;
}

export const SwitchDefault = <T extends FieldValues>({ control, name, label, className, onCheckedStatusChange, classLabel }: SwitchProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex items-center gap-4 space-x-0 text-primary/70 w-full justify-between", className)}>
          <FormLabel className={cn(classLabel)}>{label}</FormLabel>
          <FormControl className={"space-x-2"}>
            <Switch
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked)
                if (onCheckedStatusChange) {
                  onCheckedStatusChange(checked); 
                }
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
