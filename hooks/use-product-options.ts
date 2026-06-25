'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchProductOptionsAction, type ProductOptions } from '@/lib/actions/fetch-product-options';

const FALLBACK: ProductOptions = {
  produtos:    ['ALIANÇA', 'ALIANÇA RIVIERA', 'ANEL', 'BRINCO', 'BRINCO DE PRESSÃO', 'COLAR', 'PINGENTE', 'PULSEIRA'],
  subtipos:    ['CHUVEIRO', 'CRAVEJADO', 'GOTA', 'ILUSION', 'INFINITO', 'MACIÇO', 'MARACANÃ', 'MEIA ALIANÇA', 'PARA RIVIERA', 'PAVÊ', 'PONTO DE LUZ', 'RIVIERA', 'SOLITÁRIO', 'VOLTINHA'],
  tipo_pedras: ['ALEXANDRITA', 'DIAMANTE', 'ESMERALDA', 'ESMERALDA COLOMBIANA', 'RUBI', 'SAFIRA', 'TANZANITA', 'TOPÁZIO IMPERIAL', 'TURMALINA PARAÍBA'],
  lapidacoes:  ['ASSCHER', 'BRILHANTE', 'CORAÇÃO', 'CUSHION', 'ESMERALDA', 'MARQUISE', 'OVAL', 'PERA', 'PRINCESA'],
};

export function useProductOptions() {
  const query = useQuery({
    queryKey: ['product-options'],
    queryFn: fetchProductOptionsAction,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const data = query.data ?? FALLBACK;

  // Merge API results with fallback so known values always appear
  const merge = (api: string[], fallback: string[]) =>
    [...new Set([...api, ...fallback])].sort();

  return {
    isLoading: query.isLoading,
    produtos:    query.data ? merge(data.produtos,    FALLBACK.produtos)    : FALLBACK.produtos,
    subtipos:    query.data ? merge(data.subtipos,    FALLBACK.subtipos)    : FALLBACK.subtipos,
    tipo_pedras: query.data ? merge(data.tipo_pedras, FALLBACK.tipo_pedras) : FALLBACK.tipo_pedras,
    lapidacoes:  query.data ? merge(data.lapidacoes,  FALLBACK.lapidacoes)  : FALLBACK.lapidacoes,
  };
}
