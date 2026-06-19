'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { Icon } from '@/components/icon-map';
import { useLogout } from '@/hooks/use-logout';
import { toast } from 'sonner';
import { LogOut, Lock, ChevronUp } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, logOut } = useFirebase();
  const { mutate: logout } = useLogout();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const sections = useMemo(() => {
    return NAVIGATION_ITEMS.reduce(
      (acc, item) => {
        if (item.adminOnly && currentUser?.role !== 'admin') return acc;
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
      },
      {} as Record<string, typeof NAVIGATION_ITEMS>
    );
  }, [currentUser?.role]);

  const handleLogout = async () => {
    logout(undefined, {
      onSuccess: async () => {
        try { await logOut(); toast.success('Sessão encerrada.'); }
        catch { toast.error('Erro ao sair'); }
      },
      onError: () => toast.error('Erro ao sair'),
    });
  };

  if (!currentUser) return null;
  const initials = getInitials(currentUser.name);

  return (
    <aside className="w-sidebar shrink-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-white/[0.06]">

      {/* Logo */}
      <div className="h-topbar px-4 flex items-center gap-2.5 border-b border-zinc-200 dark:border-white/[0.06] shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md shadow-indigo-500/25">
          S
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-50 leading-none">SalesFlow</div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">Goldtech Joias</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-zinc-400 dark:text-zinc-600 px-2 mb-1">
              {section}
            </div>
            <div className="space-y-px">
              {items.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon name={item.icon} size={15} className={isActive ? 'text-white/90' : ''} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-200 dark:border-white/[0.06] p-2.5">
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-none mb-0.5">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate leading-none">
                {currentUser.cargo || 'Colaborador'}
              </div>
            </div>
            <ChevronUp size={13} className={`shrink-0 text-zinc-400 transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`} />
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-xl overflow-hidden z-50">
              <button
                onClick={() => { toast.info('Alterar senha em breve'); setProfileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors text-left"
              >
                <Lock size={13} />
                Alterar Senha
              </button>
              <div className="border-t border-zinc-100 dark:border-white/[0.06]" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
              >
                <LogOut size={13} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
