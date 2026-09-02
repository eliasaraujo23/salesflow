'use client';

import { FileBarChart } from 'lucide-react';
import { useAnaliseHtUploads } from '@/lib/hooks/use-analise-ht-uploads';
import { AnaliseHtUploadSection } from '@/components/analise-ht/analise-ht-upload';
import { AnaliseHtRelatorios } from '@/components/analise-ht/analise-ht-relatorios';

export default function AnaliseHtPage() {
  const { uploads, isUploading, uploadFiles, remove } = useAnaliseHtUploads();

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <AnaliseHtUploadSection
        uploads={uploads}
        isUploading={isUploading}
        onUpload={uploadFiles}
        onRemove={remove}
      />

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 dark:border-white/[0.13] rounded-xl">
          <FileBarChart size={40} className="text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma planilha importada ainda.</p>
        </div>
      ) : (
        <AnaliseHtRelatorios uploads={uploads.map(u => ({ id: u.id, loja: u.loja }))} />
      )}
    </div>
  );
}
