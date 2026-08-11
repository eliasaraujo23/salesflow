'use client';

import { useLeiloes } from '@/lib/hooks/use-leiloes';
import { useLeilaoBasesStorage } from '@/lib/hooks/use-leilao-bases-storage';
import { useLeilaoRegras } from '@/lib/hooks/use-leilao-regras';
import { RoboConferencias } from '@/components/leilao/robo-conferencias';

export default function ConferenciasPage() {
  const { leiloes } = useLeiloes();
  const { uploadedFiles, refsPerFile, excludedFiles } = useLeilaoBasesStorage(leiloes);
  const { activeDestinos } = useLeilaoRegras();

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Conferências</h2>
          <p className="text-[11px] text-zinc-400">
            Verificações de consistência entre as bases ativas — carregue os CSVs na aba Robô
          </p>
        </div>
        {uploadedFiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-6 text-center">
            <p className="text-xs text-zinc-400">Carregue as bases na aba Robô para iniciar as conferências</p>
          </div>
        ) : (
          <RoboConferencias
            uploadedFiles={uploadedFiles}
            refsPerFile={refsPerFile}
            excludedFiles={excludedFiles}
            activeDestinos={activeDestinos}
          />
        )}
      </section>
    </div>
  );
}
