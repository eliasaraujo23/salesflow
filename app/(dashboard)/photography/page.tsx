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
  const [filterStatus, setFilterStatus] = useState('');

  function setFilter(value: string) {
    setFilterStatus(prev => prev === value ? '' : value);
  }

  const bags = data ?? [];

  const stats = useMemo(() => {
    // Date boundaries
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr    = monday.toISOString().slice(0, 10);
    const firstOfMonth = `${now.toISOString().slice(0, 4)}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Em Aberto — bags not yet finalized
    const openBags   = bags.filter(b => !b.data_finalizacao);
    const sacAbertos = openBags.length;

    // Faltam por tipo
    const faltamFotoFab = openBags.reduce((s, b) => s + Math.max(0, b.qtd_fabricado - b.foto_fabricado), 0);
    const faltamFotoSec = openBags.reduce((s, b) => s + Math.max(0, b.qtd_second    - b.foto_second),    0);
    const faltamFotoScr = openBags.reduce((s, b) => s + Math.max(0, b.qtd_scrap     - b.foto_scrap),     0);
    const faltamEditFab = openBags.reduce((s, b) => s + Math.max(0, b.qtd_fabricado - b.edit_fabricado), 0);
    const faltamEditSec = openBags.reduce((s, b) => s + Math.max(0, b.qtd_second    - b.edit_second),    0);
    const faltamEditScr = openBags.reduce((s, b) => s + Math.max(0, b.qtd_scrap     - b.edit_scrap),     0);
    const faltamFoto = faltamFotoFab + faltamFotoSec + faltamFotoScr;
    const faltamEdit = faltamEditFab + faltamEditSec + faltamEditScr;

    // Peças Recebidas — by data_recebimento
    const recSemana = bags
      .filter(b => (b.data_recebimento ?? '').slice(0, 10) >= mondayStr)
      .reduce((s, b) => s + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const recMes = bags
      .filter(b => (b.data_recebimento ?? '').slice(0, 10) >= firstOfMonth)
      .reduce((s, b) => s + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);

    // Saquinhos finalizados — by data_finalizacao
    const finBagsSemana = bags.filter(b => b.data_finalizacao && b.data_finalizacao.slice(0, 10) >= mondayStr);
    const finBagsMes    = bags.filter(b => b.data_finalizacao && b.data_finalizacao.slice(0, 10) >= firstOfMonth);
    const sacFinSemana  = finBagsSemana.length;
    const sacFinMes     = finBagsMes.length;

    // Peças Finalizadas — saquinhos com data_finalizacao, conta edit_x (o que foi editado de fato)
    const finSemana = finBagsSemana.reduce((s, b) => s + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);
    const finMes    = finBagsMes.reduce((s, b) => s + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);

    return {
      sacAbertos, faltamFoto, faltamEdit,
      recSemana, recMes, finSemana, finMes, sacFinSemana, sacFinMes,
      bdFaltamFoto:[{ label: 'Fab', value: faltamFotoFab, color: '#3b82f6' }, { label: 'Second', value: faltamFotoSec, color: '#f97316' }, { label: 'Scrap', value: faltamFotoScr, color: '#94a3b8' }],
      bdFaltamEdit:[{ label: 'Fab', value: faltamEditFab, color: '#3b82f6' }, { label: 'Second', value: faltamEditSec, color: '#f97316' }, { label: 'Scrap', value: faltamEditScr, color: '#94a3b8' }],
    };
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard compact icon={Package}   label="Saquinhos Abertos"    value={stats.sacAbertos}   subtext="sem finalização"           variant="amber"
          active={filterStatus === ''}          onClick={() => setFilter('')} />
        <KPICard compact icon={ImageIcon} label="Peças em Aberto"      value={stats.faltamEdit}   subtext="pendentes" breakdown={stats.bdFaltamEdit} variant="amber"
          active={filterStatus === ''}          onClick={() => setFilter('')} />
        <KPICard compact icon={Camera}    label="Faltam Fotografar"    value={stats.faltamFoto}   subtext="peças" breakdown={stats.bdFaltamFoto} variant={stats.faltamFoto > 0 ? 'red' : 'green'}
          active={filterStatus === 'faltam-foto'} onClick={() => setFilter('faltam-foto')} />
        <KPICard compact icon={ImageIcon} label="Peças Recebidas"      value={stats.recSemana}    subtext={`${stats.recMes} no mês`}  variant="blue"
          active={filterStatus === 'todos'}      onClick={() => setFilter('todos')} />
        <KPICard compact icon={Pencil}    label="Peças Finalizadas"    value={stats.finSemana}    subtext={`${stats.finMes} no mês`}  variant="green"
          active={filterStatus === 'finalizado'} onClick={() => setFilter('finalizado')} />
        <KPICard compact icon={Package}   label="Saquinhos Finalizados" value={stats.sacFinSemana} subtext={`${stats.sacFinMes} no mês`} variant="green"
          active={filterStatus === 'finalizado'} onClick={() => setFilter('finalizado')} />
      </div>

      <PhotoBagTable
        data={bags}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
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
