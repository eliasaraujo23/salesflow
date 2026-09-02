'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useConfigGlobal, type ConfigGlobalKey } from '@/hooks/use-config-global';
import { useConfigLoja } from '@/hooks/use-config-loja';
import { ConfigListEditor } from '@/components/controle/config-list-editor';
import { AvaliadorListEditor } from '@/components/controle/avaliador-list-editor';
import { type AvaliadorItem } from '@/lib/actions/controle-lojas-config';

type SectionKey = ConfigGlobalKey | 'feedbacks_compra';

export default function LojaConfigPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode as LojaCode);
  const global = useConfigGlobal();
  const local = useConfigLoja(lojaCode as LojaCode);
  const [selected, setSelected] = useState<SectionKey>('avaliadores');

  if (!loja) return null;

  const sections: { key: SectionKey; title: string; placeholder?: string; local?: boolean }[] = [
    { key: 'feedbacks_compra', title: `Feedbacks de Compra — ${loja.sigla}`, placeholder: 'Novo feedback...', local: true },
    { key: 'avaliadores',      title: 'Avaliadores',           placeholder: 'Nome do avaliador...' },
    { key: 'motivos_nc',       title: 'Motivos de Não Compra', placeholder: 'Novo motivo NC...' },
    { key: 'bancos_caixa',     title: 'Bancos / Caixa',        placeholder: 'Nome do banco ou caixa...' },
    { key: 'tipos_lancamento', title: 'Tipos de Lançamento',   placeholder: 'Tipo de lançamento...' },
    { key: 'formas_pagamento', title: 'Formas de Pagamento',   placeholder: 'Forma de pagamento...' },
    { key: 'tipos_despesa',    title: 'Tipos de Despesa',      placeholder: 'Tipo de despesa...' },
    { key: 'modalidades',      title: 'Modalidades (Tipo)',    placeholder: 'Modalidade...' },
    { key: 'empresas',         title: 'Razões Sociais',        placeholder: 'Nome da empresa...' },
  ];

  const current = sections.find(s => s.key === selected)!;
  const isFeedbacks = current.key === 'feedbacks_compra';
  const isAvaliadores = current.key === 'avaliadores';

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      <div>
        <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Configurações</h1>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          Escolha a lista que deseja editar. Feedbacks de compra são exclusivos desta loja; as demais são compartilhadas por todas as lojas.
        </p>
      </div>

      <div className="max-w-xs">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value as SectionKey)}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-sm font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          {sections.map(s => (
            <option key={s.key} value={s.key}>{s.title}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 max-w-lg">
        {isFeedbacks ? (
          <ConfigListEditor
            title={current.title}
            items={local.feedbacks_compra}
            onAdd={local.addFeedback}
            onRemove={local.removeFeedback}
            onRename={local.renameFeedback}
            placeholder={current.placeholder}
            fill
          />
        ) : isAvaliadores ? (
          <AvaliadorListEditor
            items={global.avaliadores as AvaliadorItem[]}
            onAdd={item => global.addItem('avaliadores', item)}
            onRemove={id => global.removeItem('avaliadores', id)}
            onRename={(id, nome) => global.renameItem('avaliadores', id, nome)}
            onSetAtivo={global.setAvaliadorAtivo}
            fill
          />
        ) : (
          <ConfigListEditor
            title={current.title}
            items={global[current.key as ConfigGlobalKey]}
            onAdd={item => global.addItem(current.key as ConfigGlobalKey, item)}
            onRemove={id => global.removeItem(current.key as ConfigGlobalKey, id)}
            onRename={(id, nome) => global.renameItem(current.key as ConfigGlobalKey, id, nome)}
            placeholder={current.placeholder}
            fill
          />
        )}
      </div>
    </div>
  );
}
