'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { type PhotoBag, getBatchStatus, getBatchDias, type BatchStatus } from '@/lib/actions/photo-bags';
import { useDeletePhotoBag } from '@/hooks/use-photo-bags';
import { toast } from 'sonner';

const STATUS_BADGE: Record<BatchStatus, string> = {
  pendente: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  fotografando: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  editando: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  finalizado: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
};

const STATUS_LABEL: Record<BatchStatus, string> = {
  pendente: 'Pendente',
  fotografando: 'Fotografando',
  editando: 'Editando',
  finalizado: 'Finalizado',
};

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

interface Row extends PhotoBag {
  _status: BatchStatus;
  _dias: number;
}

interface PhotoBagTableProps {
  data: PhotoBag[];
  onEdit: (bag: PhotoBag) => void;
}

export function PhotoBagTable({ data, onEdit }: PhotoBagTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: '_dias', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const deleteMutation = useDeletePhotoBag();

  const rows: Row[] = data.map(b => ({
    ...b,
    _status: getBatchStatus(b),
    _dias: getBatchDias(b),
  }));

  const handleDelete = async (bag: Row) => {
    if (!confirm(`Remover lote de ${fmtDate(bag.data_recebimento)}?`)) return;
    const result = await deleteMutation.mutateAsync(bag.id);
    if (result.httpStatus === 200) {
      toast.success('Lote removido');
    } else {
      toast.error(result.message ?? 'Erro ao remover');
    }
  };

  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: 'data_recebimento',
      header: 'Data Recebimento',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{fmtDate(getValue<string>())}</span>
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
            <div className="text-zinc-400 dark:text-zinc-500">{fab}F · {sec}S · {scrap}Sc</div>
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
      filterFn: 'equals',
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
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Dias
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
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
        <span className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">{getValue<string | undefined>() ?? '—'}</span>
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
    data: rows,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const STATUS_FILTERS: Array<{ key: string; label: string }> = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendente', label: 'Pendente' },
    { key: 'fotografando', label: 'Fotografando' },
    { key: 'editando', label: 'Editando' },
    { key: 'finalizado', label: 'Finalizado' },
  ];

  const activeStatusFilter = (columnFilters.find((f) => f.id === '_status')?.value as string) ?? 'todos';

  const handleStatusFilter = (status: string) => {
    if (status === 'todos') {
      setColumnFilters((prev) => prev.filter((f) => f.id !== '_status'));
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== '_status'),
        { id: '_status', value: status },
      ]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.key}
            onClick={() => handleStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeStatusFilter === s.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800">
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
              <tr key={row.id} className="border-b border-zinc-200 dark:border-white/[0.06] hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors">
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
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhum lote encontrado</div>
        )}
      </div>
    </div>
  );
}
