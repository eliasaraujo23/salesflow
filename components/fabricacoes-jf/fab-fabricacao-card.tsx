'use client';

import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/card';

type Peca = {
  referencia: string;
  subtipo?: string | null;
  tipo_pedra?: string | null;
  dias: number;
};

function diasVariant(d: number): string {
  if (d <= 15) return 'bg-semantic-green/15 text-semantic-green';
  if (d <= 30) return 'bg-semantic-amber/15 text-semantic-amber';
  if (d <= 60) return 'bg-orange-400/15 text-orange-400';
  return 'bg-semantic-red/15 text-semantic-red';
}

interface FabFabricacaoCardProps {
  pecas: Peca[];
}

export function FabFabricacaoCard({ pecas }: FabFabricacaoCardProps) {
  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">🔨 Em Fabricação Agora</CardTitle>
        <span className="text-xs bg-accent/15 text-accent px-2.5 py-1 rounded-full font-semibold">
          {pecas.length}
        </span>
      </CardHeader>
      <div className="max-h-80 overflow-y-auto">
        {pecas.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">Nenhuma peça em fabricação</div>
        ) : (
          pecas.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3 border-b border-border/50 hover:bg-border/30 transition-colors gap-3"
            >
              <div>
                <div className="font-semibold text-sm text-text">{p.referencia}</div>
                {p.subtipo && <div className="text-xs text-text-muted mt-0.5">{p.subtipo}</div>}
                {p.tipo_pedra && <div className="text-xs text-accent mt-0.5">{p.tipo_pedra}</div>}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${diasVariant(p.dias)}`}>
                {p.dias}d
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
