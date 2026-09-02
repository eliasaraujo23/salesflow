'use client';

import { FileBarChart } from 'lucide-react';
import { useAnaliseHtUploads } from '@/lib/hooks/use-analise-ht-uploads';
import { AnaliseHtResumo } from '@/components/analise-ht/analise-ht-resumo';

export default function AnaliseHtResumoPage() {
  const { uploads } = useAnaliseHtUploads();

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-white/[0.13] rounded-xl">
          <FileBarChart size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma planilha importada ainda.</p>
        </div>
      ) : (
        <AnaliseHtResumo uploads={uploads.map(u => ({ id: u.id, loja: u.loja }))} />
      )}
    </div>
  );
}
