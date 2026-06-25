'use client';

import React, { useState } from 'react';
import { Download, FileText, Users, Camera, Package, Layers, BarChart2, Star } from 'lucide-react';
import { useFirebase } from '@/components/firebase-provider';
import { fetchPhotoBagsAction } from '@/lib/actions/photo-bags';
import { fetchJfDashboardAction } from '@/lib/actions/fetch-jf-dashboard';
import { fetchJmDashboardAction } from '@/lib/actions/fetch-jm-dashboard';
import { fetchPartnerConsignmentsAction, fetchPartnerSalesAction } from '@/lib/actions/fetch-partners';
import { exportToCsv } from '@/lib/utils/export-csv';
import { toast } from 'sonner';

function fmt(n: number | null | undefined) {
  return n != null ? String(n).replace('.', ',') : '';
}

/* ─── Card de relatório ─── */
interface ReportCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  reports: { label: string; onExport: () => Promise<void> }[];
}

function ReportCard({ icon: Icon, title, description, color, reports }: ReportCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(label: string, fn: () => Promise<void>) {
    setLoading(label);
    try { await fn(); }
    catch { toast.error('Erro ao exportar'); }
    finally { setLoading(null); }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className={`h-[3px] ${color}`} />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Icon size={15} className="text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{description}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {reports.map(r => (
            <button
              key={r.label}
              onClick={() => handle(r.label, r.onExport)}
              disabled={loading === r.label}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-white/[0.06] transition-colors text-left disabled:opacity-60"
            >
              <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{r.label}</span>
              <Download size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ReportsPage() {
  const { tasks, metals, users } = useFirebase();

  const personMap = Object.fromEntries(
    users.filter(u => u.personKey).map(u => [u.personKey, u.name])
  );
  function resolvePerson(p: string) { return personMap[p] ?? p; }

  /* Tarefas */
  async function exportTarefas() {
    exportToCsv('tarefas.csv', tasks.map(t => ({
      id:          String(t.id),
      titulo:      t.title,
      descricao:   t.description ?? '',
      responsavel: resolvePerson(t.person),
      prioridade:  t.priority,
      status:      t.status,
      prazo:       t.due,
      atraso:      t.late,
    })), [
      { key: 'id',          label: 'ID' },
      { key: 'titulo',      label: 'Título' },
      { key: 'descricao',   label: 'Descrição' },
      { key: 'responsavel', label: 'Responsável' },
      { key: 'prioridade',  label: 'Prioridade' },
      { key: 'status',      label: 'Status' },
      { key: 'prazo',       label: 'Prazo' },
      { key: 'atraso',      label: 'Dias Atraso' },
    ]);
  }

  /* Metais */
  async function exportMetais() {
    exportToCsv('metais.csv', metals.map(m => ({
      tipo:       m.tipo,
      metal:      m.metal,
      chegou:     fmt(m.chegou),
      cadastrado: fmt(m.cadastrado),
      sobrou:     fmt(m.sobrou),
      peso:       fmt(m.peso),
      origem:     m.origem,
      data:       m.data,
      obs:        m.obs ?? '',
    })), [
      { key: 'tipo',       label: 'Tipo' },
      { key: 'metal',      label: 'Metal' },
      { key: 'chegou',     label: 'Chegou' },
      { key: 'cadastrado', label: 'Cadastrado' },
      { key: 'sobrou',     label: 'Sobrou' },
      { key: 'peso',       label: 'Peso' },
      { key: 'origem',     label: 'Origem' },
      { key: 'data',       label: 'Data' },
      { key: 'obs',        label: 'Observação' },
    ]);
  }

  /* Fotografia */
  async function exportFotografia() {
    const res = await fetchPhotoBagsAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('fotografia_saquinhos.csv', res.data.map((b, i) => ({
      codigo:          String(i + 1).padStart(5, '0'),
      data_recebimento: b.data_recebimento ?? '',
      qtd_fabricado:   b.qtd_fabricado,
      foto_fabricado:  b.foto_fabricado,
      edit_fabricado:  b.edit_fabricado,
      qtd_second:      b.qtd_second,
      foto_second:     b.foto_second,
      edit_second:     b.edit_second,
      qtd_scrap:       b.qtd_scrap,
      foto_scrap:      b.foto_scrap,
      edit_scrap:      b.edit_scrap,
      data_finalizacao: b.data_finalizacao ?? '',
      observacao:      b.observacao ?? '',
    })), [
      { key: 'codigo',           label: 'Código' },
      { key: 'data_recebimento', label: 'Data Recebimento' },
      { key: 'qtd_fabricado',    label: 'Qtd Fabricado' },
      { key: 'foto_fabricado',   label: 'Foto Fabricado' },
      { key: 'edit_fabricado',   label: 'Edit Fabricado' },
      { key: 'qtd_second',       label: 'Qtd Second' },
      { key: 'foto_second',      label: 'Foto Second' },
      { key: 'edit_second',      label: 'Edit Second' },
      { key: 'qtd_scrap',        label: 'Qtd Scrap' },
      { key: 'foto_scrap',       label: 'Foto Scrap' },
      { key: 'edit_scrap',       label: 'Edit Scrap' },
      { key: 'data_finalizacao', label: 'Data Finalização' },
      { key: 'observacao',       label: 'Observação' },
    ]);
  }

  /* Parceiros — Peças em Campo */
  async function exportParceirosEmCampo() {
    const res = await fetchPartnerConsignmentsAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('parceiros_em_campo.csv', res.data.map(p => ({
      referencia:  p.referencia,
      produto:     p.produto ?? '',
      subtipo:     p.subtipo ?? '',
      tipo_pedra:  p.tipo_pedra ?? '',
      lapidacao:   p.lapidacao ?? '',
      parceiro:    p.destino ?? '',
      tipo:        p.tipo ?? '',
      data_saida:  p.data_saida ?? '',
      dias_campo:  p.dias_campo,
      custo_real:  fmt(p.custo_real),
      preco_minimo: fmt(p.preco_minimo),
      preco_loja:  fmt(p.preco_loja),
    })), [
      { key: 'referencia',  label: 'Referência' },
      { key: 'produto',     label: 'Produto' },
      { key: 'subtipo',     label: 'Subtipo' },
      { key: 'tipo_pedra',  label: 'Tipo Pedra' },
      { key: 'lapidacao',   label: 'Lapidação' },
      { key: 'parceiro',    label: 'Parceiro' },
      { key: 'tipo',        label: 'Tipo' },
      { key: 'data_saida',  label: 'Data Saída' },
      { key: 'dias_campo',  label: 'Dias em Campo' },
      { key: 'custo_real',  label: 'Custo Real' },
      { key: 'preco_minimo', label: 'Preço Mínimo' },
      { key: 'preco_loja',  label: 'Preço Loja' },
    ]);
  }

  /* Parceiros — Vendas */
  async function exportParceirosVendas() {
    const res = await fetchPartnerSalesAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('parceiros_vendas.csv', res.data.map(p => ({
      parceiro:       p.destino,
      produto:        p.produto ?? '',
      subtipo:        p.subtipo ?? '',
      total_vendas:   p.total_vendas,
      ticket_medio:   fmt(p.ticket_medio),
      total_faturado: fmt(p.total_faturado),
    })), [
      { key: 'parceiro',       label: 'Parceiro' },
      { key: 'produto',        label: 'Produto' },
      { key: 'subtipo',        label: 'Subtipo' },
      { key: 'total_vendas',   label: 'Total Vendas' },
      { key: 'ticket_medio',   label: 'Ticket Médio' },
      { key: 'total_faturado', label: 'Total Faturado' },
    ]);
  }

  /* JF — Em Fabricação */
  async function exportJfFabricacao() {
    const res = await fetchJfDashboardAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('jf_em_fabricacao.csv', res.data.emFabricacao.map(r => ({
      referencia:  r.referencia,
      tipo:        r.tipo ?? '',
      produto:     r.produto ?? '',
      subtipo:     r.subtipo ?? '',
      tipo_pedra:  r.tipo_pedra ?? '',
      lapidacao:   r.lapidacao ?? '',
      destino:     r.destino ?? '',
      data_envio:  r.data_envio_fabricacao ?? '',
      custo_real:  fmt(r.custo_real),
      dias:        r.dias,
    })), [
      { key: 'referencia', label: 'Referência' },
      { key: 'tipo',       label: 'Tipo' },
      { key: 'produto',    label: 'Produto' },
      { key: 'subtipo',    label: 'Subtipo' },
      { key: 'tipo_pedra', label: 'Tipo Pedra' },
      { key: 'lapidacao',  label: 'Lapidação' },
      { key: 'destino',    label: 'Destino' },
      { key: 'data_envio', label: 'Data Envio' },
      { key: 'custo_real', label: 'Custo Real' },
      { key: 'dias',       label: 'Dias' },
    ]);
  }

  /* JF — Estoque por Categoria */
  async function exportJfEstoque() {
    const res = await fetchJfDashboardAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('jf_estoque_categoria.csv', res.data.estoqueCategoria.map(r => ({
      produto:       r.produto ?? '',
      subtipo:       r.subtipo ?? '',
      tipo_pedra:    r.tipo_pedra ?? '',
      lapidacao:     r.lapidacao ?? '',
      estoque:       r.estoque,
      em_fabricacao: r.em_fabricacao,
      vendidos:      r.vendidos,
      vendidos_90d:  r.vendidos_90d,
      ticket_medio:  fmt(r.ticket_medio),
    })), [
      { key: 'produto',       label: 'Produto' },
      { key: 'subtipo',       label: 'Subtipo' },
      { key: 'tipo_pedra',    label: 'Tipo Pedra' },
      { key: 'lapidacao',     label: 'Lapidação' },
      { key: 'estoque',       label: 'Estoque' },
      { key: 'em_fabricacao', label: 'Em Fabricação' },
      { key: 'vendidos',      label: 'Vendidos' },
      { key: 'vendidos_90d',  label: 'Vendidos 90d' },
      { key: 'ticket_medio',  label: 'Ticket Médio' },
    ]);
  }

  /* JM — Estoque */
  async function exportJmEstoque() {
    const res = await fetchJmDashboardAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('jm_estoque.csv', res.data.listaEstoque.map(r => ({
      referencia:  r.referencia,
      tipo:        r.tipo ?? '',
      produto:     r.produto ?? '',
      subtipo:     r.subtipo ?? '',
      tipo_pedra:  r.tipo_pedra ?? '',
      lapidacao:   r.lapidacao ?? '',
      destino:     r.destino ?? '',
      peso:        fmt(r.peso),
      custo_real:  fmt(r.custo_real),
      dias:        r.dias,
    })), [
      { key: 'referencia', label: 'Referência' },
      { key: 'tipo',       label: 'Tipo' },
      { key: 'produto',    label: 'Produto' },
      { key: 'subtipo',    label: 'Subtipo' },
      { key: 'tipo_pedra', label: 'Tipo Pedra' },
      { key: 'lapidacao',  label: 'Lapidação' },
      { key: 'destino',    label: 'Destino' },
      { key: 'peso',       label: 'Peso' },
      { key: 'custo_real', label: 'Custo Real' },
      { key: 'dias',       label: 'Dias' },
    ]);
  }

  /* JM — Faturamento */
  async function exportJmFaturamento() {
    const res = await fetchJmDashboardAction();
    if (!res.data) { toast.error(res.message ?? 'Erro'); return; }
    exportToCsv('jm_faturamento.csv', res.data.listaFaturamento.map(r => ({
      referencia:     r.referencia,
      tipo:           r.tipo ?? '',
      produto:        r.produto ?? '',
      subtipo:        r.subtipo ?? '',
      tipo_pedra:     r.tipo_pedra ?? '',
      lapidacao:      r.lapidacao ?? '',
      destino:        r.destino ?? '',
      peso:           fmt(r.peso),
      custo_real:     fmt(r.custo_real),
      preco_cobrado:  fmt(r.preco_cobrado),
      data_venda:     r.data_venda ?? '',
      nf:             r.nf_joia ?? '',
      vendedor:       r.vendedor_interno ?? '',
    })), [
      { key: 'referencia',    label: 'Referência' },
      { key: 'tipo',          label: 'Tipo' },
      { key: 'produto',       label: 'Produto' },
      { key: 'subtipo',       label: 'Subtipo' },
      { key: 'tipo_pedra',    label: 'Tipo Pedra' },
      { key: 'lapidacao',     label: 'Lapidação' },
      { key: 'destino',       label: 'Destino' },
      { key: 'peso',          label: 'Peso' },
      { key: 'custo_real',    label: 'Custo Real' },
      { key: 'preco_cobrado', label: 'Preço Cobrado' },
      { key: 'data_venda',    label: 'Data Venda' },
      { key: 'nf',            label: 'NF' },
      { key: 'vendedor',      label: 'Vendedor' },
    ]);
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Relatórios</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Extraia dados do sistema em CSV (separado por ;) — compatível com Excel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        <ReportCard
          icon={FileText}
          title="Tarefas"
          description="Todas as tarefas da equipe"
          color="bg-indigo-500"
          reports={[
            { label: 'Exportar todas as tarefas', onExport: exportTarefas },
          ]}
        />

        <ReportCard
          icon={Camera}
          title="Fotografia"
          description="Saquinhos e contagens de fotos/edições"
          color="bg-violet-500"
          reports={[
            { label: 'Exportar saquinhos', onExport: exportFotografia },
          ]}
        />

        <ReportCard
          icon={Users}
          title="Parceiros"
          description="Peças em campo e vendas por parceiro"
          color="bg-amber-500"
          reports={[
            { label: 'Peças em campo', onExport: exportParceirosEmCampo },
            { label: 'Vendas por parceiro', onExport: exportParceirosVendas },
          ]}
        />

        <ReportCard
          icon={Layers}
          title="JF — Fabricações"
          description="Estoque e peças em produção JF"
          color="bg-blue-500"
          reports={[
            { label: 'Em Fabricação', onExport: exportJfFabricacao },
            { label: 'Estoque por Categoria', onExport: exportJfEstoque },
          ]}
        />

        <ReportCard
          icon={BarChart2}
          title="JM — Joias"
          description="Estoque e faturamento JM"
          color="bg-emerald-500"
          reports={[
            { label: 'Estoque JM', onExport: exportJmEstoque },
            { label: 'Faturamento JM', onExport: exportJmFaturamento },
          ]}
        />

        <ReportCard
          icon={Package}
          title="Metais"
          description="Histórico de entradas e saldo de metais"
          color="bg-yellow-500"
          reports={[
            { label: 'Exportar metais', onExport: exportMetais },
          ]}
        />

      </div>
    </div>
  );
}
