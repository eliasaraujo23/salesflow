'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { Loader2 } from 'lucide-react';
import { MetalUnified } from '@/components/controle/metal-unified';

export default function ResumoPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const y = now.getFullYear();
  const m = now.getMonth();

  const { records: metalRecords, loading: metalLoading } = useMetal(loja.code as LojaCode, { ano: y, mes: m + 1 });

  const todayRecords = useMemo(() => {
    const d = now.getDate();
    return metalRecords.filter(r => {
      const rd = new Date(`${r.data}T00:00:00`);
      return rd.getDate() === d;
    });
  }, [metalRecords, now]);

  const monthRecords = metalRecords;

  if (metalLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400 text-sm">
        <Loader2 size={15} className="animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="p-5">
      <MetalUnified dayRecords={todayRecords} monthRecords={monthRecords} />
    </div>
  );
}
