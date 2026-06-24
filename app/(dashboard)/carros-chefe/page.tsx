'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw, Star } from 'lucide-react';
import { useCarrosChefe, type CarroChefeDef } from '@/hooks/use-carros-chefe';
import { CcListTable } from '@/components/carros-chefe/cc-list-table';
import { CcDialog } from '@/components/carros-chefe/cc-dialog';
import { seedDefaultsAction } from '@/lib/actions/carros-chefe';
import { toast } from 'sonner';

export default function CarrosChefePage() {
  const { defs, loading } = useCarrosChefe();
  const [editing, setEditing] = useState<CarroChefeDef | undefined>(undefined);
  const [showDialog, setShowDialog] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (defs.length > 0) {
      toast.info('Só é possível carregar padrões quando a lista está vazia.');
      return;
    }
    setSeeding(true);
    try {
      await seedDefaultsAction();
      toast.success('Padrões carregados com sucesso!');
    } catch {
      toast.error('Erro ao carregar padrões');
    } finally {
      setSeeding(false);
    }
  };

  const nextOrder = defs.length > 0 ? Math.max(...defs.map(d => d.order)) + 1 : 1;

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Star size={20} className="text-amber-400" />
            Carros-Chefe
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Categorias prioritárias · afeta parceiros e fabricações JF
          </p>
        </div>
        <div className="flex items-center gap-2">
          {defs.length === 0 && !loading && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
              Carregar Padrões
            </button>
          )}
          <button
            onClick={() => { setEditing(undefined); setShowDialog(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Novo Carro-Chefe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" />
          Carregando...
        </div>
      ) : (
        <CcListTable
          defs={defs}
          onEdit={def => { setEditing(def); setShowDialog(true); }}
        />
      )}

      {showDialog && (
        <CcDialog
          def={editing}
          nextOrder={nextOrder}
          onClose={() => { setShowDialog(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
