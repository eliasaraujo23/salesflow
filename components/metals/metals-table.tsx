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
import { ArrowDown, Trash2, Scale } from 'lucide-react';
import { type Metal } from '@/components/firebase-provider';
import { deleteMetalAction } from '@/lib/actions/metals';
import { toast } from 'sonner';

const METAL_BADGE: Record<string, string> = {
  ouro:    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  prata:   'bg-zinc-400/15 text-zinc-500 dark:text-zinc-300',
  platina: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

const METAL_LABELS: Record<string, string> = {
  ouro: 'Ouro', prata: 'Prata', platina: 'Platina',
};

const ORIGEM_LABELS: Record<string, string> = {
  second: 'Second Hand',
  scrap:  'Scrap',
  novo:   'Novo',
  proprio: 'Próprio',
};

const TIPO_LABELS: Record<string, string> = {
  entrada: 'Entrada', cadastro: 'Cadastro', antigo: 'Antigo',
};

const fmtDate = (s: string | undefined | null): string => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
};

interface MetalsTableRow extends Metal {
  saldoAcum: number;
}

interface MetalsTableProps {
  metals: Metal[];
  canDelete: boolean;
}

const ALL = '__all__';

export function MetalsTable({ metals, canDelete }: MetalsTableProps) {
  const [filterMetal, setFilterMetal] = useState(ALL);
  const [filterOrigem, setFilterOrigem] = useState(ALL);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'data', desc: true }]);

  const metalOptions = useMemo(
    () => [...new Set(metals.map((m) => m.metal))].sort(),
    [metals],
  );
  const origemOptions = useMemo(
    () => [...new Set(metals.map((m) => m.origem).filter(Boolean))].sort(),
    [metals],
  );

  const rowsWithSaldo: MetalsTableRow[] = useMemo(() => {
    const sorted = [...metals].sort((a, b) => {
      const da = a.data ?? '';
      const db = b.data ?? '';
      if (da !== db) return da < db ? -1 : 1;
      const ca = typeof a.createdAt === 'number' ? a.createdAt : Number(a.createdAt ?? 0);
      const cb = typeof b.createdAt === 'number' ? b.createdAt : Number(b.createdAt ?? 0);
      return ca - cb;
    });

    const running: Record<string, number> = {};
    const mapped = sorted.map((m) => {
      running[m.metal] = (running[m.metal] ?? 0) + (m.sobrou ?? 0);
      return { ...m, saldoAcum: running[m.metal] };
    });
    return mapped.reverse();
  }, [metals]);

  const filtered = useMemo(() => {
    return rowsWithSaldo.filter((r) => {
      if (filterMetal !== ALL && r.metal !== filterMetal) return false;
      if (filterOrigem !== ALL && r.origem !== filterOrigem) return false;
      return true;
    });
  }, [rowsWithSaldo, filterMetal, filterOrigem]);

  const handleDelete = async (item: Metal) => {
    if (!confirm(`Remover registro de ${(item.chegou ?? item.peso ?? 0).toFixed(2)}g de ${item.metal}?`)) return;
    const result = await deleteMetalAction(String(item.id));
    if (result.success) {
      toast.success('Registro removido');
    } else {
      toast.error(result.error ?? 'Erro ao remover');
    }
  };

  const columns: ColumnDef<MetalsTableRow>[] = [
    {
      accessorKey: 'data',
      header: () => (
        <span className="flex items-center gap-1">
          Data <ArrowDown size={11} className="opacity-60" />
        </span>
      ),
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {fmtDate(getValue<string | null>())}
        </span>
      ),
    },
    {
      accessorKey: 'metal',
      header: 'Metal',
      cell: ({ getValue }) => {
        const v = getValue<string>();
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${METAL_BADGE[v] ?? ''}`}>
            {METAL_LABELS[v] ?? v}
          </span>
        );
      },
    },
    {
      accessorKey: 'origem',
      header: 'Origem',
      cell: ({ getValue }) => (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {ORIGEM_LABELS[getValue<string>()] ?? getValue<string>() ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Ação',
      cell: ({ getValue }) => (
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 capitalize">
          {TIPO_LABELS[getValue<string>()] ?? getValue<string>()}
        </span>
      ),
    },
    {
      accessorKey: 'chegou',
      header: 'Peso',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {Number(getValue<number>() ?? 0).toFixed(2)}g
        </span>
      ),
    },
    {
      accessorKey: 'saldoAcum',
      header: () => (
        <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs">Saldo Acum.</span>
      ),
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {Number(getValue<number>()).toFixed(2)}g
        </span>
      ),
    },
    ...(canDelete
      ? [{
          id: 'actions',
          header: '',
          cell: ({ row }: { row: { original: Metal } }) => (
            <button
              onClick={() => handleDelete(row.original)}
              className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
              title="Remover"
            >
              <Trash2 size={13} />
            </button>
          ),
        } as ColumnDef<MetalsTableRow>]
      : []),
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectCls =
    'px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-white/[0.04]">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          Histórico — Entradas &amp; Saídas
        </h3>
        <div className="flex gap-2">
          <select value={filterMetal} onChange={(e) => setFilterMetal(e.target.value)} className={selectCls}>
            <option value={ALL}>Todos os metais</option>
            {metalOptions.map((m) => (
              <option key={m} value={m}>{METAL_LABELS[m] ?? m}</option>
            ))}
          </select>
          <select value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)} className={selectCls}>
            <option value={ALL}>Todas as origens</option>
            {origemOptions.map((o) => (
              <option key={o} value={o}>{ORIGEM_LABELS[o] ?? o}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-100 dark:border-white/[0.04] bg-zinc-50 dark:bg-zinc-800/60">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
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
      </div>

      {filtered.length === 0 && (
        <div className="py-14 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-3">
          <Scale size={32} className="opacity-40" />
          <p className="text-sm font-medium">Nenhuma entrada registrada</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Use o formulário acima para registrar a{' '}
            <span className="text-indigo-500">primeira entrada</span>
          </p>
        </div>
      )}
    </div>
  );
}
