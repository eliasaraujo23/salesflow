'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type Metal } from '@/components/firebase-provider';

interface MetalsChartProps {
  metals: Metal[];
}

type MetalType = 'ouro' | 'prata' | 'platina';

const METAL_COLORS: Record<MetalType, { stroke: string; fill: string; activeClass: string; inactiveClass: string }> = {
  ouro:    { stroke: '#f59e0b', fill: '#f59e0b22', activeClass: 'bg-amber-500 text-white',  inactiveClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500' },
  prata:   { stroke: '#a1a1aa', fill: '#a1a1aa22', activeClass: 'bg-zinc-400 text-white',   inactiveClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500' },
  platina: { stroke: '#8b5cf6', fill: '#8b5cf622', activeClass: 'bg-violet-500 text-white', inactiveClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500' },
};

const METAL_LABELS: Record<MetalType, string> = {
  ouro: 'Ouro',
  prata: 'Prata',
  platina: 'Platina',
};

export function MetalsChart({ metals }: MetalsChartProps) {
  const [active, setActive] = useState<MetalType[]>(['ouro', 'prata', 'platina']);

  const chartData = useMemo(() => {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((day) => {
      const items = metals.filter((m) => m.data === day);
      return {
        label: day.slice(5).replace('-', '/'),
        ouro:    items.filter((m) => m.metal === 'ouro').reduce((s, m) => s + (m.sobrou ?? 0), 0),
        prata:   items.filter((m) => m.metal === 'prata').reduce((s, m) => s + (m.sobrou ?? 0), 0),
        platina: items.filter((m) => m.metal === 'platina').reduce((s, m) => s + (m.sobrou ?? 0), 0),
      };
    });
  }, [metals]);

  const hasData = chartData.some((d) => d.ouro > 0 || d.prata > 0 || d.platina > 0);

  function toggle(m: MetalType) {
    setActive((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Saldo acumulado — últimos 14 dias
        </span>
        <div className="flex gap-1.5">
          {(['ouro', 'prata', 'platina'] as MetalType[]).map((m) => (
            <button
              key={m}
              onClick={() => toggle(m)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize transition-all ${
                active.includes(m) ? METAL_COLORS[m].activeClass : METAL_COLORS[m].inactiveClass
              }`}
            >
              {METAL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[180px] flex items-center justify-center">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 opacity-40">
              <path d="M3 17l4-8 4 4 4-6 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 21h18" strokeLinecap="round" />
            </svg>
            <span className="text-sm">Nenhum dado registrado ainda</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}g`}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(v: unknown, name: unknown) => [`${Number(v ?? 0).toFixed(2)}g`, METAL_LABELS[name as MetalType] ?? String(name)]}
              />
              {active.includes('ouro') && (
                <Area type="monotone" dataKey="ouro" stroke={METAL_COLORS.ouro.stroke} fill={METAL_COLORS.ouro.fill} strokeWidth={2} />
              )}
              {active.includes('prata') && (
                <Area type="monotone" dataKey="prata" stroke={METAL_COLORS.prata.stroke} fill={METAL_COLORS.prata.fill} strokeWidth={2} />
              )}
              {active.includes('platina') && (
                <Area type="monotone" dataKey="platina" stroke={METAL_COLORS.platina.stroke} fill={METAL_COLORS.platina.fill} strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
