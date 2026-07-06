'use client';

import React, { useMemo, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useMetal } from '@/hooks/use-metal';
import { Loader2 } from 'lucide-react';
import { MetalUnified } from '@/components/controle/metal-unified';

function toDate(ts: Timestamp | null | undefined): Date {
  if (!ts) return new Date(0);
  return ts instanceof Timestamp ? ts.toDate() : new Date();
}

export default function ResumoPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const [now] = useState(() => new Date());
  const y = now.getFullYear();
  const m = now.getMonth();

  const { records: metalRecords, loading: metalLoading } = useMetal(loja.code as LojaCode);

  const todayRecords = useMemo(() => {
    const d = now.getDate();
    return metalRecords.filter(r => {
      const rd = toDate(r.data);
      return rd.getFullYear() === y && rd.getMonth() === m && rd.getDate() === d;
    });
  }, [metalRecords, now, y, m]);

  const monthRecords = useMemo(() => {
    return metalRecords.filter(r => {
      const rd = toDate(r.data);
      return rd.getFullYear() === y && rd.getMonth() === m;
    });
  }, [metalRecords, y, m]);

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
