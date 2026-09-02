'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter, notFound } from 'next/navigation';
import { getLojaConfig } from '@/lib/controle-config';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { NavTabBar, type NavTab } from '@/components/nav-tab-bar';
import { useFirebase } from '@/components/firebase-provider';
import { LOJAS } from '@/lib/controle-config';

const TABS = [
  { label: 'Resumo',   href: 'resumo' },
  { label: 'Metal',    href: 'metal' },
  { label: 'Caixa',    href: 'caixa' },
  { label: 'Entradas', href: 'entradas' },
  { label: 'Despesas', href: 'despesas' },
  { label: 'Config',   href: 'config' },
];

interface Props {
  children: React.ReactNode;
}

export default function LojaLayout({ children }: Props) {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode);
  if (!loja) notFound();

  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useFirebase();

  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions ?? [];
  const hasAccess = isAdmin || perms.includes(loja.permission) || perms.includes('controle');

  const acessibleLojas = isAdmin
    ? LOJAS
    : LOJAS.filter(l => perms.includes(l.permission) || perms.includes('controle'));
  const hasMultipleLojas = acessibleLojas.length > 1;

  if (currentUser && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <ShieldAlert size={32} className="text-red-400" />
        <div>
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Acesso não autorizado</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Você não tem permissão para acessar {loja.label}.</p>
        </div>
        <button
          onClick={() => router.push('/controle')}
          className="mt-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          Voltar para Controle de Lojas
        </button>
      </div>
    );
  }

  const tabs: NavTab[] = TABS.map(tab => {
    const href = `/controle/${lojaCode}/${tab.href}`;
    return {
      label: tab.label,
      href,
      active: pathname === href || pathname.startsWith(href + '/'),
    };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-5 pt-4 pb-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mb-3">
          {hasMultipleLojas ? (
            <Link href="/controle" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              Controle de Lojas
            </Link>
          ) : (
            <span>Controle de Lojas</span>
          )}
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
        <NavTabBar tabs={tabs} variant="underline" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
