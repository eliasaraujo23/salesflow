'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { getLojaConfig, type LojaCode } from '@/lib/controle-config';
import { useConfigGlobal, type ConfigGlobalKey } from '@/hooks/use-config-global';
import { useConfigLoja } from '@/hooks/use-config-loja';
import { ConfigListEditor } from '@/components/controle/config-list-editor';

export default function LojaConfigPage() {
  const { loja: lojaCode } = useParams<{ loja: string }>();
  const loja = getLojaConfig(lojaCode as LojaCode);
  const global = useConfigGlobal();
  const local = useConfigLoja(lojaCode as LojaCode);

  if (!loja) return null;

  const globalSections: { key: ConfigGlobalKey; title: string; placeholder?: string }[] = [
    { key: 'avaliadores',      title: 'Avaliadores',           placeholder: 'Nome do avaliador...' },
    { key: 'motivos_nc',       title: 'Motivos de Não Compra', placeholder: 'Novo motivo NC...' },
    { key: 'bancos_caixa',     title: 'Bancos / Caixa',        placeholder: 'Nome do banco ou caixa...' },
    { key: 'tipos_lancamento', title: 'Tipos de Lançamento',   placeholder: 'Tipo de lançamento...' },
    { key: 'formas_pagamento', title: 'Formas de Pagamento',   placeholder: 'Forma de pagamento...' },
    { key: 'tipos_despesa',    title: 'Tipos de Despesa',      placeholder: 'Tipo de despesa...' },
    { key: 'modalidades',      title: 'Modalidades (Tipo)',    placeholder: 'Modalidade...' },
    { key: 'empresas',         title: 'Razões Sociais',        placeholder: 'Nome da empresa...' },
  ];

  return (
    <div className="p-5 space-y-8">
      {/* Per-loja: feedbacks */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Feedbacks — {loja.sigla}
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Lista de feedbacks de compra exclusiva desta loja.
          </p>
        </div>
        <div className="max-w-lg">
          <ConfigListEditor
            title="Feedbacks de Compra"
            items={local.feedbacks_compra}
            onAdd={local.addFeedback}
            onRemove={local.removeFeedback}
            placeholder="Novo feedback..."
          />
        </div>
      </section>

      {/* Global config */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Configurações Globais
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Listas compartilhadas por todas as lojas. Alterações aqui refletem em GTT, GTI, 24K e CI.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {globalSections.map(({ key, title, placeholder }) => (
            <ConfigListEditor
              key={key}
              title={title}
              items={global[key]}
              onAdd={item => global.addItem(key, item)}
              onRemove={item => global.removeItem(key, item)}
              placeholder={placeholder}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
