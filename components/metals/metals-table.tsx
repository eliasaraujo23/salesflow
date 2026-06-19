'use client';

import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { type Metal } from '@/components/firebase-provider';
import { deleteMetalAction } from '@/lib/actions/metals';
import { toast } from 'sonner';

interface MetalsTableProps {
  data: Metal[];
  canDelete: boolean;
}

const METAL_BADGE: Record<string, string> = {
  ouro: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  prata: 'bg-zinc-400/20 text-zinc-500 dark:text-zinc-400',
  platina: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  cadastro: 'Cadastro',
  antigo: 'Antigo',
};

export function MetalsTable({ data, canDelete }: MetalsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const handleDelete = async (item: Metal) => {
    if (!confirm(`Remover registro de ${item.peso}g de ${item.metal}?`)) return;
    const result = await deleteMetalAction(String(item.id));
    if (result.success) {
      toast.success('Registro removido');
    } else {
      toast.error(result.error ?? 'Erro ao remover');
    }
  };

  const columns: ColumnDef<Metal>[] = [
    {
      accessorKey: 'metal',
      header: 'Metal',
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${METAL_BADGE[v] ?? ''}`}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
          {TIPO_LABEL[getValue<string>()] ?? getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'peso',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => column.toggleSorting()}
        >
          Peso (g)
          {column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
           column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
           <ArrowUpDown size={12} />}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{Number(getValue<number>()).toFixed(2)}g</span>
      ),
    },
    {
      accessorKey: 'detalhe',
      header: 'Detalhe',
      cell: ({ getValue }) => (
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{getValue<string | undefined>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'responsavel',
      header: 'Responsável',
      cell: ({ getValue }) => <span className="text-sm text-zinc-900 dark:text-zinc-100">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Data',
      cell: ({ getValue }) => {
        const v = getValue<string>();
        if (!v) return <span className="text-zinc-500 dark:text-zinc-400 text-sm">—</span>;
        const d = new Date(v);
        return <span className="text-sm text-zinc-500 dark:text-zinc-400">{isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR')}</span>;
      },
    },
    ...(canDelete
      ? [{
          id: 'actions',
          header: '',
          cell: ({ row }: { row: { original: Metal } }) => (
            <button
              onClick={() => handleDelete(row.original)}
              className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
              title="Remover"
            >
              <Trash2 size={14} />
            </button>
          ),
        } as ColumnDef<Metal>]
      : []),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
      {data.length === 0 && (
        <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Nenhum registro de metal</div>
      )}
    </div>
  );
}
