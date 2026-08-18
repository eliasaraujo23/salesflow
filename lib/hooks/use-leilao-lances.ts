'use client';

import { useState, useCallback } from 'react';
import type { Lance } from '@/app/api/leilao/lances/route';

export type { Lance };

interface State {
  phase:  'idle' | 'loading' | 'done' | 'error';
  lances: Lance[];
  error:  string;
}

const INIT: State = { phase: 'idle', lances: [], error: '' };

export function useLeilaoLances() {
  const [state, setState] = useState<State>(INIT);

  const fetch_ = useCallback(async (leilao: string, nome: string) => {
    setState({ phase: 'loading', lances: [], error: '' });
    try {
      const params = new URLSearchParams({ leilao, nome });
      const res    = await fetch(`/api/leilao/lances?${params}`);
      const data   = await res.json() as { lances?: Lance[]; error?: string };
      if (data.error) { setState({ phase: 'error', lances: [], error: data.error }); return; }
      setState({ phase: 'done', lances: data.lances ?? [], error: '' });
    } catch (e) {
      setState({ phase: 'error', lances: [], error: e instanceof Error ? e.message : 'Erro' });
    }
  }, []);

  function reset() { setState(INIT); }

  return { state, fetch: fetch_, reset };
}
