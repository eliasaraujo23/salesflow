'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams, notFound } from 'next/navigation';
import { getLojaConfig } from '@/lib/controle-config';
import { ChevronRight } from 'lucide-react';

const TABS = [
  { label: 'Resumo',   href: 'resumo' },
  { label: 'Metal',    href: 'metal' },
  { label: 'Caixa',    href: 'caixa' },
  { label: 'Entradas', href: 'entradas' },
  { label: 'Despesas', href: 'despesas' },
];

interface Props {
  children: React.ReactNode;
}

export default function LojaLayout({ children }: Props) {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-5 pt-4 pb-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mb-3">
          <Link href="/controle" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Controle de Lojas
          </Link>
          <ChevronRight size={12} />
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded text-white text-[10px] font-bold"
              style={{ backgroundColor: loja.cor }}
            >
              {loja.sigla.slice(0, 1)}
            </span>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">{loja.label}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const href = `/controle/${lojaCode}/${tab.href}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={tab.href}
                href={href}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
