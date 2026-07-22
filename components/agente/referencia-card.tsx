'use client';

import { type ReferenciaData } from '@/lib/actions/fetch-referencia';

const TIPO_COLORS: Record<string, string> = {
  JF:  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  JMF: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  JM:  'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  JR:  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  JC:  'bg-red-500/15 text-red-600 dark:text-red-400',
};

const STATUS_VENDIDA = [2, 4, 13];

function fmt(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function buildDescription(d: ReferenciaData): string {
  const parts: string[] = [];
  if (d.subtipo)       parts.push(d.subtipo);
  if (d.tipo_pedra)    parts.push(d.tipo_pedra);
  if (d.lapidacao)     parts.push(d.lapidacao);
  if (d.peso != null)  parts.push(`${d.peso.toLocaleString('pt-BR')}g`);
  if (d.diamantes)     parts.push(d.diamantes + (d.cts_diamantes ? ` ${d.cts_diamantes.toLocaleString('pt-BR')}ct` : ''));
  if (d.pedra_colorida) parts.push(d.pedra_colorida + (d.cts_pedra_colorida ? ` ${d.cts_pedra_colorida.toLocaleString('pt-BR')}ct` : ''));
  return parts.join(' · ');
}

interface PriceBoxProps {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}

function PriceBox({ label, value, highlight, muted }: PriceBoxProps) {
  return (
    <div className={`rounded-xl px-4 py-3 flex flex-col gap-1 ${
      highlight
        ? 'bg-indigo-500/10 border border-indigo-500/25'
        : muted
        ? 'bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/[0.06]'
        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.1]'
    }`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className={`text-base font-bold tabular-nums ${
        highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'
      }`}>{value}</span>
    </div>
  );
}

interface ReferenciaCardProps {
  data: ReferenciaData;
}

export function ReferenciaCard({ data }: ReferenciaCardProps) {
  const vendida = data.status_id != null && STATUS_VENDIDA.includes(data.status_id);
  const description = buildDescription(data);

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-zinc-900 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${TIPO_COLORS[data.tipo] ?? 'bg-zinc-500/15 text-zinc-500'}`}>
            {data.tipo}
          </span>
          <span className="font-mono font-semibold text-sm text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
            {data.referencia}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.produto && (
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {data.produto}
            </span>
          )}
          {vendida && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Vendida
            </span>
          )}
        </div>
      </div>

      {/* Descrição */}
      {description && (
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-white/[0.08]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize leading-relaxed">
            {description.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>
      )}

      {/* Preços */}
      <div className="px-5 py-4 grid gap-2.5">
        {vendida ? (
          <div className="grid grid-cols-2 gap-2.5">
            <PriceBox label="Custo"          value={fmt(data.custo_real)}    muted />
            <PriceBox label="Preço de Venda" value={fmt(data.preco_cobrado)} highlight />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <PriceBox label="Custo"          value={fmt(data.custo_real)}    muted />
              <PriceBox label="Cobrado (base)" value={fmt(data.preco_cobrado)} muted />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <PriceBox label="Parceiro"  value={fmt(data.parceiro)} />
              <PriceBox label="À Vista"   value={fmt(data.a_vista)}  highlight />
              <PriceBox label="Parcelado" value={fmt(data.parcelado)} />
            </div>
          </>
        )}
      </div>

    </div>
  );
}
