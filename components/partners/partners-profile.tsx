'use client';

import React from 'react';
import { Store } from 'lucide-react';
import { type PartnerConsignment, type PartnerSales } from '@/lib/actions/fetch-partners';
import { CC_CATS } from '@/hooks/use-partners';

function up(s: string | null | undefined): string {
  return (s ?? '').toUpperCase();
}

function fmtMoeda(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function diasCor(d: number): string {
  if (d > 90) return 'text-red-500 dark:text-red-400';
  if (d >= 75) return 'text-amber-500 dark:text-amber-400';
  return 'text-zinc-500 dark:text-zinc-400';
}

function ccCor(n: number): string {
  if (n >= 8) return 'text-emerald-600 dark:text-emerald-400';
  if (n >= 5) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

interface PartnersProfileProps {
  destino: string;
  data: PartnerConsignment[];
  sales: PartnerSales[];
}

export function PartnersProfile({ destino, data, sales }: PartnersProfileProps) {
  const vencidas = data.filter(r => r.dias_campo > 90);
  const alertas = data.filter(r => r.dias_campo >= 75 && r.dias_campo <= 90);
  const diasMed = data.length
    ? Math.round(data.reduce((s, r) => s + r.dias_campo, 0) / data.length)
    : 0;

  const coverage = CC_CATS.map(cat => ({
    label: cat.label,
    count: data.filter(cat.check).length,
  }));
  const ccHas = coverage.filter(c => c.count > 0).length;

  const tipoMap = new Map<string, number>();
  data.forEach(r => {
    const k = (r.produto ?? '—') + (r.subtipo ? ' / ' + r.subtipo : '');
    tipoMap.set(k, (tipoMap.get(k) ?? 0) + 1);
  });
  const topTipos = [...tipoMap.entries()].sort((a, b) => b[1] - a[1]);

  const totalVendas = sales.reduce((s, r) => s + r.total_vendas, 0);
  const totalFat = sales.reduce((s, r) => s + r.total_faturado, 0);
  const ticketMed = totalVendas > 0 ? totalFat / totalVendas : 0;
  const topVendidos = [...sales].sort((a, b) => b.total_vendas - a.total_vendas).slice(0, 6);

  const expired = [...vencidas, ...alertas].sort((a, b) => b.dias_campo - a.dias_campo);

  return (
    <div className="space-y-4">
      {/* Partner header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Store size={16} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{destino}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.length} peças em comodato · {totalVendas} vendas históricas
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <ProfileKpi label="Em Campo" value={String(data.length)} />
          <ProfileKpi
            label={`CC Cobertos`}
            value={`${ccHas}/${CC_CATS.length}`}
            valueClass={ccCor(ccHas)}
          />
          <ProfileKpi
            label="Vencidas >90d"
            value={String(vencidas.length)}
            valueClass={vencidas.length > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
          />
          <ProfileKpi
            label="Dias Médio"
            value={`${diasMed}d`}
            valueClass={diasMed > 90 ? 'text-red-500 dark:text-red-400' : diasMed > 60 ? 'text-amber-500 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}
          />
        </div>

        {/* Coverage pills */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
          ★ Carros Chefe
        </div>
        <div className="flex flex-wrap gap-1.5">
          {coverage.map(c => (
            <span
              key={c.label}
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                c.count > 0
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'
              }`}
            >
              {c.count > 0 ? '✓' : '✗'} {c.label}
              {c.count > 1 && ` ×${c.count}`}
            </span>
          ))}
        </div>
      </div>

      {/* Type breakdown + Sales history */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
            Em Campo por Tipo
          </div>
          {topTipos.length === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Nenhuma peça em campo</p>
          ) : (
            <div className="space-y-0 divide-y divide-zinc-100 dark:divide-white/[0.04]">
              {topTipos.map(([tipo, cnt]) => (
                <div key={tipo} className="flex items-center justify-between py-2">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{tipo}</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{cnt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
            Histórico de Vendas
          </div>
          {totalVendas === 0 ? (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
              Sem histórico de vendas registrado
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Vendas</div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{totalVendas}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Ticket Médio</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoeda(ticketMed)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Faturado</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtMoeda(totalFat)}</div>
                </div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
                Mais Vendidos
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
                {topVendidos.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">
                      {r.produto ?? '—'}{r.subtipo ? ' / ' + r.subtipo : ''}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        ×{r.total_vendas}
                      </span>
                      {r.ticket_medio != null && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {fmtMoeda(r.ticket_medio)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expired items */}
      {expired.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className={`px-4 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] ${
            vencidas.length > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              vencidas.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {vencidas.length > 0
                ? `⚠ ${vencidas.length} peça${vencidas.length > 1 ? 's' : ''} com prazo vencido (>90d)`
                : `${alertas.length} peça${alertas.length > 1 ? 's' : ''} próximas de vencer (75–90d)`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm data-table">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Ref</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Produto / Subtipo</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pedra</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400">Dias em Campo</th>
                </tr>
              </thead>
              <tbody>
                {expired.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04]">
                    <td className="px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {r.referencia || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      {up(r.produto)} {up(r.subtipo)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {r.tipo_pedra ?? '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-bold text-right ${diasCor(r.dias_campo)}`}>
                      {r.dias_campo}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileKpiProps {
  label: string;
  value: string;
  valueClass?: string;
}

function ProfileKpi({ label, value, valueClass = 'text-zinc-900 dark:text-zinc-100' }: ProfileKpiProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/[0.06] rounded-lg p-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}
