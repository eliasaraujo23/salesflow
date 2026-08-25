'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { NAVIGATION_ITEMS } from '@/lib/constants';

type MinUser = { role: string; permissions: string[] };

function canAccess(user: MinUser, href: string): boolean {
  const item = NAVIGATION_ITEMS.find(i => href === i.href || href.startsWith(i.href + '/'));
  if (!item) return true;
  if (user.role === 'admin') return true;
  if (item.adminOnly) return false;
  if (!item.permission) return true;
  return user.permissions.includes(item.permission);
}

function firstAllowedHref(user: MinUser): string {
  const item = NAVIGATION_ITEMS.find(i => canAccess(user, i.href));
  return item?.href ?? '/tasks';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, loading } = useFirebase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  useEffect(() => {
    if (!loading && !currentUser) router.push('/login');
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (!loading && currentUser && !canAccess(currentUser, pathname)) {
      router.replace(firstAllowedHref(currentUser));
    }
  }, [currentUser, loading, pathname, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mx-auto mb-3" />
          <div className="text-sm text-zinc-400">Carregando...</div>
        </div>
      </div>
    );
  }

  // Block rendering while redirect is pending (prevents flash of unauthorized content)
  if (!canAccess(currentUser, pathname)) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Topbar
        onMobileMenu={() => setMobileMenuOpen(o => !o)}
        desktopCollapsed={desktopCollapsed}
      />

      <div className="flex-1 flex overflow-hidden min-w-0">
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-topbar z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          desktopCollapsed={desktopCollapsed}
          setDesktopCollapsed={setDesktopCollapsed}
        />

        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
