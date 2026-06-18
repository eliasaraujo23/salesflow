'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/icon-map';
import { Search, Sun, Moon, CloudCheck, Bell } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export function Topbar({ title, subtitle, onSearch }: TopbarProps) {
  const [isDark, setIsDark] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

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
      {/* Left: Title */}
      <div className="flex-1">
        <div className="text-base font-semibold text-text">{title}</div>
        {subtitle && (
          <div className="text-xs text-text-muted flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 bg-semantic-green rounded-full animate-pulse" />
            {subtitle}
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3 ml-6">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-surface-2 border border-border">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-text placeholder-text-muted w-40"
          />
        </div>

        {/* Notifications */}
        <button
          title="Notificações"
          className="p-2 rounded-lg hover:bg-border transition-colors text-text-muted hover:text-text"
        >
          <Bell size={18} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Alternar tema"
          className="p-2 rounded-lg hover:bg-border transition-colors text-text-muted hover:text-text"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Sync Status */}
        <button
          title="Sincronizado com Firebase"
          className="p-2 rounded-lg cursor-default text-semantic-green"
        >
          <CloudCheck size={18} />
        </button>
      </div>
    </header>
  );
}
