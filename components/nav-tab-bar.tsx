'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavTab {
  label: string;
  href: string;
  active: boolean;
}

interface NavTabBarProps {
  tabs: NavTab[];
  variant?: 'pill' | 'underline';
  className?: string;
}

export function NavTabBar({ tabs, variant = 'pill', className }: NavTabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 2);
    setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => updateFades();
    el.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(updateFades);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [tabs]);

  return (
    <div className={cn('relative min-w-0', className)}>
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'shrink-0 whitespace-nowrap text-[13px] font-medium transition-colors',
              variant === 'pill'
                ? cn(
                    'px-3 py-1 rounded-md',
                    tab.active
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
                  )
                : cn(
                    'px-4 py-2 border-b-2 -mb-px',
                    tab.active
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {showLeftFade && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent" />
      )}
    </div>
  );
}
