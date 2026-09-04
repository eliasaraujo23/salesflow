'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { acessoSomenteResumo } from '@/lib/analise-ht/acesso-restrito';

// Bloqueia acesso direto por URL às abas de Análise HT fora do Resumo para
// usuários restritos (ex: Raphael Borges — ver conversa Elias 2026-09-04).
export function SomenteResumoGuard() {
  const router = useRouter();
  const { currentUser } = useFirebase();

  useEffect(() => {
    if (acessoSomenteResumo(currentUser?.email)) {
      router.replace('/analise-ht/resumo');
    }
  }, [currentUser, router]);

  return null;
}
