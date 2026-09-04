'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAnaliseHtUploads } from '@/lib/hooks/use-analise-ht-uploads';
import { useAnaliseHtLojaBase } from '@/lib/hooks/use-analise-ht-loja-base';
import { useAnaliseHtGratificacao } from '@/lib/hooks/use-analise-ht-gratificacao';
import { naoDonosNaOrdem } from '@/lib/analise-ht/bonificacao';
import { corDaLoja, ORDEM_LOJAS } from '@/lib/analise-ht/cores-lojas';

const inputCls = 'px-1.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.10] rounded-md text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-indigo-500';

interface LinhaEditavel {
  valor: string;
}

export function GratificacaoManager() {
  const { uploads } = useAnaliseHtUploads();
  const { itens: avaliadoras } = useAnaliseHtLojaBase();

  // Upload mais recente de cada loja — sem seleção manual, lançamento é
  // sempre "do mês atual" (ver conversa com Elias 2026-09-02).
  const uploadPorLoja = useMemo(() => {
    const map = new Map<string, typeof uploads[number]>();
    for (const u of uploads) {
      const atual = map.get(u.loja);
      if (!atual || u.created_at > atual.created_at) map.set(u.loja, u);
    }
    return map;
  }, [uploads]);

  const uploadIds = useMemo(() => [...uploadPorLoja.values()].map(u => u.id), [uploadPorLoja]);
  // Grupos sem upload/loja vinculada (Gerente, ex: Raphael Borges; e Sem
  // Loja) usam "referencia" (mês corrente) como chave de período, pois não
  // entram nas comissões calculadas por loja.
  const referenciaSemUpload = useMemo(() => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const { itens: gratificacoes, salvarAsync, isSaving } = useAnaliseHtGratificacao(uploadIds, [referenciaSemUpload]);

  // Grupos sem upload/loja vinculada (Gerente e Sem Loja) usam "referencia"
  // (mês corrente) como chave de período — mesmo caso do Raphael Borges.
  const GRUPOS_SEM_UPLOAD = ['Gerente', 'Sem loja'];

  const nomesPorLoja = useMemo(() => {
    const naoDonos = avaliadoras.filter(a => naoDonosNaOrdem(a.avaliador).length > 0);
    const grupos = new Map<string, string[]>();
    for (const loja of uploadPorLoja.keys()) {
      grupos.set(loja, naoDonos.filter(a => a.loja === loja).map(a => a.avaliador).sort((a, b) => a.localeCompare(b)));
    }
    for (const grupo of GRUPOS_SEM_UPLOAD) {
      const nomes = naoDonos.filter(a => a.loja === grupo).map(a => a.avaliador).sort((a, b) => a.localeCompare(b));
      if (nomes.length > 0) grupos.set(grupo, nomes);
    }
    const indice = (loja: string) => { const i = ORDEM_LOJAS.indexOf(loja); return i === -1 ? ORDEM_LOJAS.length : i; };
    return [...grupos.entries()].sort((a, b) => indice(a[0]) - indice(b[0]));
  }, [avaliadoras, uploadPorLoja]);

  const [edicoes, setEdicoes] = useState<Record<string, LinhaEditavel>>({});

  useEffect(() => {
    const map: Record<string, LinhaEditavel> = {};
    for (const g of gratificacoes) map[g.avaliador] = { valor: String(g.valor) };
    setEdicoes(map);
  }, [gratificacoes]);

  async function handleSalvarTudo() {
    const chamadas = nomesPorLoja.flatMap(([loja, nomes]) =>
      nomes.map(nome => {
        const edicao = edicoes[nome];
        const valorNum = parseFloat((edicao?.valor ?? '').replace(',', '.')) || 0;
        const payload = { avaliador: nome, valor: valorNum };

        if (GRUPOS_SEM_UPLOAD.includes(loja)) {
          return salvarAsync({ referencia: referenciaSemUpload, ...payload });
        }
        const upload = uploadPorLoja.get(loja);
        if (!upload) return Promise.resolve();
        return salvarAsync({ uploadId: upload.id, ...payload });
      })
    );
    try {
      await Promise.all(chamadas);
      toast.success('Gratificações salvas.');
    } catch {
      toast.error('Falha ao salvar alguma gratificação.');
    }
  }

  if (uploads.length === 0) {
    return <p className="text-sm text-zinc-400">Nenhuma planilha importada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Gratificação</h2>
          <p className="text-[11px] text-zinc-400">Valor pontual, avulso, escolhido manualmente por avaliadora — usa sempre a planilha mais recente de cada loja</p>
        </div>
        <button
          onClick={handleSalvarTudo}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          <Save size={14} />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-2">
        {nomesPorLoja.map(([loja, nomes]) => {
          const cor = corDaLoja(loja);
          return (
            <div
              key={loja}
              className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.10] rounded-xl overflow-hidden"
              style={{ borderTopColor: cor, borderTopWidth: 3 }}
            >
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-100 dark:border-white/[0.06]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor }}>{loja}</span>
              </div>

              <div className="flex flex-col gap-1.5 p-2">
                {nomes.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 px-1 py-2">Ninguém aqui</p>
                ) : (
                  nomes.map(nome => {
                    const edicao = edicoes[nome] ?? { valor: '' };
                    return (
                      <div key={nome} className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/[0.10]">
                        <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">{nome}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-zinc-400 shrink-0">R$</span>
                          <input
                            type="text" inputMode="decimal"
                            value={edicao.valor}
                            onChange={e => setEdicoes(prev => ({ ...prev, [nome]: { valor: e.target.value } }))}
                            placeholder="0,00"
                            className={`${inputCls} flex-1 min-w-0 text-right`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
