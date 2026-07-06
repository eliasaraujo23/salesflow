'use client';

import { useConfigGlobal } from './use-config-global';
import { useConfigLoja } from './use-config-loja';
import { type LojaCode } from '@/lib/controle-config';

export interface ControleOpcoes {
  avaliadores: string[];
  feedbacks_compra: string[];
  feedbacks_nc: string[];
  tipos: string[];
  empresas: string[];
}

export function useControleOpcoes(lojaCode: LojaCode): ControleOpcoes {
  const global = useConfigGlobal();
  const local = useConfigLoja(lojaCode);

  return {
    avaliadores:      global.avaliadores,
    feedbacks_compra: local.feedbacks_compra,
    feedbacks_nc:     global.motivos_nc,
    tipos:            global.modalidades,
    empresas:         global.empresas,
  };
}
