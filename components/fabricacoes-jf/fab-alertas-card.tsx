'use client';

import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/card';

type Alerta = {
  subtipo: string;
  estoque: number;
  vendidos_90d: number;
  em_fabricacao: number;
  status_alerta: 'RUPTURA' | 'CRITICO' | 'ATENCAO';
};

const STYLES: Record<Alerta['status_alerta'], { row: string; badge: string }> = {
  RUPTURA: { row: 'bg-red-500/10 border-l-4 border-l-red-500', badge: 'bg-red-500 text-white' },
  CRITICO: { row: 'bg-amber-500/10 border-l-4 border-l-amber-500', badge: 'bg-amber-500 text-white' },
  ATENCAO: { row: 'bg-yellow-400/5 border-l-4 border-l-yellow-400', badge: 'bg-yellow-400 text-black' },
};

interface FabAlertasCardProps {
  alertas: Alerta[];
}

export function FabAlertasCard({ alertas }: FabAlertasCardProps) {
  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">⚠️ Alertas de Estoque</CardTitle>
        <span className="text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold">
          {alertas.length}
        </span>
      </CardHeader>
      <div className="p-3 flex flex-col gap-2 max-h-80 overflow-y-auto">
        {alertas.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">✅ Nenhum alerta no momento</div>
        ) : (
          alertas.map((a, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg gap-3 text-sm ${STYLES[a.status_alerta].row}`}>
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{a.subtipo}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {a.estoque} em estoque · {a.vendidos_90d} vendidos/90d
                  {a.em_fabricacao > 0 ? ` · ${a.em_fabricacao} em fab.` : ''}
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded uppercase whitespace-nowrap ${STYLES[a.status_alerta].badge}`}>
                {a.status_alerta}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
