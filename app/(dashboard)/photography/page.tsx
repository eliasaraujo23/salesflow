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
    // Em Aberto — bags not yet finalized
    const openBags    = bags.filter(b => !b.data_finalizacao);
    const sacAbertos  = openBags.length;
    const pecasAberto = openBags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const fotoAberto  = openBags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const editAberto  = openBags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);
    const faltamFoto  = Math.max(0, pecasAberto - fotoAberto);
    const faltamEdit  = Math.max(0, pecasAberto - editAberto);

    // Date boundaries
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr     = monday.toISOString().slice(0, 10);
    const firstOfMonth  = `${now.toISOString().slice(0, 7)}-01`;

    // Produção — by data_recebimento (what was worked on)
    const weekBags  = bags.filter(b => (b.data_recebimento ?? '') >= mondayStr);
    const monthBags = bags.filter(b => (b.data_recebimento ?? '') >= firstOfMonth);

    const pecasSemana = weekBags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const pecasMes    = monthBags.reduce((a, b) => a + b.qtd_fabricado + b.qtd_second + b.qtd_scrap, 0);
    const fotoSemana  = weekBags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const fotoMes     = monthBags.reduce((a, b) => a + b.foto_fabricado + b.foto_second + b.foto_scrap, 0);
    const editSemana  = weekBags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);
    const editMes     = monthBags.reduce((a, b) => a + b.edit_fabricado + b.edit_second + b.edit_scrap, 0);

    // Finalizados — by data_finalizacao
    const finSemana = bags.filter(b => b.data_finalizacao && b.data_finalizacao.slice(0, 10) >= mondayStr).length;
    const finMes    = bags.filter(b => b.data_finalizacao && b.data_finalizacao.slice(0, 10) >= firstOfMonth).length;

    return {
      sacAbertos, pecasAberto, faltamFoto, faltamEdit,
      pecasSemana, pecasMes, fotoSemana, fotoMes, editSemana, editMes, finSemana, finMes,
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

      {/* Em Aberto */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Em Aberto</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard compact icon={Package}   label="Saquinhos Abertos" value={stats.sacAbertos}  subtext="sem finalização" variant="amber"
            active={filterStatus === ''}      onClick={() => setFilter('')} />
          <KPICard compact icon={ImageIcon} label="Peças em Aberto"   value={stats.pecasAberto} subtext="total"           variant="amber"
            active={filterStatus === ''}      onClick={() => setFilter('')} />
          <KPICard compact icon={Camera}    label="Faltam Fotografar" value={stats.faltamFoto}  subtext="peças"           variant={stats.faltamFoto > 0 ? 'red' : 'green'}
            active={filterStatus === 'aguardando'} onClick={() => setFilter('aguardando')} />
          <KPICard compact icon={Pencil}    label="Faltam Editar"     value={stats.faltamEdit}  subtext="peças"           variant={stats.faltamEdit > 0 ? 'red' : 'green'}
            active={filterStatus === 'andamento'}  onClick={() => setFilter('andamento')} />
        </div>
      </div>

      {/* Produção */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Produção</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">(valor = semana · subtext = mês)</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard compact icon={ImageIcon} label="Peças Recebidas" value={stats.pecasSemana} subtext={`${stats.pecasMes} no mês`}           variant="blue"
            active={filterStatus === 'todos'}      onClick={() => setFilter('todos')} />
          <KPICard compact icon={Camera}    label="Fotografadas"    value={stats.fotoSemana}  subtext={`${stats.fotoMes} no mês`}             variant="blue"
            active={filterStatus === 'andamento'}  onClick={() => setFilter('andamento')} />
          <KPICard compact icon={Pencil}    label="Editadas"        value={stats.editSemana}  subtext={`${stats.editMes} no mês`}             variant="blue"
            active={filterStatus === 'andamento'}  onClick={() => setFilter('andamento')} />
          <KPICard compact icon={Package}   label="Finalizados"     value={stats.finSemana}   subtext={`${stats.finMes} saquinhos no mês`}    variant="green"
            active={filterStatus === 'finalizado'} onClick={() => setFilter('finalizado')} />
        </div>
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
