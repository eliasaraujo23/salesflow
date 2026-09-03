'use client';

import { useEffect, useState } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

// Input numérico sem as setinhas nativas de type="number", aceitando
// vírgula ou ponto como separador decimal. Mantém texto bruto em estado
// local — formatar o valor a cada tecla reposicionaria o cursor no meio
// da digitação, impedindo digitar a vírgula.
export function DecimalInput({ value, onChange, className }: Props) {
  const [texto, setTexto] = useState(String(value));

  useEffect(() => {
    setTexto(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texto}
      onChange={e => {
        setTexto(e.target.value);
        onChange(parseFloat(e.target.value.replace(',', '.')) || 0);
      }}
      className={className}
    />
  );
}
