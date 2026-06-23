'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, loading } = useFirebase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) router.push('/login');
  }, [currentUser, loading, router]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMobileMenu={() => setMobileMenuOpen(o => !o)} />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
