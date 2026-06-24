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
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { type PhotoBag, getBatchStatus, getBatchDias, type BatchStatus } from '@/lib/actions/photo-bags';
import { useDeletePhotoBag } from '@/hooks/use-photo-bags';
import { toast } from 'sonner';

const STATUS_BADGE: Record<BatchStatus, string> = {
  pendente:     'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  fotografando: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  editando:     'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  finalizado:   'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  pendente:     'Pendente',
  fotografando: 'Fotografando',
  editando:     'Editando',
  finalizado:   'Finalizado',
};

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'todos',        label: 'Todos' },
  { key: 'pendente',     label: 'Pendente' },
  { key: 'fotografando', label: 'Fotografando' },
  { key: 'editando',     label: 'Editando' },
  { key: 'finalizado',   label: 'Finalizado' },
];

const diasClass = (d: number): string => {
  if (d <= 3) return 'text-emerald-600 dark:text-emerald-400';
  if (d <= 7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function ProgressCell({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>;
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
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

interface Row extends PhotoBag {
  _status: BatchStatus;
  _dias: number;
}

interface PhotoBagTableProps {
  data: PhotoBag[];
  onEdit: (bag: PhotoBag) => void;
}

export function PhotoBagTable({ data, onEdit }: PhotoBagTableProps) {
  const [activeFilter, setActiveFilter] = useState<string>('todos');
  const [sorting, setSorting] = useState<SortingState>([{ id: '_dias', desc: true }]);
  const deleteMutation = useDeletePhotoBag();

  const rows: Row[] = useMemo(
    () => data.map((b) => ({ ...b, _status: getBatchStatus(b), _dias: getBatchDias(b) })),
    [data],
  );

  const filtered = useMemo(
    () => (activeFilter === 'todos' ? rows : rows.filter((r) => r._status === activeFilter)),
    [rows, activeFilter],
  );

  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const handleDelete = (bag: Row) => {
    setPendingDelete(bag);
  };

  const doDelete = async () => {
    if (!pendingDelete) return;
    const result = await deleteMutation.mutateAsync(pendingDelete.id);
    if (result.httpStatus === 200) {
      toast.success('Lote removido');
    } else {
      toast.error(result.message ?? 'Erro ao remover');
    }
    setPendingDelete(null);
  };

  const thBtn = 'flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100';

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: 'data_recebimento',
      header: ({ column }) => (
        <button className={thBtn} onClick={() => column.toggleSorting()}>
          Data Recebimento <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {fmtDate(getValue<string>())}
        </span>
      ),
    },
    {
      id: 'total_qtd',
      header: 'Total',
      cell: ({ row }) => {
        const { qtd_fabricado: fab, qtd_second: sec, qtd_scrap: scrap } = row.original;
        const total = fab + sec + scrap;
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
            <div>{total} peças</div>
            <div className="text-zinc-400 dark:text-zinc-500">
              {fab > 0 && `${fab}F`}{fab > 0 && sec > 0 && ' · '}{sec > 0 && `${sec}S`}{(fab > 0 || sec > 0) && scrap > 0 && ' · '}{scrap > 0 && `${scrap}Sc`}
            </div>
          </div>
        );
      },
    },
    {
      id: 'fotos',
      header: 'Fotos',
      cell: ({ row }) => {
        const total = row.original.qtd_fabricado + row.original.qtd_second + row.original.qtd_scrap;
        const done = row.original.foto_fabricado + row.original.foto_second + row.original.foto_scrap;
        return <ProgressCell done={done} total={total} />;
      },
    },
    {
      id: 'edicoes',
      header: 'Edições',
      cell: ({ row }) => {
        const total = row.original.qtd_fabricado + row.original.qtd_second + row.original.qtd_scrap;
        const done = row.original.edit_fabricado + row.original.edit_second + row.original.edit_scrap;
        return <ProgressCell done={done} total={total} />;
      },
    },
    {
      accessorKey: '_status',
      header: 'Status',
      cell: ({ getValue }) => {
        const v = getValue<BatchStatus>();
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[v]}`}>
            {STATUS_LABEL[v]}
          </span>
        );
      },
    },
    {
      accessorKey: '_dias',
      header: ({ column }) => (
        <button className={thBtn} onClick={() => column.toggleSorting()}>
          Dias <SortIcon dir={column.getIsSorted()} />
        </button>
      ),
      cell: ({ getValue }) => {
        const d = getValue<number>();
        return <span className={`text-sm font-semibold ${diasClass(d)}`}>{d}d</span>;
      },
    },
    {
      accessorKey: 'observacao',
      header: 'Observação',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
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
            onClick={() => onEdit(row.original)}
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

  return (
    <>
    <ConfirmDialog
      open={!!pendingDelete}
      onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
      title="Remover lote"
      description={pendingDelete ? `Remover lote de ${fmtDate(pendingDelete.data_recebimento)}?` : ''}
      confirmLabel="Remover"
      onConfirm={doDelete}
    />
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === s.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.13]">
        <table className="w-full text-sm data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.13] bg-zinc-50 dark:bg-zinc-800">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
                className="border-b border-zinc-200 dark:border-white/[0.13] hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
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
            Nenhum lote encontrado
          </div>
        )}
      </div>
    </div>
    </>
  );
}
