'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Printer } from 'lucide-react';
import { type PhotoBag, getBatchStatus, type BatchStatus } from '@/lib/actions/photo-bags';
import { useDeletePhotoBag } from '@/hooks/use-photo-bags';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const STATUS_BADGE: Record<BatchStatus, string> = {
  aguardando: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  andamento:  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  finalizado: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  aguardando: 'Aguardando',
  andamento:  'Em andamento',
  finalizado: 'Finalizado',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = iso.slice(0, 10);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
}

function ProgressCell({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-14 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done >= total ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{done}/{total}</span>
    </div>
  );
}

function SortIcon({ dir }: { dir: false | 'asc' | 'desc' }) {
  if (dir === 'asc') return <ArrowUp size={12} />;
  if (dir === 'desc') return <ArrowDown size={12} />;
  return <ArrowUpDown size={12} />;
}

function printBagLabel(bag: PhotoBag, code: string) {
  const total = bag.qtd_fabricado + bag.qtd_second + bag.qtd_scrap;
  const date  = fmtDate(bag.data_recebimento);

  const rowFab   = bag.qtd_fabricado > 0
    ? `<tr><td class="lbl" colspan="2">FABRICADO</td><td class="val" colspan="2">${bag.qtd_fabricado} pe&ccedil;as</td></tr>` : '';
  const rowSec   = bag.qtd_second > 0
    ? `<tr><td class="lbl" colspan="2">SECOND</td><td class="val" colspan="2">${bag.qtd_second} pe&ccedil;as</td></tr>` : '';
  const rowScrap = bag.qtd_scrap > 0
    ? `<tr><td class="lbl" colspan="2">SCRAP</td><td class="val" colspan="2">${bag.qtd_scrap} pe&ccedil;as</td></tr>` : '';
  const obsRow = `<tr><td class="lbl" colspan="2">OBS.</td><td class="val obs" colspan="2">${bag.observacao ?? '—'}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A5 landscape; margin: 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background:#fff; color:#000; }
  table { width:100%; border-collapse:collapse; }
  colgroup col:nth-child(1),
  colgroup col:nth-child(3) { width:22%; }
  colgroup col:nth-child(2),
  colgroup col:nth-child(4) { width:28%; }
  td { border: 3px solid #000; padding: 12px 16px; }
  .lbl { font-size:18pt; font-weight:700; text-transform:uppercase; white-space:nowrap; }
  .val { font-size:22pt; font-weight:700; }
  .val.code { font-size:38pt; font-weight:900; letter-spacing:4px; text-align:center; padding:14px; }
  .val.obs { font-size:16pt; font-weight:400; }
  .section-header {
    text-align:center; font-size:16pt; font-weight:700;
    text-transform:uppercase; letter-spacing:1px;
    background:#000; color:#fff; padding:8px;
  }
</style>
</head>
<body>
<table>
  <colgroup><col/><col/><col/><col/></colgroup>
  <tr>
    <td colspan="4" class="val code">#${code}</td>
  </tr>
  <tr>
    <td class="lbl">DATA REC.</td>
    <td class="val">${date}</td>
    <td class="lbl">TOTAL PE&Ccedil;AS</td>
    <td class="val">${total}</td>
  </tr>
  <tr>
    <td colspan="4" class="section-header">COMPOSI&Ccedil;&Atilde;O</td>
  </tr>
  ${rowFab}${rowSec}${rowScrap}
  ${obsRow}
</table>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); toast.error('Erro ao preparar impressão'); return; }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 300);
}

interface Row extends PhotoBag {
  _status: BatchStatus;
  _code: string;
}

interface PhotoBagTableProps {
  data: PhotoBag[];
  onEdit: (bag: PhotoBag, code: string) => void;
}

const FILTER_OPTIONS = [
  { value: '',           label: 'Em aberto' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'andamento',  label: 'Em andamento' },
  { value: 'finalizado', label: 'Arquivados (Finalizado)' },
  { value: 'todos',      label: 'Todos (incl. finalizados)' },
];

export function PhotoBagTable({ data, onEdit }: PhotoBagTableProps) {
  const [filterStatus, setFilterStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'data_recebimento', desc: true }]);
  const deleteMutation = useDeletePhotoBag();
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  // Sequential code: sort all bags by created_at (or data_recebimento) ascending → 00001, 00002 …
  const codeMap = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const ca = a.created_at ?? a.data_recebimento ?? '';
      const cb = b.created_at ?? b.data_recebimento ?? '';
      return ca < cb ? -1 : ca > cb ? 1 : 0;
    });
    const map = new Map<string | number, string>();
    sorted.forEach((b, i) => map.set(b.id, String(i + 1).padStart(5, '0')));
    return map;
  }, [data]);

  const rows: Row[] = useMemo(
    () => data.map((b) => ({ ...b, _status: getBatchStatus(b), _code: codeMap.get(b.id) ?? '?????' })),
    [data, codeMap],
  );

  const filtered = useMemo(() => {
    const buscaLc = busca.toLowerCase();
    return rows.filter((r) => {
      const st = r._status;
      if (!filterStatus && st === 'finalizado') return false;
      if (filterStatus === 'finalizado' && st !== 'finalizado') return false;
      if (filterStatus && filterStatus !== 'todos' && filterStatus !== 'finalizado' && st !== filterStatus) return false;
      if (buscaLc) {
        const hay = [r._code, r.data_recebimento, r.data_finalizacao, r.observacao].join(' ').toLowerCase();
        if (!hay.includes(buscaLc)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, busca]);

  const handleDelete = (bag: Row) => setPendingDelete(bag);

  const doDelete = async () => {
    if (!pendingDelete) return;
    const result = await deleteMutation.mutateAsync(pendingDelete.id);
    if (result.httpStatus === 200) toast.success('Lote removido');
    else toast.error(result.message ?? 'Erro ao remover');
    setPendingDelete(null);
  };

  const thBtn = 'flex items-center justify-center gap-1 w-full text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer';

  const columns: ColumnDef<Row>[] = [
    {
      id: 'codigo',
      accessorFn: (r) => r._code,
      header: ({ column }) => (
        <button className={thBtn} onClick={() => column.toggleSorting()}>
          # <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums tracking-wider">
          {row.original._code}
        </span>
      ),
    },
    {
      accessorKey: 'data_recebimento',
      header: ({ column }) => (
        <button className={thBtn} onClick={() => column.toggleSorting()}>
          Data Rec. <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
          {fmtDate(getValue<string>())}
        </span>
      ),
    },
    {
      id: 'fabricado',
      header: () => <div className="text-center"><div>Fabricado</div><div className="text-[10px] font-normal opacity-60">Rec / Foto / Edit</div></div>,
      cell: ({ row }) => {
        const { qtd_fabricado: q, foto_fabricado: f, edit_fabricado: e } = row.original;
        if (!q) return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
        return <span className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{q} / {f} / {e}</span>;
      },
    },
    {
      id: 'second',
      header: () => <div className="text-center"><div>Second</div><div className="text-[10px] font-normal opacity-60">Rec / Foto / Edit</div></div>,
      cell: ({ row }) => {
        const { qtd_second: q, foto_second: f, edit_second: e } = row.original;
        if (!q) return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
        return <span className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{q} / {f} / {e}</span>;
      },
    },
    {
      id: 'scrap',
      header: () => <div className="text-center"><div>Scrap</div><div className="text-[10px] font-normal opacity-60">Rec / Foto / Edit</div></div>,
      cell: ({ row }) => {
        const { qtd_scrap: q, foto_scrap: f, edit_scrap: e } = row.original;
        if (!q) return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
        return <span className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{q} / {f} / {e}</span>;
      },
    },
    {
      id: 'total_rec',
      header: 'Total Rec.',
      cell: ({ row }) => {
        const total = row.original.qtd_fabricado + row.original.qtd_second + row.original.qtd_scrap;
        return <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{total || '—'}</span>;
      },
    },
    {
      id: 'fotografado',
      header: 'Fotografado',
      cell: ({ row }) => {
        const total = row.original.qtd_fabricado + row.original.qtd_second + row.original.qtd_scrap;
        const done  = row.original.foto_fabricado + row.original.foto_second + row.original.foto_scrap;
        return <ProgressCell done={done} total={total} />;
      },
    },
    {
      id: 'editado',
      header: 'Editado',
      cell: ({ row }) => {
        const total = row.original.qtd_fabricado + row.original.qtd_second + row.original.qtd_scrap;
        const done  = row.original.edit_fabricado + row.original.edit_second + row.original.edit_scrap;
        return <ProgressCell done={done} total={total} />;
      },
    },
    {
      accessorKey: '_status',
      header: 'Status',
      cell: ({ getValue }) => {
        const v = getValue<BatchStatus>();
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_BADGE[v]}`}>
            {STATUS_LABEL[v]}
          </span>
        );
      },
    },
    {
      accessorKey: 'data_finalizacao',
      header: 'Data Fin.',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {fmtDate(getValue<string | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'observacao',
      header: 'Obs.',
      cell: ({ getValue }) => (
        <span
          className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap block"
          title={getValue<string | undefined>() ?? ''}
        >
          {getValue<string | undefined>() ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => printBagLabel(row.original, row.original._code)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded"
            title="Imprimir etiqueta"
          >
            <Printer size={14} />
          </button>
          <button
            onClick={() => onEdit(row.original, row.original._code)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
            title="Remover"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectCls = 'px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <>
    <ConfirmDialog
      open={!!pendingDelete}
      onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
      title="Remover lote"
      description={pendingDelete ? `Remover saquinho #${pendingDelete._code}?` : ''}
      confirmLabel="Remover"
      onConfirm={doDelete}
    />

    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04]">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Saquinhos</span>
        <div className="flex-1" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectCls}>
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar código, data ou obs…"
          className={`${selectCls} w-52`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm data-table" style={{ minWidth: 960 }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-100 dark:border-white/[0.04] bg-zinc-50 dark:bg-zinc-800/60">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            Nenhum saquinho encontrado
          </div>
        )}
      </div>
    </div>
    </>
  );
}
