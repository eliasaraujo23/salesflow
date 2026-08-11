'use client';

import { RegrasDestinos } from '@/components/leilao/regras-destinos';

export default function RegrasPage() {
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
      <section className="flex flex-col gap-3 max-w-xl">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Regras do Leilão</h2>
          <p className="text-[11px] text-zinc-400">
            Configure quais destinos impedem uma peça de constar nos leilões ativos
          </p>
        </div>
        <RegrasDestinos />
      </section>
    </div>
  );
}
