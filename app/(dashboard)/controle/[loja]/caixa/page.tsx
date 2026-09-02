'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { useLancamentos } from '@/hooks/use-lancamentos';
import { useDespesas } from '@/hooks/use-despesas';
import { CaixaCalculator } from '@/components/controle/caixa-calculator';

export default function CaixaPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const y = now.getFullYear();
  const m = now.getMonth();

  const { records: metalRecords } = useMetal(loja.code as LojaCode, { ano: y, mes: m + 1 });
  const { records: lancamentos } = useLancamentos(loja.code as LojaCode);
  const { records: despesas } = useDespesas(loja.code as LojaCode);

  const totalEntradas = useMemo(() =>
    lancamentos
      .filter(r => { const d = new Date(`${r.data}T00:00:00`); return d.getFullYear() === y && d.getMonth() === m; })
      .reduce((s, r) => s + r.valor, 0),
  [lancamentos, y, m]);

  const totalDespesas = useMemo(() =>
    despesas
      .filter(r => { const d = new Date(`${r.data}T00:00:00`); return d.getFullYear() === y && d.getMonth() === m; })
      .reduce((s, r) => s + r.valor, 0),
  [despesas, y, m]);

  const totalMetal = useMemo(() =>
    metalRecords
      .filter(r => r.transacao === 'COMPRA')
      .reduce((s, r) => s + r.valor, 0),
  [metalRecords]);

  return (
    <div className="p-5">
      <CaixaCalculator
        lojaCode={lojaCode}
        totalEntradas={totalEntradas}
        totalDespesas={totalDespesas}
        totalMetal={totalMetal}
      />
    </div>
  );
}
