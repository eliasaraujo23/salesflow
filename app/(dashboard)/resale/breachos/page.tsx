'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useBreachos } from '@/hooks/use-breachos';
import { BrechoLista } from '@/components/resale/brecho-lista';
import { BrechoFormModal } from '@/components/resale/brecho-form-modal';

// Lazy-load: react-simple-maps + brazil-states.json (3.3 MB) não bloqueiam o primeiro render
const BrechosMapa = dynamic(
  () => import('@/components/resale/breachos-mapa').then(m => ({ default: m.BrechosMapa })),
  { ssr: false, loading: () => <div className="flex-1 rounded-xl bg-zinc-900 animate-pulse" /> }
);

export default function BrechosPage() {
  const { breachos, loading, addBrecho, removeBrecho } = useBreachos();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-5 flex flex-col overflow-y-auto md:overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="mb-3 shrink-0">
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Brechós no Brasil</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Passe o mouse sobre um estado para ver os brechós daquela região.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-zinc-400 dark:text-zinc-500">Carregando...</div>
        </div>
      ) : (
        <div className="shrink-0 md:flex-1 md:min-h-0 flex flex-col md:grid gap-4" style={{ gridTemplateColumns: '1fr 300px' }}>
          {/* Map — fills height */}
          <div className="shrink-0 h-[420px] md:h-auto md:min-h-0 flex flex-col">
            <BrechosMapa breachos={breachos} />
          </div>

          {/* List */}
          <div className="shrink-0 h-[420px] md:h-auto md:min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 flex flex-col overflow-hidden">
            <BrechoLista
              breachos={breachos}
              onAdd={() => setShowModal(true)}
              onRemove={removeBrecho}
            />
          </div>
        </div>
      )}

      {showModal && (
        <BrechoFormModal
          onClose={() => setShowModal(false)}
          onSave={addBrecho}
        />
      )}
    </div>
  );
}
