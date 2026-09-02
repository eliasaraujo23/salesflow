'use client';

import { useConfigGlobal } from './use-config-global';
import { useConfigLoja } from './use-config-loja';
import { type LojaCode } from '@/lib/controle-config';
import { type ConfigItem, type EmpresaItem, type AvaliadorItem } from '@/lib/actions/controle-lojas-config';

export interface ControleOpcoes {
  /** Somente avaliadores ativos — para popular selects de novos registros. */
  avaliadores: AvaliadorItem[];
  feedbacks_compra: ConfigItem[];
  feedbacks_nc: ConfigItem[];
  tipos: ConfigItem[];
  empresas: EmpresaItem[];
}

export function useControleOpcoes(lojaCode: LojaCode): ControleOpcoes {
  const global = useConfigGlobal();
  const local = useConfigLoja(lojaCode);

  return {
    avaliadores:      global.avaliadores.filter(a => a.ativo),
    feedbacks_compra: local.feedbacks_compra,
    feedbacks_nc:     global.motivos_nc,
    tipos:            global.modalidades,
    empresas:         global.empresas,
  };
}
