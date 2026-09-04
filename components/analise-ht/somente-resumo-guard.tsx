'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/components/firebase-provider';
import { acessoSomenteResumo } from '@/lib/analise-ht/acesso-restrito';

// Bloqueia acesso direto por URL às abas de Análise HT fora do Resumo para
// usuários restritos (ex: Raphael Borges — ver conversa Elias 2026-09-04).
// Retorna true enquanto o redirect está em andamento — a página chamadora
// deve evitar montar o resto do conteúdo nesse caso, senão hooks como
// useAnaliseHtCalculadora disparam chamadas às APIs bloqueadas e mostram
// toasts de "Sem permissão" antes do redirect completar.
export function useSomenteResumoGuard(): boolean {
  const router = useRouter();
  const { currentUser } = useFirebase();
  const bloqueado = acessoSomenteResumo(currentUser?.email);

  useEffect(() => {
    if (bloqueado) router.replace('/analise-ht/resumo');
  }, [bloqueado, router]);

  return bloqueado;
}

export function SomenteResumoGuard() {
  useSomenteResumoGuard();
  return null;
}
