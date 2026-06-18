'use client';

import React from 'react';
import { Hammer } from 'lucide-react';
import { type JmFabricacaoItem } from '@/lib/actions/fetch-jm-dashboard';

const diasBadgeClass = (d: number): string => {
  if (d <= 15) return 'bg-semantic-green/20 text-semantic-green';
  if (d <= 30) return 'bg-semantic-amber/20 text-semantic-amber';
  if (d <= 60) return 'bg-orange-400/20 text-orange-400';
  return 'bg-semantic-red/20 text-semantic-red';
};

interface JmFabricacaoCardProps {
  pecas: JmFabricacaoItem[];
}

export function JmFabricacaoCard({ pecas }: JmFabricacaoCardProps) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Hammer size={18} className="text-semantic-amber" />
        <h3 className="text-sm font-bold text-text">Em Fabricação</h3>
        <span className="ml-auto text-xs font-medium text-text-muted bg-bg px-2 py-0.5 rounded-full border border-border">
          {pecas.length}
        </span>
      </div>

      {pecas.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-sm">Nenhuma peça em fabricação</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {pecas.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-bg rounded-lg border border-border">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs text-accent">{p.referencia}</span>
                {(p.produto ?? p.subtipo) && (
                  <p className="text-xs text-text-muted truncate">{p.produto ?? p.subtipo}</p>
                )}
                {p.responsavel && (
                  <p className="text-xs text-text-muted/70">{p.responsavel}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${diasBadgeClass(p.dias)}`}>
                {p.dias}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
