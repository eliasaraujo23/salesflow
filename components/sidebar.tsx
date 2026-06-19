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
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
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
        try {
          await logOut();
          toast.success('Sessão encerrada com sucesso!');
        } catch {
          toast.error('Erro ao sair');
        }
      },
      onError: () => {
        toast.error('Erro ao sair');
      },
    });
  };

  const handleChangePassword = () => {
    toast.info('Alterar senha em breve');
  };

  if (!currentUser) return null;

  const initials = getInitials(currentUser.name);

  return (
    <aside className="w-sidebar shrink-0 bg-bg-surface border-r border-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 h-topbar flex items-center gap-2.5 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[hsl(229,85%,52%)] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
          S
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-text leading-none">SalesFlow</div>
          <div className="text-[11px] text-text-muted leading-snug">Goldtech Joias</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-text-muted-2 px-2 mb-1">
              {section}
            </div>
            <div className="space-y-px">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-text-muted hover:text-text hover:bg-border/70'
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={15}
                      className={isActive ? 'text-white opacity-90' : ''}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-border/70 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-[hsl(229,85%,52%)] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[12px] font-semibold text-text truncate leading-none mb-0.5">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-text-muted truncate leading-none">
                {currentUser.cargo || 'Colaborador'}
              </div>
            </div>
            <ChevronUp
              size={13}
              className={`shrink-0 text-text-muted transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`}
            />
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={handleChangePassword}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-text hover:bg-border/60 transition-colors text-left"
              >
                <Lock size={13} />
                Alterar Senha
              </button>
              <div className="border-t border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-semantic-red hover:bg-semantic-red/10 transition-colors text-left"
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
