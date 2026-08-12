'use client';

import { useState, useCallback, useRef } from 'react';

export interface PecaDiff {
  ref:        string;
  leilaoPrice: number;
  sistemaPrice: number;
}

export type PecaStatus = 'pending' | 'running' | 'ok' | 'error';

export interface PecaProgress {
  ref:    string;
  status: PecaStatus;
  error?: string;
}

export interface AtualizarPrecoState {
  phase:        'idle' | 'mapping' | 'running' | 'done' | 'error';
  mappingMsg:   string;
  pecas:        PecaProgress[];
  done:         number;
  total:        number;
  successCount: number;
  errorCount:   number;
  fatalError:   string;
}

const INITIAL: AtualizarPrecoState = {
  phase:        'idle',
  mappingMsg:   '',
  pecas:        [],
  done:         0,
  total:        0,
  successCount: 0,
  errorCount:   0,
  fatalError:   '',
};

interface ExecuteParams {
  codigoPlatforma: string;
  nome:            string;
  pecas:           PecaDiff[];
}

export function useAtualizarPreco() {
  const [open,  setOpen]  = useState(false);
  const [state, setState] = useState<AtualizarPrecoState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async ({ codigoPlatforma, nome, pecas }: ExecuteParams) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({
      ...INITIAL,
      phase:      'mapping',
      mappingMsg: 'Conectando...',
      pecas:      pecas.map(p => ({ ref: p.ref, status: 'pending' })),
      total:      pecas.length,
    });

    try {
      const res = await fetch('/api/leilao/atualizar-preco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoPlatforma,
          nome,
          pecas: pecas.map(p => ({ ref: p.ref, novoPreco: p.sistemaPrice })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setState(s => ({ ...s, phase: 'error', fatalError: `HTTP ${res.status}` }));
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

          if (type === 'mapping') {
            setState(s => ({ ...s, phase: 'mapping', mappingMsg: (event.message as string) ?? '' }));

          } else if (type === 'start') {
            setState(s => ({ ...s, phase: 'running', total: (event.total as number) ?? s.total }));

          } else if (type === 'progress') {
            const ref     = event.ref as string;
            const success = event.success as boolean;
            const errMsg  = event.error as string | undefined;
            const doneN   = event.done as number;
            setState(s => ({
              ...s,
              done:         doneN,
              successCount: s.successCount + (success ? 1 : 0),
              errorCount:   s.errorCount   + (success ? 0 : 1),
              pecas: s.pecas.map(p =>
                p.ref === ref
                  ? { ...p, status: success ? 'ok' : 'error', error: errMsg }
                  : p.status === 'pending' && s.pecas.findIndex(x => x.ref === ref) < s.pecas.findIndex(x => x.ref === p.ref)
                    ? p  // still truly pending
                    : p,
              ),
            }));

          } else if (type === 'done') {
            setState(s => ({
              ...s,
              phase:        'done',
              successCount: (event.success as number) ?? s.successCount,
              errorCount:   (event.errors  as number) ?? s.errorCount,
            }));

          } else if (type === 'error') {
            setState(s => ({ ...s, phase: 'error', fatalError: (event.message as string) ?? 'Erro desconhecido' }));
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setState(s => ({ ...s, phase: 'error', fatalError: err instanceof Error ? err.message : 'Erro de rede' }));
    }
  }, []);

  const openModal = useCallback(() => {
    setState(INITIAL);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
  }, []);

  const isRunning = state.phase === 'mapping' || state.phase === 'running';

  return { open, openModal, closeModal, state, execute, isRunning };
}
