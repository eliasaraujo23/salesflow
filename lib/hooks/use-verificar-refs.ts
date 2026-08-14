'use client';

import { useState, useCallback, useRef } from 'react';

export type VerificarStatus = 'idle' | 'running' | 'done' | 'error';

export interface VerificarRefsState {
  status:        VerificarStatus;
  done:          number;
  total:         number;
  refsPresentes: Set<string>;
  statusMsg:     string;
  fatalError:    string;
}

const INITIAL: VerificarRefsState = {
  status:        'idle',
  done:          0,
  total:         0,
  refsPresentes: new Set(),
  statusMsg:     '',
  fatalError:    '',
};

export function useVerificarRefs() {
  const [state,    setState]    = useState<VerificarRefsState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const verificar = useCallback(async (params: {
    nome:   string;
    leilao: string;
    refs:   string[];
  }) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ ...INITIAL, status: 'running', total: params.refs.length });

    try {
      const res = await fetch('/api/leilao/verificar-refs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
        signal:  ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setState(s => ({ ...s, status: 'error', fatalError: `HTTP ${res.status}` }));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          let event: Record<string, unknown>;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          const type = event.type as string;

          if (type === 'status') {
            setState(s => ({ ...s, statusMsg: (event.message as string) ?? '' }));

          } else if (type === 'progress') {
            const ref   = (event.ref   as string).toUpperCase();
            const existe = event.existe as boolean;
            setState(s => {
              const next = new Set(s.refsPresentes);
              if (existe) next.add(ref);
              return { ...s, done: event.done as number, refsPresentes: next };
            });

          } else if (type === 'done') {
            const lista = (event.refsPresentes as string[]).map(r => r.toUpperCase());
            setState(s => ({
              ...s,
              status:        'done',
              refsPresentes: new Set(lista),
              statusMsg:     '',
            }));

          } else if (type === 'error') {
            setState(s => ({
              ...s,
              status:     'error',
              fatalError: (event.message as string) ?? 'Erro desconhecido',
            }));
            return;
          }
        }
      }

    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setState(s => ({
        ...s,
        status:     'error',
        fatalError: err instanceof Error ? err.message : 'Erro de rede',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL);
  }, []);

  return { state, verificar, reset };
}
