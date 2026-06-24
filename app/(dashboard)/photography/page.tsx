'use client';

import React, { useState, useMemo } from 'react';
import { Camera, ImageIcon, Pencil, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { usePhotoBags } from '@/hooks/use-photo-bags';
import { KPICard } from '@/components/kpi-card';
import { PhotoBagTable } from '@/components/photography/photo-bag-table';
import { PhotoBagDialog } from '@/components/photography/photo-bag-dialog';
import { type PhotoBag } from '@/lib/actions/photo-bags';

export default function PhotographyPage() {
  const { data, isLoading, isError, refetch, isFetching } = usePhotoBags();
  const [editingBag, setEditingBag] = useState<PhotoBag | null>(null);
  const [editingCode, setEditingCode] = useState<string | undefined>(undefined);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const bags = data ?? [];

  const stats = useMemo(() => {
    const totRec    = bags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const totFoto   = bags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const totEdit   = bags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);
    const pendente  = Math.max(0, totRec - totEdit);
    return { total: bags.length, totRec, totFoto, totEdit, pendente };
  }, [bags]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando lotes...
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
    <div className="p-3 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Fotografia</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Controle de saquinhos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard icon={Camera}     label="Saquinhos"      value={stats.total}   subtext="registrados"     variant="blue" />
        <KPICard icon={ImageIcon}  label="Peças Recebidas" value={stats.totRec}  subtext="no total"        variant="blue" />
        <KPICard icon={ImageIcon}  label="Fotografadas"   value={stats.totFoto} subtext="peças"           variant="blue" />
        <KPICard icon={Pencil}     label="Editadas"       value={stats.totEdit} subtext="peças"           variant="green" />
        <KPICard icon={AlertCircle} label="Pendentes"     value={stats.pendente} subtext="sem edição"     variant={stats.pendente > 0 ? 'amber' : 'blue'} />
      </div>

      <PhotoBagTable
        data={bags}
        onEdit={(bag, code) => { setEditingBag(bag); setEditingCode(code); }}
      />

      {(editingBag || showCreateDialog) && (
        <PhotoBagDialog
          bag={editingBag ?? undefined}
          code={editingCode}
          onClose={() => {
            setEditingBag(null);
            setEditingCode(undefined);
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
}
