'use client';

import React from 'react';
import { Controller, FieldPath, FieldValues, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  description?: string;
  error?: string;
  className?: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  description,
  error,
  className,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          {label && <Label>{label}</Label>}
          <select
            {...field}
            className={cn(
              'flex h-10 w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-semantic-red focus:ring-semantic-red',
              className
            )}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-semantic-red">{error}</p>}
          {description && <p className="text-xs text-text-muted">{description}</p>}
        </div>
      )}
    />
  );
}
