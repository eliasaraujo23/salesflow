'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { LOJAS } from '@/lib/controle-config';
import { Building2, ChevronRight } from 'lucide-react';

export default function ControlePage() {
  const router = useRouter();
  const { currentUser } = useFirebase();
  const isAdmin = currentUser?.role === 'admin';
  const perms = currentUser?.permissions ?? [];

  const lojas = LOJAS.filter(l =>
    isAdmin || perms.includes(l.permission) || perms.includes('controle')
  );

  useEffect(() => {
    if (!isAdmin && lojas.length === 1) {
      router.replace(`/controle/${lojas[0].code}/resumo`);
    }
  }, [isAdmin, lojas, router]);

  if (!isAdmin && lojas.length === 1) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Building2 size={22} className="text-indigo-500" />
          Controle de Lojas
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Selecione a loja para acessar o controle de metal, caixa e despesas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lojas.map(loja => (
          <Link
            key={loja.code}
            href={`/controle/${loja.code}/resumo`}
            className="group flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
                style={{ backgroundColor: loja.cor }}
              >
                {loja.sigla}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{loja.label}</div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Metal · Caixa · Despesas</div>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-600 group-hover:text-indigo-500 transition-colors" />
          </Link>
        ))}

        {lojas.length === 0 && (
          <div className="col-span-3 text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
            Você não tem acesso a nenhuma loja ainda.
          </div>
        )}
      </div>
    </div>
  );
}
