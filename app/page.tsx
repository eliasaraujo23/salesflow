'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useFirebase();

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        router.push('/(dashboard)/tasks');
      } else {
        router.push('/login');
      }
    }
  }, [currentUser, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
        <div className="text-text-muted">Redirecionando...</div>
      </div>
    </div>
  );
}
