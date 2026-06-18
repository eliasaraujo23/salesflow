import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Control, FieldValues, Path } from "react-hook-form";

interface TextareaProps<T extends FieldValues> extends React.ComponentProps<'textarea'> {
    control: Control<T>;
    name: Path<T>;
    label: string;
    className?: string;
    resize?: boolean;
}

export const TextareaDefault = <T extends FieldValues>({
    control,
    name,
    label,
    className,
    resize = false,
    ...props
}: TextareaProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className={cn("", className)}>
                    <FormLabel>{label}</FormLabel>
                    <FormControl className="">
                        <Textarea
                            {...field}
                            {...props}
                            ref={field.ref}
                            className={`bg-input ${resize ? "resize-y" : "resize-none"}`}
                        
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
