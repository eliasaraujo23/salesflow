'use client';

import { useState, useCallback, useRef } from 'react';

export interface PecaTransferencia {
  ref:   string;
  valor: number;
}

export type TransferStatus = 'pending' | 'running' | 'ok' | 'error' | 'notfound';

export interface PecaTransferProgress {
  ref:    string;
  lote:   number;
  status: TransferStatus;
  error?: string;
}

export interface TransferirPecasState {
  phase:      'idle' | 'running' | 'done' | 'error';
  pecas:      PecaTransferProgress[];
  done:       number;
  total:      number;
  success:    number;
  errors:     number;
  fatalError: string;
  statusMsg:  string;
}

const INITIAL: TransferirPecasState = {
  phase:      'idle',
  pecas:      [],
  done:       0,
  total:      0,
  success:    0,
  errors:     0,
  fatalError: '',
  statusMsg:  '',
};

interface ExecuteParams {
  nome:          string;
  leilaoOrigem:  string;
  leilaoDestino: string;
  startLote:     number;
  pecas:         PecaTransferencia[];
}

export function useTransferirPecas() {
  const [open,  setOpen]  = useState(false);
  const [state, setState] = useState<TransferirPecasState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async ({ nome, leilaoOrigem, leilaoDestino, startLote, pecas }: ExecuteParams) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const total = pecas.length;

    setState({
      ...INITIAL,
      phase: 'running',
      total,
      pecas: pecas.map((p, i) => ({
        ref:    p.ref,
        lote:   startLote + i,
        status: 'pending',
      })),
    });

    try {
      const res = await fetch('/api/leilao/transferir-pecas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, leilaoOrigem, leilaoDestino, startLote, pecas }),
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

          if (type === 'status') {
            setState(s => ({ ...s, statusMsg: (event.message as string) ?? '' }));

          } else if (type === 'start') {
            setState(s => ({ ...s, phase: 'running', total: (event.total as number) ?? s.total }));

          } else if (type === 'progress') {
            const ref     = event.ref     as string;
            const lote    = event.lote    as number;
            const ok      = event.success as boolean;
            const errMsg  = event.error   as string | undefined;
            const doneVal = event.done    as number;

            setState(s => ({
              ...s,
              done:    doneVal,
              success: s.success + (ok ? 1 : 0),
              errors:  s.errors  + (ok ? 0 : 1),
              pecas: s.pecas.map(p =>
                p.ref === ref && p.lote === lote
                  ? { ...p, status: ok ? 'ok' : (errMsg?.includes('não encontrada') ? 'notfound' : 'error'), error: errMsg }
                  : p,
              ),
            }));

          } else if (type === 'done') {
            setState(s => ({ ...s, phase: 'done', statusMsg: '' }));

          } else if (type === 'error') {
            setState(s => ({
              ...s,
              phase:      'error',
              fatalError: (event.message as string) ?? 'Erro desconhecido',
              statusMsg:  '',
            }));
            return;
          }
        }
      }

    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setState(s => ({
        ...s,
        phase:      'error',
        fatalError: err instanceof Error ? err.message : 'Erro de rede',
      }));
    }

    setState(s => s.phase === 'running' ? { ...s, phase: 'done', statusMsg: '' } : s);
  }, []);

  const openModal = useCallback(() => {
    setState(INITIAL);
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    abortRef.current?.abort();
    setOpen(false);
  }, []);

  const isRunning = state.phase === 'running';

  return { open, openModal, closeModal, state, execute, isRunning };
}
