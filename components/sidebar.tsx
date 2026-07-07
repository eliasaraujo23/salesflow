'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { Icon } from '@/components/icon-map';
import { useLogout } from '@/hooks/use-logout';
import { toast } from 'sonner';
import { LogOut, Lock, ChevronUp, PanelLeftClose, PanelLeftOpen, X, Eye, EyeOff } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { currentUser, logOut } = useFirebase();
  const { mutate: logout } = useLogout();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState<{ bottom: number; left: number } | null>(null);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  const handleProfileToggle = () => {
    if (!profileMenuOpen && profileBtnRef.current) {
      const rect = profileBtnRef.current.getBoundingClientRect();
      setPopupPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left });
    }
    setProfileMenuOpen(v => !v);
  };

  const openChangePw = () => {
    setNewPw(''); setConfirmPw(''); setPwError(''); setShowPw(false);
    setProfileMenuOpen(false);
    setChangePwOpen(true);
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) { setPwError('Mínimo 6 caracteres'); return; }
    if (newPw !== confirmPw) { setPwError('As senhas não coincidem'); return; }
    setPwLoading(true); setPwError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');
      await updatePassword(user, newPw);
      toast.success('Senha alterada! Faça login novamente.');
      setChangePwOpen(false);
      logOut();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/requires-recent-login') {
        setPwError('Por segurança, faça logout e login novamente antes de trocar a senha.');
      } else {
        setPwError('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setPwLoading(false);
    }
  };

  const sections = useMemo(() => {
    const isAdmin = currentUser?.role === 'admin';
    const perms = currentUser?.permissions ?? [];
    return NAVIGATION_ITEMS.reduce(
      (acc, item) => {
        if (item.adminOnly && !isAdmin) return acc;
        if (!isAdmin && item.permission && !perms.includes(item.permission)) return acc;
        if (!acc[item.section]) acc[item.section] = [];
        acc[item.section].push(item);
        return acc;
      },
      {} as Record<string, typeof NAVIGATION_ITEMS>
    );
  }, [currentUser?.role, currentUser?.permissions]);

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

  // Width: mobile always 248px (overlay drawer), desktop respects collapsed state
  const widthClass = collapsed ? 'w-[248px] md:w-[56px]' : 'w-[248px]';

  return (
    <>
    <aside
      className={[
        'flex flex-col overflow-hidden bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-white/[0.13]',
        widthClass,
        // Mobile: fixed overlay, slides in from left (z-50 sits above the backdrop z-40)
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: back in normal flow, always visible, width transition
        'md:relative md:translate-x-0 md:z-auto md:shrink-0 md:transition-[width] md:duration-200',
      ].join(' ')}
    >
      {/* Logo header — collapsed (desktop only) */}
      {collapsed && (
        <div className="h-topbar hidden md:flex items-center justify-center border-b border-zinc-200 dark:border-white/[0.13] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-[15px] shadow-md shadow-indigo-500/25">
            S
          </div>
        </div>
      )}

      {/* Logo header — expanded */}
      {!collapsed && (
        <div className="h-topbar px-3.5 flex items-center gap-3 border-b border-zinc-200 dark:border-white/[0.13] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-[15px] shadow-md shadow-indigo-500/25 shrink-0">
            S
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50 leading-tight">SalesFlow</div>
            <div className="text-[11.5px] text-zinc-400 dark:text-zinc-500 leading-tight">Goldtech Joias</div>
          </div>
          {/* Desktop: collapse button */}
          <button
            onClick={() => { setCollapsed(true); setProfileMenuOpen(false); }}
            className="hidden md:flex shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
            title="Recolher menu"
          >
            <PanelLeftClose size={16} />
          </button>
          {/* Mobile: close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
            title="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-3 space-y-4">
        {/* Desktop-only collapse/expand toggle */}
        {!collapsed ? (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <PanelLeftClose size={14} className="shrink-0" />
            <span className="truncate">Recolher</span>
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full hidden md:flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors"
            title="Expandir menu"
          >
            <PanelLeftOpen size={15} />
          </button>
        )}

        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            {!collapsed && (
              <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-zinc-400 dark:text-zinc-600 px-2 mb-1">
                {section}
              </div>
            )}
            <div className="space-y-px">
              {items.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    onClick={onMobileClose}
                    className={`flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon name={item.icon} size={15} className={isActive ? 'text-white/90' : ''} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-200 dark:border-white/[0.13] p-1.5">
        <div className="relative">
          <button
            ref={profileBtnRef}
            onClick={handleProfileToggle}
            className={`w-full flex items-center gap-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-colors ${
              collapsed ? 'justify-center px-0' : 'px-2.5'
            }`}
            title={collapsed ? currentUser.name : undefined}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-none mb-0.5">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate leading-none">
                    {currentUser.cargo || 'Colaborador'}
                  </div>
                </div>
                <ChevronUp size={13} className={`shrink-0 text-zinc-400 transition-transform ${profileMenuOpen ? '' : 'rotate-180'}`} />
              </>
            )}
          </button>

          {profileMenuOpen && popupPos && (
            <div
              style={{ position: 'fixed', bottom: popupPos.bottom, left: popupPos.left, minWidth: 160, zIndex: 200 }}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-xl shadow-xl overflow-hidden"
            >
              <button
                onClick={openChangePw}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors text-left"
              >
                <Lock size={13} />
                Alterar Senha
              </button>
              <div className="border-t border-zinc-100 dark:border-white/[0.13]" />
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

    {/* Change password modal */}
    {changePwOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setChangePwOpen(false)} />
        <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-indigo-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Alterar Senha</h2>
            </div>
            <button onClick={() => setChangePwOpen(false)} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleChangePw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Nova senha</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  className="w-full px-3 py-2 pr-9 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">Confirmar nova senha</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {pwError && (
              <p className="text-xs text-red-500 dark:text-red-400">{pwError}</p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {pwLoading ? 'Salvando...' : 'Confirmar alteração'}
            </button>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
