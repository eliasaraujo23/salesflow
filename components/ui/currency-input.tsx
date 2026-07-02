'use client';

import React, { useState, useRef } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
}

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CurrencyInput({ value, onChange, className = '', placeholder = 'R$ 0,00' }: Props) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  function handleFocus() {
    setRaw(value === 0 ? '' : String(value).replace('.', ','));
    setEditing(true);
    ref.current?.select();
  }

  function handleBlur() {
    const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
    onChange(parsed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') ref.current?.blur();
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={editing ? raw : value === 0 ? '' : formatBRL(value)}
      placeholder={placeholder}
      onChange={e => setRaw(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
}
