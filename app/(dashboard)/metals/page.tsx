'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Weight } from 'lucide-react';
import { useFirebase } from '@/components/firebase-provider';
import { KPICard } from '@/components/kpi-card';
import { MetalsTable } from '@/components/metals/metals-table';
import { MetalsAddDialog } from '@/components/metals/metals-add-dialog';

const METAL_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'ouro', label: 'Ouro' },
  { key: 'prata', label: 'Prata' },
  { key: 'platina', label: 'Platina' },
] as const;

export default function MetalsPage() {
  const { metals, currentUser } = useFirebase();
  const [activeTab, setActiveTab] = useState<'todos' | 'ouro' | 'prata' | 'platina'>('todos');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const filtered = useMemo(
    () => (activeTab === 'todos' ? metals : metals.filter((m) => m.metal === activeTab)),
    [metals, activeTab]
  );

  const summary = useMemo(() => {
    const byMetal = (m: 'ouro' | 'prata' | 'platina') =>
      metals.filter((x) => x.metal === m).reduce((s, x) => s + x.peso, 0);
    return {
      ouro: byMetal('ouro'),
      prata: byMetal('prata'),
      platina: byMetal('platina'),
      total: metals.reduce((s, x) => s + x.peso, 0),
    };
  }, [metals]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Controle de Metais</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Inventário de ouro, prata e platina</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus size={16} />
            Registrar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Weight}
          label="Total Geral"
          value={`${summary.total.toFixed(2)}g`}
          subtext={`${metals.length} registros`}
          variant="blue"
        />
        <KPICard
          icon={Weight}
          label="Ouro"
          value={`${summary.ouro.toFixed(2)}g`}
          subtext="total registrado"
          variant="amber"
        />
        <KPICard
          icon={Weight}
          label="Prata"
          value={`${summary.prata.toFixed(2)}g`}
          subtext="total registrado"
          variant="purple"
        />
        <KPICard
          icon={Weight}
          label="Platina"
          value={`${summary.platina.toFixed(2)}g`}
          subtext="total registrado"
          variant="green"
        />
      </div>

      <div className="flex gap-2">
        {METAL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <MetalsTable data={filtered} canDelete={isAdmin} />

      {showAddDialog && currentUser && (
        <MetalsAddDialog
          onClose={() => setShowAddDialog(false)}
          currentUser={currentUser.name}
        />
      )}
    </div>
  );
}
