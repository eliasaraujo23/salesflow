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
      <div className="px-4 py-4 border-b border-border mb-1 flex items-center gap-3">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-serif text-lg font-bold shrink-0">
          S
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="text-sm font-bold text-text truncate">SalesFlow</div>
          <div className="text-xs text-text-muted truncate">Goldtech</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="px-3 py-2 text-xs font-semibold text-text-muted-2 uppercase tracking-wider mt-2 mb-1">
              {section}
            </div>
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:text-text hover:bg-border'
                  }`}
                >
                  <Icon name={item.icon} size={18} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-border hover:bg-accent/15 transition-all"
          >
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center text-accent text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-text truncate">{currentUser.name}</div>
              <div className="text-xs text-text-muted truncate">{currentUser.cargo || 'Colaborador'}</div>
            </div>
            <ChevronUp
              size={16}
              className={`shrink-0 text-text-muted transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`}
            />
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={handleChangePassword}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-border transition-colors text-left"
              >
                <Lock size={16} />
                Alterar Senha
              </button>
              <div className="border-t border-border" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-semantic-red hover:bg-semantic-red/10 transition-colors text-left"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
