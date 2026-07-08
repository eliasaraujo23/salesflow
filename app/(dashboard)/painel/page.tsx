'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePainelFilters } from '@/components/painel/painel-filters-context';
import { usePainelVendas } from '@/hooks/use-painel-vendas';
import { HBarChart } from '@/components/painel/h-bar-chart';
import { TipoDonut } from '@/components/painel/tipo-donut';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(2)}%`;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-5 py-4 flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{children}</p>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function PainelPage() {
  const { from, to, destinoFilter } = usePainelFilters();

  const { data, isLoading, isError, error } = usePainelVendas(
    from,
    to,
    destinoFilter.length > 0 ? destinoFilter : null,
  );

  const tipoData = useMemo(() => data?.byTipo ?? [], [data]);
  const destinoData = useMemo(
    () => (data?.byDestino ?? []).map(d => ({ name: d.name, value: d.faturamento })),
    [data],
  );

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-4">

      {/* KPIs totais */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Faturamento Total" value={isLoading ? '—' : fmtBRL(data?.total.faturamento ?? 0)} />
        <KpiCard label="Ticket Médio"       value={isLoading ? '—' : fmtBRL(data?.total.tm ?? 0)} />
        <KpiCard label="Quantidade"         value={isLoading ? '—' : String(data?.total.qtd ?? 0)} />
        <KpiCard label="Lucratividade"      value={isLoading ? '—' : fmtPct(data?.total.lucrat ?? 0)} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" /> Carregando dados...
        </div>
      )}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* B2C × B2B */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <SectionTitle>Vendas B2C</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento',   value: fmtBRL(data.b2c.faturamento) },
                  { label: 'Ticket Médio',  value: fmtBRL(data.b2c.tm) },
                  { label: 'Quantidade',    value: String(data.b2c.qtd) },
                  { label: 'Lucratividade', value: fmtPct(data.b2c.lucrat) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{k.label}</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle>Vendas B2B</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento',   value: fmtBRL(data.b2b.faturamento) },
                  { label: 'Ticket Médio',  value: fmtBRL(data.b2b.tm) },
                  { label: 'Quantidade',    value: String(data.b2b.qtd) },
                  { label: 'Lucratividade', value: fmtPct(data.b2b.lucrat) },
                ].map(k => (
                  <div key={k.label}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{k.label}</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Destinos + coluna direita */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col">
              <SectionTitle>Faturamento Total por Destino</SectionTitle>
              <HBarChart data={destinoData} color="#6366f1" formatter={fmtBRL} />
            </Card>

            <div className="flex flex-col gap-3">
              <Card className="flex flex-col">
                <SectionTitle>Revenda × Fabricado</SectionTitle>
                <div style={{ height: 260 }}>
                  {tipoData.length > 0
                    ? <TipoDonut data={tipoData} formatter={fmtBRL} />
                    : <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Sem dados</div>}
                </div>
              </Card>

              {data.monthly.length > 0 && (
                <Card className="flex flex-col">
                  <SectionTitle>Ticket Médio por Mês</SectionTitle>
                  <HBarChart
                    data={data.monthly.map(m => ({ name: m.mesLabel, value: m.ticketMedio }))}
                    color="#a855f7"
                    formatter={fmtBRL}
                  />
                </Card>
              )}
            </div>
          </div>

          {/* B2C por Canal + B2B por Parceiro */}
          <div className="grid grid-cols-2 gap-3 items-start">
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2C por Canal</SectionTitle>
              <HBarChart
                data={data.b2cByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#10b981"
                formatter={fmtBRL}
              />
            </Card>
            <Card className="flex flex-col">
              <SectionTitle>Vendas B2B por Parceiro</SectionTitle>
              <HBarChart
                data={data.b2bByDestino.map(d => ({ name: d.name, value: d.faturamento }))}
                color="#f97316"
                formatter={fmtBRL}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
