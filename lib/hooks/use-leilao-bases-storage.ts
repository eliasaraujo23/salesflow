'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Leilao } from '@/lib/hooks/use-leiloes';

const STORAGE_KEY = 'goldtech_leilao_bases_v1';

interface StoredBase {
  filename:        string;
  codigoPlatforma: string | null;
  count:           number;
  refs:            string[];
  excluded:        boolean;
}

export interface UploadedFileStored {
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null; // derived at runtime from leiloes
  count:           number;
}

function readStorage(): StoredBase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredBase[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(bases: StoredBase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bases));
  } catch { /* ignore quota errors */ }
}

export function useLeilaoBasesStorage(leiloes: Leilao[]) {
  const [stored, setStored] = useState<StoredBase[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setStored(readStorage());
  }, []);

  // Derive UploadedFile objects (with leilao resolved from current leiloes list)
  const uploadedFiles: UploadedFileStored[] = stored.map(s => ({
    filename:        s.filename,
    codigoPlatforma: s.codigoPlatforma,
    count:           s.count,
    leilao:          s.codigoPlatforma
      ? leiloes.find(l => l.codigoPlatforma === s.codigoPlatforma) ?? null
      : null,
  }));

  // Derive refsPerFile map
  const refsPerFile = new Map<string, string[]>(
    stored.map(s => [s.filename, s.refs])
  );

  // Derive excludedFiles set
  const excludedFiles = new Set<string>(
    stored.filter(s => s.excluded).map(s => s.filename)
  );

  const add = useCallback((file: UploadedFileStored, refs: string[]) => {
    setStored(prev => {
      if (prev.find(s => s.filename === file.filename)) return prev;
      const next = [...prev, {
        filename:        file.filename,
        codigoPlatforma: file.codigoPlatforma,
        count:           file.count,
        refs,
        excluded:        false,
      }];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((filename: string) => {
    setStored(prev => {
      const next = prev.filter(s => s.filename !== filename);
      writeStorage(next);
      return next;
    });
  }, []);

  const toggleExclude = useCallback((filename: string) => {
    setStored(prev => {
      const next = prev.map(s =>
        s.filename === filename ? { ...s, excluded: !s.excluded } : s
      );
      writeStorage(next);
      return next;
    });
  }, []);

  return { uploadedFiles, refsPerFile, excludedFiles, add, remove, toggleExclude };
}
