'use client';

import { useState, useCallback, useRef } from 'react';
import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';

const PECA_MAX = 100;

function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/;/g, ',').trim();
}

export interface PecaParaCadastrar {
  referencia:        string;
  lote:              number;
  peca:              string;
  dia:               number;
  preco_contratado:  number;
  descricao:         string;
  segunda_descricao: string;
  ativarSite?:       boolean; // false = destino excluído; default true
}

export type PecaStatus = 'pending' | 'running' | 'ok' | 'error';

export interface PecaProgress {
  lote:         number;
  status:       PecaStatus;
  error?:       string;
  photoMain?:   'ok' | 'error' | 'none';
  photoError?:  string;
  photoExtras?: number;
  siteOk?:      boolean;
  siteError?:   string;
}

export interface CadastrarPecasState {
  phase:        'idle' | 'running' | 'photos' | 'done' | 'error';
  pecas:        PecaProgress[];
  done:         number;
  total:        number;
  successCount: number;
  errorCount:   number;
  fatalError:   string;
  chunkInfo:    string;
  photoTotal:   number;
  photoDone:    number;
  statusMsg:    string;
}

const INITIAL: CadastrarPecasState = {
  phase:        'idle',
  pecas:        [],
  done:         0,
  total:        0,
  successCount: 0,
  errorCount:   0,
  fatalError:   '',
  chunkInfo:    '',
  photoTotal:   0,
  photoDone:    0,
  statusMsg:    '',
};

const CHUNK_SIZE = 50;

export function buildPecasParaCadastrar(
  pieces:    LeilaoBaseRow[],
  startLote: number,
): PecaParaCadastrar[] {
  return pieces.map((p, i) => {
    const lote      = startLote + i;
    const full      = sanitize(p.descricao_jewel ?? '');
    const peca      = full.slice(0, PECA_MAX);
    const descricao = `${full} | REF: ${p.referencia}`;
    return {
      referencia:        p.referencia,
      lote,
      peca,
      dia:               1,
      preco_contratado:  Math.round(p.preco_avista ?? 0),
      descricao,
      segunda_descricao: p.referencia,
    };
  });
}

interface ExecuteParams {
  codigoPlatforma: string;
  nome:            string;
  pecas:           PecaParaCadastrar[];
}

export function useCadastrarPecas() {
  const [open,  setOpen]  = useState(false);
  const [state, setState] = useState<CadastrarPecasState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async ({ codigoPlatforma, nome, pecas }: ExecuteParams) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const total = pecas.length;

    setState({
      ...INITIAL,
      phase: 'running',
      pecas: pecas.map(p => ({ lote: p.lote, status: 'pending' })),
      total,
    });

    const chunks: PecaParaCadastrar[][] = [];
    for (let i = 0; i < pecas.length; i += CHUNK_SIZE) {
      chunks.push(pecas.slice(i, i + CHUNK_SIZE));
    }

    let cumulativeDone    = 0;
    let cumulativeSuccess = 0;
    let cumulativeErrors  = 0;

    // lote → full peca for pieces successfully created
    const successMap = new Map<number, PecaParaCadastrar>();

    // ── Phase 1: create pieces ─────────────────────────────────────────────────
    for (let ci = 0; ci < chunks.length; ci++) {
      if (ctrl.signal.aborted) break;
      const chunk = chunks[ci];
      const chunkLabel = chunks.length > 1
        ? `Lote ${ci + 1} de ${chunks.length} (${chunk.length} peças)`
        : '';

      let chunkDone = 0;
      try {
        const res = await fetch('/api/leilao/cadastrar-pecas', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoPlatforma,
            nome,
            pecas:       chunk,
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

        let gotDone = false;
        while (true) {
          // Timeout de 4min por chunk — evita travar se o Vercel fechar o stream sem 'done'
          const readPromise = reader.read();
          const timeout     = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('chunk timeout')), 4 * 60 * 1000),
          );
          const { done, value } = await Promise.race([readPromise, timeout]);
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

            if (type === 'start') {
              setState(s => ({ ...s, phase: 'running', chunkInfo: chunkLabel }));

            } else if (type === 'progress') {
              const lote    = event.lote    as number;
              const success = event.success as boolean;
              const errMsg  = event.error   as string | undefined;
              const doneVal = event.done    as number;

              chunkDone++;
              if (success) {
                const src = chunk.find(p => p.lote === lote);
                if (src) successMap.set(lote, src);
              }

              setState(s => ({
                ...s,
                done:         doneVal,
                successCount: s.successCount + (success ? 1 : 0),
                errorCount:   s.errorCount   + (success ? 0 : 1),
                pecas: s.pecas.map(p =>
                  p.lote === lote
                    ? { ...p, status: success ? 'ok' : 'error', error: errMsg }
                    : p,
                ),
              }));

            } else if (type === 'done') {
              gotDone = true;
              cumulativeDone    += chunkDone;
              cumulativeSuccess += (event.success as number) ?? 0;
              cumulativeErrors  += (event.errors  as number) ?? 0;

            } else if (type === 'error') {
              setState(s => ({
                ...s,
                phase:      'error',
                fatalError: (event.message as string) ?? 'Erro desconhecido',
              }));
              return;
            }
          }
        }

        // Stream fechou sem 'done' — conta as peças que não responderam como erro
        if (!gotDone) {
          const missing = chunk.length - chunkDone;
          if (missing > 0) {
            cumulativeDone    += chunkDone;
            cumulativeErrors  += missing;
            setState(s => ({ ...s, errorCount: s.errorCount + missing }));
          }
        }

      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // Timeout ou erro de rede — marca peças não respondidas como erro e continua próximo chunk
        const missing = chunk.length - chunkDone;
        if (missing > 0) {
          cumulativeDone   += chunkDone;
          cumulativeErrors += missing;
          setState(s => ({ ...s, errorCount: s.errorCount + missing }));
        }
        if ((err as Error)?.message !== 'chunk timeout') {
          setState(s => ({
            ...s,
            phase:      'error',
            fatalError: err instanceof Error ? err.message : 'Erro de rede',
          }));
          return;
        }
      }
    }

    // ── Phase 2: upload photos + activate Site ─────────────────────────────────
    const pecasParaFoto = Array.from(successMap.values()).sort((a, b) => a.lote - b.lote).map(p => ({
      lote:              p.lote,
      referencia:        p.referencia,
      peca:              p.peca,
      dia:               p.dia,
      preco_contratado:  p.preco_contratado,
      descricao:         p.descricao,
      segunda_descricao: p.segunda_descricao,
    }));

    if (pecasParaFoto.length > 0 && !ctrl.signal.aborted) {
      setState(s => ({
        ...s,
        phase:      'photos',
        chunkInfo:  '',
        photoTotal: pecasParaFoto.length,
        photoDone:  0,
      }));

      const PHOTO_CHUNK = 7; // Hobby plan: 60s limit; ~7 peças × ~7s = ~50s por chunk
      const photoChunks: typeof pecasParaFoto[] = [];
      for (let i = 0; i < pecasParaFoto.length; i += PHOTO_CHUNK) {
        photoChunks.push(pecasParaFoto.slice(i, i + PHOTO_CHUNK));
      }

      for (let ci = 0; ci < photoChunks.length; ci++) {
        if (ctrl.signal.aborted) break;
        const photoChunk = photoChunks[ci];
        const chunkLabel = photoChunks.length > 1
          ? `Fotos: lote ${ci + 1} de ${photoChunks.length}`
          : '';
        if (chunkLabel) setState(s => ({ ...s, statusMsg: chunkLabel }));

        try {
          const res = await fetch('/api/leilao/upload-fotos', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ codigoPlatforma, nome, pecas: photoChunk }),
            signal:  ctrl.signal,
          });

          if (!res.ok || !res.body) continue;

          const reader  = res.body.getReader();
          const decoder = new TextDecoder();
          let   buffer  = '';

          outer: while (true) {
            const readPromise = reader.read();
            const timeout     = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('photo chunk timeout')), 55 * 1000),
            );
            const { done, value } = await Promise.race([readPromise, timeout]);
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

              if (type === 'photoProgress') {
                const lote    = event.lote    as number;
                const slot    = event.slot    as 'main' | 'extra';
                const success = event.success as boolean;
                const count   = event.count   as number | undefined;
                const errMsg  = event.error   as string | undefined;

                setState(s => ({
                  ...s,
                  photoDone: slot === 'main' ? s.photoDone + 1 : s.photoDone,
                  pecas: s.pecas.map(p => {
                    if (p.lote !== lote) return p;
                    if (slot === 'main') {
                      return { ...p, photoMain: success ? 'ok' : 'none', photoError: errMsg };
                    }
                    return { ...p, photoExtras: count ?? 0 };
                  }),
                }));

              } else if (type === 'siteProgress') {
                const lote    = event.lote    as number;
                const success = event.success as boolean;
                const errMsg  = event.error   as string | undefined;
                setState(s => ({
                  ...s,
                  pecas: s.pecas.map(p => p.lote === lote
                    ? { ...p, siteOk: success, siteError: errMsg }
                    : p),
                }));

              } else if (type === 'status') {
                setState(s => ({ ...s, statusMsg: (event.message as string) ?? '' }));

              } else if (type === 'error') {
                setState(s => ({ ...s, statusMsg: (event.message as string) ?? 'Erro ao enviar fotos' }));
                break outer;
              }
            }
          }
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          // Timeout ou erro de rede no chunk de fotos — continua próximo chunk
        }
      }
    }

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

  const isRunning = state.phase === 'running' || state.phase === 'photos';

  return { open, openModal, closeModal, state, execute, isRunning };
}
