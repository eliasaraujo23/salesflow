'use client';

import React from 'react';
import { Controller, FieldPath, FieldValues, Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface InputFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  type?: string;
  description?: string;
  error?: string;
  className?: string;
}

export function InputField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  description,
  error,
  className,
}: InputFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          {label && <Label>{label}</Label>}
          <Input
            {...field}
            type={type}
            placeholder={placeholder}
            className={cn(
              error && 'border-semantic-red focus:border-semantic-red focus:ring-semantic-red',
              className
            )}
          />
          {error && <p className="text-xs text-semantic-red">{error}</p>}
          {description && <p className="text-xs text-text-muted">{description}</p>}
        </div>
      )}
    />
  );
}
