'use client';

import { useLeiloes } from '@/lib/hooks/use-leiloes';
import { LancesPanel } from '@/components/leilao/lances-panel';

export default function LancesPage() {
  const { leiloes } = useLeiloes();
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
      <LancesPanel leiloes={leiloes} />
    </div>
  );
}
