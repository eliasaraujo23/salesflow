'use client';

import React, { useState, useMemo } from 'react';
import { Camera, Clock, CheckCircle, Image, RefreshCw, Plus } from 'lucide-react';
import { usePhotoBags } from '@/hooks/use-photo-bags';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';
import { PhotoBagTable } from '@/components/photography/photo-bag-table';
import { PhotoBagDialog } from '@/components/photography/photo-bag-dialog';
import { type PhotoBag } from '@/lib/actions/photo-bags';

export default function PhotographyPage() {
  const { currentUser } = useFirebase();
  const { data, isLoading, isError, refetch, isFetching } = usePhotoBags();
  const [editingBag, setEditingBag] = useState<PhotoBag | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const bags = data ?? [];

  const stats = useMemo(() => ({
    total: bags.length,
    pendente: bags.filter((b) => b.status === 'pendente').length,
    fotografado: bags.filter((b) => b.status === 'fotografado').length,
    finalizado: bags.filter((b) => b.status === 'finalizado').length,
    atrasados: bags.filter((b) => b.dias > 7 && b.status !== 'finalizado').length,
  }), [bags]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando saquinhos...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar dados.{' '}
          <button onClick={() => refetch()} className="underline hover:no-underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Fotografia</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Controle de saquinhos para catalogação fotográfica</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Novo Saquinho
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Camera} label="Total" value={stats.total} subtext="saquinhos registrados" variant="blue" />
        <KPICard icon={Clock} label="Pendentes" value={stats.pendente} subtext="aguardando foto" variant="amber" />
        <KPICard icon={Image} label="Fotografados" value={stats.fotografado} subtext="aguardando catalogação" variant="purple" />
        <KPICard icon={CheckCircle} label="Finalizados" value={stats.finalizado} subtext="concluídos" variant="green" />
      </div>

      <PhotoBagTable
        data={bags}
        onEdit={(bag) => setEditingBag(bag)}
      />

      {(editingBag || showCreateDialog) && currentUser && (
        <PhotoBagDialog
          bag={editingBag ?? undefined}
          onClose={() => {
            setEditingBag(null);
            setShowCreateDialog(false);
          }}
          currentUser={currentUser.name}
        />
      )}
    </div>
  );
}
