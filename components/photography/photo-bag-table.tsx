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
import { type PhotoBag } from '@/lib/actions/photo-bags';
import { useDeletePhotoBag } from '@/hooks/use-photo-bags';
import { toast } from 'sonner';

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  fotografado: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  catalogado: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
  finalizado: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  fotografado: 'Fotografado',
  catalogado: 'Catalogado',
  finalizado: 'Finalizado',
};

const diasClass = (d: number): string => {
  if (d <= 3) return 'text-emerald-600 dark:text-emerald-400';
  if (d <= 7) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

interface PhotoBagTableProps {
  data: PhotoBag[];
  onEdit: (bag: PhotoBag) => void;
}

export function PhotoBagTable({ data, onEdit }: PhotoBagTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dias', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const deleteMutation = useDeletePhotoBag();

  const handleDelete = async (bag: PhotoBag) => {
    if (!confirm(`Remover saquinho ${bag.cod_saquinho}?`)) return;
    const result = await deleteMutation.mutateAsync(bag.id);
    if (result.httpStatus === 200) {
      toast.success('Saquinho removido');
    } else {
      toast.error(result.message ?? 'Erro ao remover');
    }
  };

  const columns: ColumnDef<PhotoBag>[] = [
    {
      accessorKey: 'cod_saquinho',
      header: 'Código',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'responsavel',
      header: 'Responsável',
      cell: ({ getValue }) => <span className="text-sm text-zinc-900 dark:text-zinc-100">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      filterFn: 'equals',
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE[v] ?? ''}`}>
            {STATUS_LABEL[v] ?? v}
          </span>
        );
      },
    },
    {
      accessorKey: 'dias',
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
      accessorKey: 'detalhes',
      header: 'Detalhes',
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
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const STATUS_FILTERS = ['todos', 'pendente', 'fotografado', 'catalogado', 'finalizado'];
  const activeStatusFilter = (columnFilters.find((f) => f.id === 'status')?.value as string) ?? 'todos';

  const handleStatusFilter = (status: string) => {
    if (status === 'todos') {
      setColumnFilters((prev) => prev.filter((f) => f.id !== 'status'));
    } else {
      setColumnFilters((prev) => [
        ...prev.filter((f) => f.id !== 'status'),
        { id: 'status', value: status },
      ]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all capitalize ${
              activeStatusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
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
          <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhum saquinho encontrado</div>
        )}
      </div>
    </div>
  );
}
