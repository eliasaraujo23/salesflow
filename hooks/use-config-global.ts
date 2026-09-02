'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchConfigList, addConfigItem, renameConfigItem, removeConfigItem, setAvaliadorAtivo,
  type ConfigTable, type ConfigItem, type EmpresaItem, type AvaliadorItem,
} from '@/lib/actions/controle-lojas-config';

export type ConfigGlobalKey = ConfigTable;

export interface ConfigGlobal {
  avaliadores: AvaliadorItem[];
  motivos_nc: ConfigItem[];
  bancos_caixa: ConfigItem[];
  tipos_lancamento: ConfigItem[];
  formas_pagamento: ConfigItem[];
  tipos_despesa: ConfigItem[];
  modalidades: ConfigItem[];
  empresas: EmpresaItem[];
  loading: boolean;
  addItem: (key: ConfigGlobalKey, item: string) => Promise<void>;
  renameItem: (key: ConfigGlobalKey, id: string, nome: string, modalidadeId?: string | null) => Promise<void>;
  removeItem: (key: ConfigGlobalKey, id: string) => Promise<void>;
  setAvaliadorAtivo: (id: string, ativo: boolean) => Promise<void>;
}

function useConfigTable<T extends ConfigItem = ConfigItem>(table: ConfigTable) {
  return useQuery({
    queryKey: ['controle-lojas-config', table],
    queryFn: async () => {
      const res = await fetchConfigList(table);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar lista');
      return res.data as T[];
    },
  });
}

export function useConfigGlobal(): ConfigGlobal {
  const queryClient = useQueryClient();

  const avaliadores      = useConfigTable<AvaliadorItem>('avaliadores');
  const motivos_nc       = useConfigTable('motivos_nc');
  const bancos_caixa     = useConfigTable('bancos_caixa');
  const tipos_lancamento = useConfigTable('tipos_lancamento');
  const formas_pagamento = useConfigTable('formas_pagamento');
  const tipos_despesa    = useConfigTable('tipos_despesa');
  const modalidades      = useConfigTable('modalidades');
  const empresas         = useConfigTable<EmpresaItem>('empresas');

  const invalidate = (table: ConfigTable) =>
    queryClient.invalidateQueries({ queryKey: ['controle-lojas-config', table] });

  const addMutation = useMutation({
    mutationFn: ({ table, nome }: { table: ConfigTable; nome: string }) => addConfigItem(table, nome),
    onSuccess: (_res, { table }) => invalidate(table),
  });

  const renameMutation = useMutation({
    mutationFn: ({ table, id, nome, modalidadeId }: { table: ConfigTable; id: string; nome: string; modalidadeId?: string | null }) =>
      renameConfigItem(table, id, nome, modalidadeId),
    onSuccess: (_res, { table }) => invalidate(table),
  });

  const removeMutation = useMutation({
    mutationFn: ({ table, id }: { table: ConfigTable; id: string }) => removeConfigItem(table, id),
    onSuccess: (_res, { table }) => invalidate(table),
  });

  const setAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => setAvaliadorAtivo(id, ativo),
    onSuccess: () => invalidate('avaliadores'),
  });

  async function addItem(key: ConfigGlobalKey, item: string) {
    const res = await addMutation.mutateAsync({ table: key, nome: item });
    if (!res.data) throw new Error(res.message ?? 'Erro ao adicionar item');
  }

  async function renameItem(key: ConfigGlobalKey, id: string, nome: string, modalidadeId?: string | null) {
    const res = await renameMutation.mutateAsync({ table: key, id, nome, modalidadeId });
    if (!res.data) throw new Error(res.message ?? 'Erro ao renomear item');
  }

  async function removeItem(key: ConfigGlobalKey, id: string) {
    const res = await removeMutation.mutateAsync({ table: key, id });
    if (!res.data) throw new Error(res.message ?? 'Erro ao remover item');
  }

  async function setAvaliadorAtivoFn(id: string, ativo: boolean) {
    const res = await setAtivoMutation.mutateAsync({ id, ativo });
    if (!res.data) throw new Error(res.message ?? 'Erro ao atualizar status');
  }

  const loading = [
    avaliadores, motivos_nc, bancos_caixa, tipos_lancamento,
    formas_pagamento, tipos_despesa, modalidades, empresas,
  ].some(q => q.isLoading);

  return {
    avaliadores:      avaliadores.data      ?? [],
    motivos_nc:       motivos_nc.data       ?? [],
    bancos_caixa:     bancos_caixa.data     ?? [],
    tipos_lancamento: tipos_lancamento.data ?? [],
    formas_pagamento: formas_pagamento.data ?? [],
    tipos_despesa:    tipos_despesa.data    ?? [],
    modalidades:      modalidades.data      ?? [],
    empresas:         empresas.data         ?? [],
    loading,
    addItem,
    renameItem,
    removeItem,
    setAvaliadorAtivo: setAvaliadorAtivoFn,
  };
}
