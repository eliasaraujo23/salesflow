'use client';

import { useState, useMemo } from 'react';
import { X, ShieldAlert, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLeilaoRegras } from '@/lib/hooks/use-leilao-regras';

async function fetchDestinosLista(): Promise<string[]> {
  const res = await fetch('/api/leilao/destinos-lista');
  if (!res.ok) return [];
  const json = await res.json() as { data: string[] };
  return json.data;
}

export function RegrasDestinos() {
  const { regras, isLoading, add, remove } = useLeilaoRegras();
  const { data: todosDest = [] } = useQuery({ queryKey: ['destinos-lista'], queryFn: fetchDestinosLista });

  const [busca,  setBusca]  = useState('');
  const [aberto, setAberto] = useState(false);

  const jaAdicionados = useMemo(() => new Set(regras.map(r => r.destino.toLowerCase())), [regras]);

  const sugestoes = useMemo(() => {
    const q = busca.toLowerCase();
    return todosDest.filter(d =>
      !jaAdicionados.has(d.toLowerCase()) &&
      (q === '' || d.toLowerCase().includes(q))
    );
  }, [todosDest, jaAdicionados, busca]);

  function selecionar(dest: string) {
    add(dest);
    setBusca('');
    setAberto(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
        Carregando regras...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Select de destinos */}
      <div className="relative">
        <input
          value={busca}
          onChange={e => { setBusca(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Buscar destino para excluir do leilão..."
          className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
        />
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />

        {aberto && sugestoes.length > 0 && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-52 overflow-y-auto rounded-lg border border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 shadow-lg">
            {sugestoes.map(d => (
              <button
                key={d}
                type="button"
                onMouseDown={() => selecionar(d)}
                className="w-full px-3 py-2 text-sm text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
        <ShieldAlert size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
          Destinos abaixo são sinalizados nas Conferências. Remova um destino da lista para parar de sinalizar.
        </p>
      </div>

      {/* Lista de excluídos */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-white/[0.06]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Destinos excluídos — {regras.length}
          </span>
        </div>

        {regras.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">
            Nenhum destino excluído. Busque acima para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {regras.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900">
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-100">{r.destino}</span>
                <button
                  onClick={() => remove(r.id)}
                  title="Remover da lista"
                  className="shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
