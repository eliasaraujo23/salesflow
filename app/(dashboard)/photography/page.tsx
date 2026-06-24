'use client';

import React, { useState, useMemo } from 'react';
import { Camera, ImageIcon, Pencil, Package, RefreshCw, Plus } from 'lucide-react';
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
    // Em Aberto — bags not yet finalized
    const openBags = bags.filter(b => !b.data_finalizacao);
    const sacAbertos  = openBags.length;
    const pecasAberto = openBags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const fotoAberto  = openBags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const editAberto  = openBags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);
    const faltamFoto  = Math.max(0, pecasAberto - fotoAberto);
    const faltamEdit  = Math.max(0, pecasAberto - editAberto);

    // Esta Semana — bags received since Monday
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().slice(0, 10);

    const weekBags    = bags.filter(b => (b.data_recebimento ?? '') >= mondayStr);
    const sacSemana   = weekBags.length;
    const pecasSemana = weekBags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const fotoSemana  = weekBags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const editSemana  = weekBags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);

    return { sacAbertos, pecasAberto, faltamFoto, faltamEdit, sacSemana, pecasSemana, fotoSemana, editSemana };
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

      {/* Em Aberto */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Em Aberto</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={Package}    label="Saquinhos Abertos"  value={stats.sacAbertos}  subtext="sem finalização"   variant="amber" />
          <KPICard icon={ImageIcon}  label="Peças em Aberto"    value={stats.pecasAberto} subtext="total"             variant="amber" />
          <KPICard icon={Camera}     label="Faltam Fotografar"  value={stats.faltamFoto}  subtext="peças"             variant={stats.faltamFoto > 0 ? 'red' : 'green'} />
          <KPICard icon={Pencil}     label="Faltam Editar"      value={stats.faltamEdit}  subtext="peças"             variant={stats.faltamEdit > 0 ? 'red' : 'green'} />
        </div>
      </div>

      {/* Esta Semana */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Esta Semana</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={Package}    label="Saquinhos"          value={stats.sacSemana}   subtext="recebidos"         variant="blue" />
          <KPICard icon={ImageIcon}  label="Peças Recebidas"    value={stats.pecasSemana} subtext="esta semana"       variant="blue" />
          <KPICard icon={Camera}     label="Fotografadas"       value={stats.fotoSemana}  subtext="esta semana"       variant="blue" />
          <KPICard icon={Pencil}     label="Editadas"           value={stats.editSemana}  subtext="esta semana"       variant="green" />
        </div>
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
