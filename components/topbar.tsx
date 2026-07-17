'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sun, Moon, CloudCheck, Menu, ChevronRight } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onMobileMenu?: () => void;
}

export function Topbar({ title, subtitle, onMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(dark);
    if (!dark) document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, []);

  const navItem = NAVIGATION_ITEMS.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const pageTitle = title ?? navItem?.label ?? 'SalesFlow';

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <header className="h-topbar bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.13] px-3 md:px-6 flex items-center justify-between shrink-0 gap-2">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMobileMenu}
          className="md:hidden shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          title="Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50 truncate shrink-0">
            {(pathname.startsWith('/fabricacoes-jf') || pathname === '/analise-jf' || pathname === '/carros-chefe')
              ? 'Fabricações JF'
              : (pathname.startsWith('/partners') || pathname.startsWith('/graficos/parceiros'))
              ? 'Parceiros'
              : (pathname === '/tasks' || pathname === '/ia')
              ? 'Minhas Tarefas'
              : pathname.startsWith('/painel')
              ? 'Painel Mensal'
              : pageTitle}
          </div>
          {subtitle && (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              {subtitle}
            </div>
          )}
          {/* Inline tabs for /fabricacoes-jf + /analise-jf + /carros-chefe */}
          {(pathname.startsWith('/fabricacoes-jf') || pathname === '/analise-jf' || pathname === '/carros-chefe') && (
            <div className="flex items-center gap-1 ml-1">
              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
              {[
                { label: 'Estoque',      href: '/fabricacoes-jf' },
                { label: 'Análise',      href: '/analise-jf' },
                { label: 'Carros-Chefe', href: '/carros-chefe' },
              ].map(tab => {
                const isActive = tab.href === '/fabricacoes-jf'
                  ? pathname === '/fabricacoes-jf'
                  : pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
          {/* Inline tabs for /tasks + /ia */}
          {(pathname === '/tasks' || pathname === '/ia') && (
            <div className="flex items-center gap-1 ml-1">
              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
              {[
                { label: 'Tarefas',      href: '/tasks' },
                { label: 'IA Reuniões',  href: '/ia' },
              ].map(tab => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
          {/* Inline tabs for /partners + /graficos/parceiros */}
          {(pathname.startsWith('/partners') || pathname.startsWith('/graficos/parceiros')) && (
            <div className="flex items-center gap-1 ml-1">
              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
              {[
                { label: 'Parceiros', href: '/partners' },
                { label: 'Evolução',  href: '/graficos/parceiros' },
              ].map(tab => {
                const isActive = tab.href === '/partners'
                  ? pathname === '/partners'
                  : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
          {/* Inline tabs for /painel */}
          {pathname.startsWith('/painel') && (
            <div className="flex items-center gap-1 ml-1 overflow-x-auto min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
              {[
                { label: 'Vendas Gerais', href: '/painel' },
                { label: 'B2B B2C',       href: '/painel/canais' },
                { label: 'Parceiros', href: '/painel/parceiros' },
                { label: 'Eternno',       href: '/painel/eternno' },
                { label: 'Leilões',       href: '/painel/leiloes' },
                { label: 'Mercado Livre', href: '/painel/mercado-livre' },
                { label: 'Scrap',        href: '/painel/scrap' },
                { label: 'Vida Scrap',   href: '/painel/vida-scrap' },
                { label: 'Joias',        href: '/painel/joias' },
                { label: 'Cadastradas',  href: '/painel/cadastradas' },
                { label: 'Joias/Mês',    href: '/painel/joias-mes' },
                { label: 'Conversão JF', href: '/painel/conversao-jf' },
                { label: 'Conversão JM', href: '/painel/conversao-jm' },
                { label: 'Evolutivo',   href: '/painel/evolutivo' },
              ].map(tab => {
                const isActive = tab.href === '/painel'
                  ? pathname === '/painel'
                  : pathname === tab.href || pathname.startsWith(tab.href + '/');
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`shrink-0 px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
          {/* Inline tabs for /resale */}
          {pathname.startsWith('/resale') && (
            <div className="flex items-center gap-1 ml-1">
              <ChevronRight size={14} className="text-zinc-400 shrink-0" />
              {[
                { label: 'Vendas',  href: '/resale' },
                { label: 'Brechós', href: '/resale/breachos' },
              ].map(tab => {
                const isActive = tab.href === '/resale'
                  ? pathname === '/resale'
                  : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1">

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="p-2 rounded-lg cursor-default text-emerald-500">
          <CloudCheck size={16} />
        </button>
      </div>
    </header>
  );
}
