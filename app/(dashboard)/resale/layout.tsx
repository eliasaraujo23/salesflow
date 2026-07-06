'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Vendas',  href: '/resale' },
  { label: 'Brechós', href: '/resale/breachos' },
];

export default function ResaleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 px-5 pt-3 pb-0 shrink-0">
        <div className="flex gap-1">
          {TABS.map(tab => {
            const isActive = tab.href === '/resale'
              ? pathname === '/resale'
              : pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
