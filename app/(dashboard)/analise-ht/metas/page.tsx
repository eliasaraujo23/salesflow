'use client';

import { useEffect, useState } from 'react';
import { MetasLojaResultado } from '@/components/analise-ht/metas-loja-resultado';
import { MetasLojaConfigTable } from '@/components/analise-ht/metas-loja-config-table';
import { useAnaliseHtMetasLojaConfig, type MetaLojaConfigRow } from '@/lib/hooks/use-analise-ht-metas-loja';
import { useSomenteResumoGuard } from '@/components/analise-ht/somente-resumo-guard';

function AnaliseHtMetasContent() {
  const { metas, isLoading, salvar, isSaving } = useAnaliseHtMetasLojaConfig();
  const [edicoes, setEdicoes] = useState<Record<string, MetaLojaConfigRow>>({});

  useEffect(() => {
    const map: Record<string, MetaLojaConfigRow> = {};
    for (const m of metas) map[m.id] = m;
    setEdicoes(map);
  }, [metas]);

  function handleSalvar(onSaved: () => void) {
    salvar(Object.values(edicoes), { onSuccess: onSaved });
  }

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-6">
      <MetasLojaResultado onSalvar={handleSalvar} isSaving={isSaving} />
      <MetasLojaConfigTable metas={metas} isLoading={isLoading} edicoes={edicoes} setEdicoes={setEdicoes} />
    </div>
  );
}

export default function AnaliseHtMetasPage() {
  const bloqueado = useSomenteResumoGuard();
  if (bloqueado) return null;
  return <AnaliseHtMetasContent />;
}
