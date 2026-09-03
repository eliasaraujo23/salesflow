'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAnaliseHtLojaBase, type LojaBaseItem } from '@/lib/hooks/use-analise-ht-loja-base';
import { LojaBaseColumn } from '@/components/analise-ht/loja-base-column';
import { CORES_LOJAS, ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

const LOJAS = ORDEM_LOJAS.map(sigla => ({ sigla, cor: CORES_LOJAS[sigla] }));

export function LojaBaseBoard() {
  const { itens, adicionar, mover, remover } = useAnaliseHtLojaBase();
  const [dragOverLoja, setDragOverLoja] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');

  function handleAdicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    adicionar({ avaliador: nome, loja: 'Sem loja' });
    setNovoNome('');
  }

  function handleDrop(loja: string) {
    if (draggingId) mover({ id: draggingId, loja });
    setDragOverLoja(null);
    setDraggingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdicionar(); }}
          placeholder="Nome da avaliadora"
          className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleAdicionar}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {LOJAS.map(({ sigla, cor }) => (
          <LojaBaseColumn
            key={sigla}
            loja={sigla}
            cor={cor}
            itens={itens.filter((item: LojaBaseItem) => item.loja === sigla)}
            isDragOver={dragOverLoja === sigla}
            draggingId={draggingId}
            onDragOver={() => setDragOverLoja(sigla)}
            onDragLeave={() => setDragOverLoja(prev => (prev === sigla ? null : prev))}
            onDrop={() => handleDrop(sigla)}
            onDragStart={item => setDraggingId(item.id)}
            onDragEnd={() => { setDraggingId(null); setDragOverLoja(null); }}
            onRemove={remover}
          />
        ))}
      </div>
    </div>
  );
}
