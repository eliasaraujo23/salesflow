'use client';

import { useState, useCallback } from 'react';
import { fetchReferenciaAction, type ReferenciaData } from '@/lib/actions/fetch-referencia';

export function useReferenciaSearch() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ReferenciaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (ref: string) => {
    const trimmed = ref.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetchReferenciaAction(trimmed);

    if (res.data) {
      setResult(res.data);
    } else {
      setError(res.message ?? 'Referência não encontrada.');
    }
    setLoading(false);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      search(query);
    },
    [query, search],
  );

  const clear = useCallback(() => {
    setQuery('');
    setResult(null);
    setError(null);
  }, []);

  return { query, setQuery, result, error, loading, handleSubmit, clear };
}
