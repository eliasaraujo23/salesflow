'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, CloudCheck, Bell, Menu } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  onMobileMenu?: () => void;
}

export function Topbar({ title, subtitle, onSearch, onMobileMenu }: TopbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    <header className="h-topbar bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.06] px-3 md:px-6 flex items-center justify-between shrink-0 gap-2">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onMobileMenu}
          className="md:hidden shrink-0 p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          title="Menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50 truncate">
            {pageTitle}
          </div>
          {subtitle && (
            <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/[0.06] focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
          <Search size={13} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
            className="bg-transparent border-none outline-none text-[13px] text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 w-36"
          />
        </div>

        <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
          <Bell size={16} />
        </button>

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
