'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePartnersPage } from '@/hooks/use-partners';
import { PartnersKpis } from '@/components/partners/partners-kpis';
import { PartnersChips } from '@/components/partners/partners-chips';
import { PartnersMatrix } from '@/components/partners/partners-matrix';
import { PartnersProfile } from '@/components/partners/partners-profile';
import { PartnersGaps } from '@/components/partners/partners-gaps';

export default function PartnersPage() {
  const {
    isLoading,
    isError,
    isFetching,
    cats,
    partnerList,
    kpis,
    matrix,
    gaps,
    activePartner,
    setActivePartner,
    partnerData,
    partnerSales,
    refresh,
  } = usePartnersPage();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando comodato...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar dados.{' '}
          <button onClick={refresh} className="underline hover:no-underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Parceiros</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Comodato em campo</p>
        </div>
        <button
          onClick={refresh}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <PartnersKpis
        partners={kpis.partners}
        pecasEmCampo={kpis.pecasEmCampo}
        vencidas={kpis.vencidas}
        valorEmCampo={kpis.valorEmCampo}
      />

      {/* Partner filter chips */}
      <PartnersChips
        partners={partnerList}
        active={activePartner}
        onSelect={setActivePartner}
      />

      {/* Content: matrix or partner profile */}
      {activePartner === null ? (
        <>
          <PartnersMatrix rows={matrix} partners={partnerList} />
          <PartnersGaps gaps={gaps} />
        </>
      ) : (
        <PartnersProfile
          destino={activePartner}
          data={partnerData}
          sales={partnerSales}
          gaps={gaps.filter(g => g.partnersMissing.includes(activePartner))}
          cats={cats}
        />
      )}
    </div>
  );
}
