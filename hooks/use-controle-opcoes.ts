'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '@/lib/auth-fetch';
import { type LojaCode, getLojaConfig } from '@/lib/controle-config';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function lojaUnidade(code: LojaCode): string {
  return code === '24k' ? '24K' : code.toUpperCase();
}

interface ControleOpcoes {
  avaliadores: string[];
  feedbacks_compra: string[];
  feedbacks_nc: string[];
  tipos: string[];
  empresas: string[];
}

export function useControleOpcoes(lojaCode: LojaCode): ControleOpcoes {
  const fallback = getLojaConfig(lojaCode);
  const unidade = lojaUnidade(lojaCode);

  const { data: avaliadores } = useQuery<string[]>({
    queryKey: ['controle-avaliadores'],
    queryFn: () => fetchJson(`${API_BASE}/controle/avaliadores`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: feedbacks_compra } = useQuery<string[]>({
    queryKey: ['controle-feedbacks', unidade],
    queryFn: () => fetchJson(`${API_BASE}/controle/feedbacks?unidade=${unidade}`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: feedbacks_nc } = useQuery<string[]>({
    queryKey: ['controle-motivos-nc'],
    queryFn: () => fetchJson(`${API_BASE}/controle/motivos-nc`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: tipos } = useQuery<string[]>({
    queryKey: ['controle-modalidades'],
    queryFn: () => fetchJson(`${API_BASE}/controle/modalidades`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: empresas } = useQuery<string[]>({
    queryKey: ['controle-empresas'],
    queryFn: () => fetchJson(`${API_BASE}/controle/empresas`),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    avaliadores:    avaliadores  ?? fallback?.avaliadores    ?? [],
    feedbacks_compra: feedbacks_compra ?? fallback?.feedbacks_compra ?? [],
    feedbacks_nc:   feedbacks_nc ?? fallback?.feedbacks_nc   ?? [],
    tipos:          tipos        ?? fallback?.tipos          ?? [],
    empresas:       empresas     ?? fallback?.empresas       ?? [],
  };
}
