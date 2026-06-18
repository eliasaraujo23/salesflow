'use client';

import React from 'react';
import { Hammer } from 'lucide-react';
import { type JmPeca } from '@/lib/actions/fetch-jm-dashboard';

const TIPO_BADGE: Record<string, string> = {
  JRCP: 'bg-semantic-amber/20 text-semantic-amber',
  JMCP: 'bg-accent/20 text-accent',
  JMSP: 'bg-semantic-purple/20 text-semantic-purple',
};

interface JmFabricacaoCardProps {
  pecas: JmPeca[];
}

export function JmFabricacaoCard({ pecas }: JmFabricacaoCardProps) {
  const totalPeso = pecas.reduce((s, p) => s + p.peso, 0);

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Hammer size={18} className="text-semantic-amber" />
        <h3 className="text-sm font-bold text-text">Em Fabricação</h3>
        <span className="ml-auto text-xs font-medium text-text-muted bg-bg px-2 py-0.5 rounded-full border border-border">
          {pecas.length}
        </span>
      </div>

      {pecas.length > 0 && (
        <p className="text-xs text-text-muted mb-3">
          Peso total: <span className="font-semibold text-text">{totalPeso.toFixed(3)}g</span>
        </p>
      )}

      {pecas.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-sm">Nenhuma peça em fabricação</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {pecas.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-bg rounded-lg border border-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">{p.referencia}</span>
                  {p.tipo && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TIPO_BADGE[p.tipo] ?? 'bg-border text-text-muted'}`}>
                      {p.tipo}
                    </span>
                  )}
                </div>
                {p.produto && <p className="text-xs text-text-muted truncate mt-0.5">{p.produto}</p>}
                {p.tipo_pedra && <p className="text-xs text-text-muted/70">{p.tipo_pedra}</p>}
              </div>
              <span className="text-xs text-text-muted flex-shrink-0">{p.peso.toFixed(2)}g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
