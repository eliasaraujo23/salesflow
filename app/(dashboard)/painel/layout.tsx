import { PainelFiltersProvider } from '@/components/painel/painel-filters-context';
import { PainelFilterBar } from '@/components/painel/painel-filter-bar';

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <PainelFiltersProvider>
      <div className="flex flex-col h-full overflow-hidden">
        <PainelFilterBar />
        <div className="flex-1 overflow-y-auto md:overflow-hidden min-h-0">
          {children}
        </div>
      </div>
    </PainelFiltersProvider>
  );
}
