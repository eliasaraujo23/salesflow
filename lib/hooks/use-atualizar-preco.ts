'use client';

import { useState, useCallback, useRef } from 'react';

export interface PecaDiff {
  ref:         string;
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
  chunkInfo:    string; // "Lote 2 de 7..."
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
  chunkInfo:    '',
};

const CHUNK_SIZE = 30; // peças por chamada API (cada chunk ≈ 30×0.57s ≈ 17s com concorrência=3)

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

    const total = pecas.length;

    setState({
      ...INITIAL,
      phase:      'mapping',
      mappingMsg: 'Conectando...',
      pecas:      pecas.map(p => ({ ref: p.ref, status: 'pending' })),
      total,
    });

    // Divide em chunks de CHUNK_SIZE
    const chunks: PecaDiff[][] = [];
    for (let i = 0; i < pecas.length; i += CHUNK_SIZE) {
      chunks.push(pecas.slice(i, i + CHUNK_SIZE));
    }

    let cumulativeDone    = 0;
    let cumulativeSuccess = 0;
    let cumulativeErrors  = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      if (ctrl.signal.aborted) break;
      const chunk = chunks[ci];
      const chunkLabel = chunks.length > 1
        ? `Lote ${ci + 1} de ${chunks.length} (${chunk.length} peças)`
        : '';

      try {
        const res = await fetch('/api/leilao/atualizar-preco', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoPlatforma,
            nome,
            pecas:       chunk.map(p => ({ ref: p.ref, novoPreco: p.sistemaPrice })),
            doneOffset:  cumulativeDone,
            totalGlobal: total,
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

            if (type === 'mapping') {
              setState(s => ({
                ...s,
                phase:      'mapping',
                mappingMsg: (event.message as string) ?? '',
                chunkInfo:  chunkLabel,
              }));

            } else if (type === 'start') {
              setState(s => ({ ...s, phase: 'running', chunkInfo: chunkLabel }));

            } else if (type === 'progress') {
              const ref     = event.ref as string;
              const success = event.success as boolean;
              const errMsg  = event.error as string | undefined;
              const doneVal = event.done as number; // já inclui doneOffset do servidor

              chunkDone++;
              setState(s => ({
                ...s,
                done:         doneVal,
                successCount: s.successCount + (success ? 1 : 0),
                errorCount:   s.errorCount   + (success ? 0 : 1),
                pecas: s.pecas.map(p =>
                  p.ref === ref
                    ? { ...p, status: success ? 'ok' : 'error', error: errMsg }
                    : p,
                ),
              }));

            } else if (type === 'done') {
              cumulativeDone    += chunkDone;
              cumulativeSuccess += (event.success as number) ?? 0;
              cumulativeErrors  += (event.errors  as number) ?? 0;

            } else if (type === 'error') {
              setState(s => ({ ...s, phase: 'error', fatalError: (event.message as string) ?? 'Erro desconhecido' }));
              return;
            }
          }
        }

      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setState(s => ({ ...s, phase: 'error', fatalError: err instanceof Error ? err.message : 'Erro de rede' }));
        return;
      }
    }

    // Todos os chunks concluídos
    setState(s => ({
      ...s,
      phase:        'done',
      done:         total,
      successCount: cumulativeSuccess,
      errorCount:   cumulativeErrors,
      chunkInfo:    '',
    }));

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
