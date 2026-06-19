'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Sun, Moon, CloudCheck, Bell } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export function Topbar({ title, subtitle, onSearch }: TopbarProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : document.documentElement.classList.contains('dark');
    setIsDark(dark);
    if (!dark) document.documentElement.classList.remove('dark');
  }, []);

  const navItem = NAVIGATION_ITEMS.find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const pageTitle    = title ?? navItem?.label ?? 'SalesFlow';
  const pageSubtitle = subtitle;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

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
    <header className="bg-bg-surface border-b border-border px-6 h-topbar flex items-center justify-between shrink-0">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-text truncate">{pageTitle}</div>
        {pageSubtitle && (
          <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-semantic-green rounded-full animate-pulse shrink-0" />
            {pageSubtitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg border border-border focus-within:border-accent transition-colors">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-text placeholder:text-text-muted w-36"
          />
        </div>

        <button
          title="Notificações"
          className="p-2 rounded-lg hover:bg-border transition-colors text-text-muted hover:text-text"
        >
          <Bell size={17} />
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
          className="p-2 rounded-lg hover:bg-border transition-colors text-text-muted hover:text-text"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          title="Sincronizado"
          className="p-2 rounded-lg cursor-default text-semantic-green"
        >
          <CloudCheck size={17} />
        </button>
      </div>
    </header>
  );
}
