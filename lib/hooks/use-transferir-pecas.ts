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
  chunkInfo:  string;
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
  chunkInfo:  '',
};

const CHUNK_SIZE = 30;

interface ExecuteParams {
  nome:          string;
  leilaoOrigem:  string;
  leilaoDestino: string;
  startLote:     number;
  numDias:       number;
  pecas:         PecaTransferencia[];
}

export function useTransferirPecas() {
  const [open,  setOpen]  = useState(false);
  const [state, setState] = useState<TransferirPecasState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async ({ nome, leilaoOrigem, leilaoDestino, startLote, numDias, pecas }: ExecuteParams) => {
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

    // Divide em chunks de CHUNK_SIZE para não estourar o timeout do Vercel (5 min)
    const chunks: PecaTransferencia[][] = [];
    for (let i = 0; i < pecas.length; i += CHUNK_SIZE) {
      chunks.push(pecas.slice(i, i + CHUNK_SIZE));
    }

    let cumulativeDone    = 0;
    let cumulativeSuccess = 0;
    let cumulativeErrors  = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      if (ctrl.signal.aborted) break;

      const chunk     = chunks[ci];
      const chunkStart = startLote + ci * CHUNK_SIZE;
      const chunkLabel = chunks.length > 1
        ? `Bloco ${ci + 1} de ${chunks.length} (${chunk.length} peças)`
        : '';

      setState(s => ({ ...s, chunkInfo: chunkLabel }));

      try {
        const res = await fetch('/api/leilao/transferir-pecas', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome,
            leilaoOrigem,
            leilaoDestino,
            startLote:  chunkStart,
            numDias,
            doneOffset: cumulativeDone,
            totalGlobal: total,
            pecas: chunk,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          setState(s => ({ ...s, phase: 'error', fatalError: `HTTP ${res.status}`, chunkInfo: '' }));
          return;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';
        let   chunkDone = 0;

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
              // noop — já inicializamos o state

            } else if (type === 'progress') {
              const ref     = event.ref     as string;
              const lote    = event.lote    as number;
              const ok      = event.success as boolean;
              const errMsg  = event.error   as string | undefined;
              const doneVal = (cumulativeDone + (event.done as number)) as number;

              chunkDone++;
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
              cumulativeDone    += chunkDone;
              cumulativeSuccess += (event.success as number) ?? 0;
              cumulativeErrors  += (event.errors  as number) ?? 0;

            } else if (type === 'error') {
              setState(s => ({
                ...s,
                phase:      'error',
                fatalError: (event.message as string) ?? 'Erro desconhecido',
                statusMsg:  '',
                chunkInfo:  '',
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
          chunkInfo:  '',
        }));
        return;
      }
    }

    setState(s => s.phase === 'running' ? {
      ...s,
      phase:     'done',
      done:      total,
      success:   cumulativeSuccess,
      errors:    cumulativeErrors,
      statusMsg: '',
      chunkInfo: '',
    } : s);
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
