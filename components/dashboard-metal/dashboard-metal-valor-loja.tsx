'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LOJAS } from '@/lib/controle-config';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface Props {
  valorPorLoja: { loja: string; ano_mes: string; valor: number }[];
  lojaFiltro: string;
}

function fmtBRL(v: number): string {
  return `R$${(v / 1000).toFixed(0)}k`;
}

export function DashboardMetalValorLoja({ valorPorLoja, lojaFiltro }: Props) {
  const isMobile = useIsMobile();
  const lojasAtivas = lojaFiltro === 'TODAS' ? LOJAS.map(l => l.code) : [lojaFiltro];

  const data = useMemo(() => {
    const map = new Map<string, { mes: string } & Record<string, string | number>>();
    for (const r of valorPorLoja) {
      const cur = map.get(r.ano_mes) ?? { mes: r.ano_mes };
      cur[r.loja] = (Number(cur[r.loja]) || 0) + r.valor;
      map.set(r.ano_mes, cur);
    }
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [valorPorLoja]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-4 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-emerald-400" />
        Valor Investido por Mês (R$) — por loja
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.3} />
          <XAxis
            dataKey="mes"
            tick={isMobile ? false : { fontSize: 11, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={false}
            height={isMobile ? 4 : 30}
          />
          <YAxis tickFormatter={fmtBRL} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
            labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
            formatter={(v, name) => [Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name]}
            itemSorter={item => -(Number(item.value) || 0)}
          />
          {lojasAtivas.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {lojasAtivas.map(code => {
            const loja = LOJAS.find(l => l.code === code);
            return (
              <Bar key={code} dataKey={code} name={loja?.sigla ?? code} stackId="v" fill={loja?.cor ?? '#999'} radius={[0, 0, 0, 0]} />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
