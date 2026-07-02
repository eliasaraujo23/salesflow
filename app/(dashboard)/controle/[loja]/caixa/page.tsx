'use client';

import { notFound, useParams } from 'next/navigation';
import { getLojaConfig } from '@/lib/controle-config';
import { CaixaCalculator } from '@/components/controle/caixa-calculator';

export default function CaixaPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  if (!getLojaConfig(lojaCode)) notFound();

  return (
    <div className="p-5">
      <CaixaCalculator lojaCode={lojaCode} />
    </div>
  );
}
