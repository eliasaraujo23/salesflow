'use client';

import React, { useState } from 'react';
import { Store, ChevronDown, ChevronUp } from 'lucide-react';
import { type PartnerConsignment, type PartnerSales } from '@/lib/actions/fetch-partners';
import { type CatDefDynamic } from '@/hooks/use-carros-chefe';
import { type GapInfo } from '@/hooks/use-partners';

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
  gaps: GapInfo[];
  cats: CatDefDynamic[];
}

export function PartnersProfile({ destino, data, sales, gaps, cats }: PartnersProfileProps) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  const vencidas = data.filter(r => r.dias_campo > 90);
  const alertas = data.filter(r => r.dias_campo >= 75 && r.dias_campo <= 90);
  const diasMed = data.length
    ? Math.round(data.reduce((s, r) => s + r.dias_campo, 0) / data.length)
    : 0;

  const coverage = cats.map(cat => ({
    label: cat.label,
    pieces: data.filter(cat.check).sort((a, b) => b.dias_campo - a.dias_campo),
    count: data.filter(cat.check).length,
  }));
  const coveredCats = coverage.filter(c => c.count > 0);
  const ccHas = coveredCats.length;

  const totalVendas = sales.reduce((s, r) => s + r.total_vendas, 0);
  const totalFat = sales.reduce((s, r) => s + r.total_faturado, 0);
  const ticketMed = totalVendas > 0 ? totalFat / totalVendas : 0;
  const topVendidos = [...sales].sort((a, b) => b.total_vendas - a.total_vendas).slice(0, 6);

  const expired = [...vencidas, ...alertas].sort((a, b) => b.dias_campo - a.dias_campo);

  return (
    <div className="space-y-4">
      {/* Partner header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4">
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
            value={`${ccHas}/${cats.length}`}
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

        {/* Covered categories — clickable pills */}
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2">
          ★ Carros Chefe — {ccHas}/{cats.length} cobertos
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {coveredCats.map(c => {
            const open = expandedCat === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setExpandedCat(open ? null : c.label)}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                  open
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                ✓ {c.label}{c.count > 1 ? ` ×${c.count}` : ''}
                {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            );
          })}
        </div>

        {/* Expanded covered category detail */}
        {expandedCat && (() => {
          const cat = coveredCats.find(c => c.label === expandedCat);
          if (!cat) return null;
          return (
            <div className="mb-3 rounded-lg border border-emerald-200 dark:border-emerald-500/20 overflow-hidden">
              <div className="px-3 py-2 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">✓ {cat.label}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{cat.count} peça{cat.count !== 1 ? 's' : ''} em campo</span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
                {cat.pieces.map((r, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{r.referencia || '—'}</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{up(r.produto)}{r.subtipo ? ' / ' + up(r.subtipo) : ''}</span>
                    {r.tipo_pedra && <span className="text-zinc-400 dark:text-zinc-500">· {r.tipo_pedra}</span>}
                    {r.lapidacao  && <span className="text-zinc-400 dark:text-zinc-500">· {r.lapidacao}</span>}
                    {r.tipo && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {r.tipo}
                      </span>
                    )}
                    <span className={`ml-auto font-semibold shrink-0 ${diasCor(r.dias_campo)}`}>{r.dias_campo}d</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Missing categories — detailed gap view */}
        {gaps.length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 dark:text-red-400 mb-2">
              ✗ Em Falta ({gaps.length})
            </div>
            <div className="space-y-1.5">
              {gaps.map(g => {
                const gOpen = expandedGap === g.catLabel;
                const hasDetail = g.stockItems.length > 0 || g.redistFrom.length > 0;
                return (
                  <div key={g.catLabel} className="rounded-lg border border-red-200 dark:border-red-500/20 overflow-hidden">
                    <button
                      onClick={() => setExpandedGap(gOpen ? null : g.catLabel)}
                      className="w-full px-3 py-2 bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors flex items-center justify-between text-left"
                    >
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{g.catLabel}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {!hasDetail && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Sem opção disponível</span>
                        )}
                        {hasDetail && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {g.stockItems.length > 0 ? `${g.stockItems.length} em estoque` : ''}
                            {g.stockItems.length > 0 && g.redistFrom.length > 0 ? ' · ' : ''}
                            {g.redistFrom.length > 0 ? `redistribuir de ${g.redistFrom.length}` : ''}
                          </span>
                        )}
                        {gOpen ? <ChevronUp size={12} className="text-red-400" /> : <ChevronDown size={12} className="text-red-400" />}
                      </div>
                    </button>
                    {gOpen && hasDetail && (
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-white/[0.04]">
                        <div className="px-3 py-2.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                            Estoque JM disponível
                          </div>
                          {g.stockItems.length === 0 ? (
                            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                          ) : (
                            <div className="space-y-1">
                              {g.stockItems.map(s => (
                                <div key={s.referencia} className="flex items-center gap-1.5 flex-wrap text-xs">
                                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.referencia}</span>
                                  {s.subtipo && <span className="text-zinc-500 dark:text-zinc-400">{s.subtipo}</span>}
                                  {s.tipo_pedra && <span className="text-zinc-400 dark:text-zinc-500">· {s.tipo_pedra}</span>}
                                  {s.lapidacao && <span className="text-zinc-400 dark:text-zinc-500">· {s.lapidacao}</span>}
                                  <span className="text-zinc-300 dark:text-zinc-600">{s.dias}d</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
                            Redistribuir de (mais antigo)
                          </div>
                          {g.redistFrom.length === 0 ? (
                            <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                          ) : (
                            <div className="space-y-1">
                              {g.redistFrom.map(r => (
                                <div key={r.partner} className="flex items-center gap-1.5 flex-wrap text-xs">
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {r.partner} ×{r.count}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-600">→</span>
                                  <span className="font-mono text-zinc-600 dark:text-zinc-400">{r.oldest.referencia || '—'}</span>
                                  {r.oldest.produto && (
                                    <span className="text-zinc-500 dark:text-zinc-400">{up(r.oldest.produto)}</span>
                                  )}
                                  {r.oldest.tipo_pedra && (
                                    <span className="text-zinc-400 dark:text-zinc-500">· {r.oldest.tipo_pedra}</span>
                                  )}
                                  <span className={`font-semibold ${
                                    r.oldest.dias_campo > 90 ? 'text-red-500 dark:text-red-400' :
                                    r.oldest.dias_campo >= 75 ? 'text-amber-500 dark:text-amber-400' :
                                    'text-zinc-400 dark:text-zinc-500'
                                  }`}>
                                    {r.oldest.dias_campo}d
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sales history */}
      <div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4">
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
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
    <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/[0.13] rounded-lg p-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold leading-none ${valueClass}`}>{value}</div>
    </div>
  );
}
