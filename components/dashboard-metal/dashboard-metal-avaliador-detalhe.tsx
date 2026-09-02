'use client';

import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LOJA_TAG_COLORS, CONVERSAO_OTIMA, CONVERSAO_BOA } from '@/lib/dashboard-metal-sql';
import { getLojaConfig } from '@/lib/controle-config';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { DashboardMetalDetalhes } from '@/lib/actions/dashboard-metal';

interface Props {
  avId: string;
  detalhes: DashboardMetalDetalhes;
  onClose: () => void;
}

function convColor(conv: number): string {
  if (conv >= CONVERSAO_OTIMA * 100) return '#4ade80';
  if (conv >= CONVERSAO_BOA * 100) return '#D4AF37';
  return '#f87171';
}
function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function slotLabel(slot: number): string {
  const h = Math.floor(slot / 60);
  const m = slot % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function DashboardMetalAvaliadorDetalhe({ avId, detalhes, onClose }: Props) {
  const isMobile = useIsMobile();
  const dados = useMemo(() => {
    const rows = detalhes.avaliadores.filter(r => r.avaliador_id === avId);
    const lojas = new Set(rows.map(r => r.loja));
    const nome = rows[0]?.avaliador ?? avId;
    const aval = rows.reduce((s, r) => s + r.aval, 0);
    const compras = rows.reduce((s, r) => s + r.compras, 0);
    const metal = rows.reduce((s, r) => s + r.metal, 0);
    const valor = rows.reduce((s, r) => s + r.valor, 0);
    const m750 = rows.reduce((s, r) => s + r.m750, 0);
    const m720 = rows.reduce((s, r) => s + r.m720, 0);
    const mbx = rows.reduce((s, r) => s + r.mbx, 0);
    const m22k = rows.reduce((s, r) => s + r.m22k, 0);
    const mpt = rows.reduce((s, r) => s + r.mpt, 0);
    const m24k = rows.reduce((s, r) => s + r.m24k, 0);
    return {
      nome,
      lojas: [...lojas],
      aval, compras, nc: aval - compras,
      conv: aval > 0 ? (compras / aval) * 100 : 0,
      metal, valor,
      ticket: compras > 0 ? valor / compras : 0,
      metais: [
        { label: '750 (18K)', g: m750 },
        { label: 'BX (Bx.Teor)', g: mbx },
        { label: '720 (16K)', g: m720 },
        { label: '22K', g: m22k },
        { label: 'PT (Port.)', g: mpt },
        { label: '24K (Puro)', g: m24k },
      ].filter(m => m.g > 0).sort((a, b) => b.g - a.g),
    };
  }, [avId, detalhes.avaliadores]);

  const mensal = useMemo(() => {
    return detalhes.avaliadorMensal
      .filter(r => r.avaliador_id === avId)
      .sort((a, b) => a.ano_mes.localeCompare(b.ano_mes))
      .map(r => ({ mes: r.ano_mes, conv: r.aval > 0 ? (r.compras / r.aval) * 100 : 0 }));
  }, [avId, detalhes.avaliadorMensal]);

  const horario = useMemo(() => {
    return detalhes.avaliadorHorario
      .filter(r => r.avaliador_id === avId)
      .sort((a, b) => a.slot - b.slot)
      .map(r => ({
        label: slotLabel(r.slot),
        total: r.total,
        compras: r.compras,
        conv: r.total > 0 ? (r.compras / r.total) * 100 : 0,
      }));
  }, [avId, detalhes.avaliadorHorario]);

  const metalMax = Math.max(1, ...dados.metais.map(m => m.g));
  const metalTot = dados.metais.reduce((s, m) => s + m.g, 0);
  const nMeses = mensal.length;

  return (
    <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-white/[0.08]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-zinc-800 dark:text-zinc-100">{dados.nome}</span>
          <div className="flex gap-1">
            {dados.lojas.map(l => (
              <span key={l} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: LOJA_TAG_COLORS[l] ?? '#aaa', background: `${LOJA_TAG_COLORS[l] ?? '#aaa'}22` }}>
                {getLojaConfig(l)?.sigla ?? l}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] px-2.5 py-1 rounded-lg transition-colors duration-150"
        >
          ✕ Fechar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Avaliações</p>
          <p className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100">{dados.aval}</p>
          <p className="text-[10px] text-zinc-400">{nMeses} {nMeses === 1 ? 'mês' : 'meses'}</p>
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Não Compras</p>
          <p className="text-lg font-bold font-mono text-red-400">{dados.nc}</p>
          <p className="text-[10px] text-zinc-400">média {Math.round(dados.nc / Math.max(nMeses, 1))}/mês</p>
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Compras</p>
          <p className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100">{dados.compras}</p>
          <p className="text-[10px] text-zinc-400">concluídas</p>
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Conversão</p>
          <p className="text-lg font-bold font-mono" style={{ color: convColor(dados.conv) }}>{dados.conv.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Metal Total</p>
          <p className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100">{dados.metal.toFixed(2)}g</p>
          <p className="text-[10px] text-zinc-400">sem prata</p>
        </div>
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-3 hover:border-zinc-200 dark:hover:border-white/[0.12] transition-colors duration-150">
          <p className="text-[10px] font-bold uppercase text-zinc-400">Ticket Médio</p>
          <p className="text-lg font-bold font-mono text-zinc-800 dark:text-zinc-100">{fmtBRL(dados.ticket)}</p>
          <p className="text-[10px] text-zinc-400">{fmtBRL(dados.valor)} total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-4">
          <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-3">Distribuição por Tipo de Metal</h4>
          {dados.metais.length === 0 ? (
            <p className="text-center text-xs text-zinc-400 py-6">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {dados.metais.map(m => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.g / metalMax) * 100}%`, background: 'linear-gradient(90deg,#8B6914,#D4AF37)' }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[11px] font-mono text-zinc-700 dark:text-zinc-200">{m.g.toFixed(2)}g</span>
                  <span className="w-9 shrink-0 text-right text-[11px] font-mono text-amber-500">{metalTot > 0 ? ((m.g / metalTot) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-4">
          <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-3">Conversão Mensal (%)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mensal} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.3} />
              <XAxis
                dataKey="mes"
                tick={isMobile ? false : { fontSize: 10, fill: '#a1a1aa' }}
                tickLine={false}
                axisLine={false}
                height={isMobile ? 4 : 25}
              />
              <YAxis domain={[50, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={v => [`${Number(v).toFixed(1)}%`, 'Conversão']}
                contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
                labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="conv"
                stroke="#D4AF37"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; payload?: { conv: number } }) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null || !payload) return <React.Fragment />;
                  return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={convColor(payload.conv)} stroke="#0a0a0a" strokeWidth={1} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-100 dark:border-white/[0.06] p-4">
        <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-3">Movimentação por Horário</h4>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={horario} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={horario.length > 14 ? 1 : 0} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v, name) => (name === 'conv' ? [`${Number(v).toFixed(1)}%`, 'Conversão'] : [v, name === 'total' ? 'Atend.' : 'Compras'])}
              contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
              labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
            />
            <Bar yAxisId="left" dataKey="total" name="total" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="compras" name="compras" fill="#6366f1" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="conv" name="conv" stroke="#e5e5e5" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
