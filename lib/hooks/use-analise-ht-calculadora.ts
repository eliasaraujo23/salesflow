'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_BONIFICACAO_PARAMS } from '@/lib/analise-ht/bonificacao';
import { DEFAULT_PREMIACAO_PARAMS, grupoLojasPorLoja } from '@/lib/analise-ht/premiacao';
import { DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS } from '@/lib/analise-ht/bonus-primeiro-preco';
import { DEFAULT_RESUMO_PARAMS } from '@/lib/analise-ht/resumo';
import { useAnaliseHtBonificacao } from '@/lib/hooks/use-analise-ht-bonificacao';
import { useAnaliseHtPremiacao } from '@/lib/hooks/use-analise-ht-premiacao';
import { useAnaliseHtBonusPrimeiroPreco } from '@/lib/hooks/use-analise-ht-bonus-primeiro-preco';
import { useAnaliseHtResumo } from '@/lib/hooks/use-analise-ht-resumo';
import { useAnaliseHtMetasLoja } from '@/lib/hooks/use-analise-ht-metas-loja';
import { useAnaliseHtLojaBase } from '@/lib/hooks/use-analise-ht-loja-base';
import { useAnaliseHtGratificacao } from '@/lib/hooks/use-analise-ht-gratificacao';

export interface UploadAlvo {
  id: string;
  loja: string;
}

interface ParametrosCalculadora {
  teorMedio: number;
  valorFino: number;
  percentual: number;
  limitePagoPorGrama: number;
  limiteValorGrama: number;
  pesoMinimo: number;
  valorBonusPrimeiroPreco: number;
  limiteMediaBonusPrimeiroPreco: number;
  teorMedioLucro: number;
  valorFinoLucro: number;
}

const PARAMETROS_DEFAULT: ParametrosCalculadora = {
  teorMedio: DEFAULT_BONIFICACAO_PARAMS.teorMedio * 100,
  valorFino: DEFAULT_BONIFICACAO_PARAMS.valorFino,
  percentual: DEFAULT_BONIFICACAO_PARAMS.percentual * 100,
  limitePagoPorGrama: DEFAULT_BONIFICACAO_PARAMS.limitePagoPorGrama,
  limiteValorGrama: DEFAULT_PREMIACAO_PARAMS.limiteValorGrama,
  pesoMinimo: DEFAULT_PREMIACAO_PARAMS.pesoMinimo,
  valorBonusPrimeiroPreco: DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS.valorBonus,
  limiteMediaBonusPrimeiroPreco: DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS.limiteMedia,
  teorMedioLucro: DEFAULT_RESUMO_PARAMS.teorMedioLucro * 100,
  valorFinoLucro: DEFAULT_RESUMO_PARAMS.valorFinoLucro,
};

// Cache global (não por sessão de componente) — sem isso, o valor digitado
// no modal de Parâmetros se perdia toda vez que a página era remontada ao
// navegar entre abas (ex: Bonificação -> Resumo -> Bonificação), mesmo o
// resultado já calculado continuando correto (ver conversa 2026-09-03).
const PARAMS_QUERY_KEY = ['analise-ht-parametros'];

function useParametrosCalculadora() {
  const qc = useQueryClient();
  const { data: params = PARAMETROS_DEFAULT } = useQuery<ParametrosCalculadora>({
    queryKey: PARAMS_QUERY_KEY,
    queryFn: () => qc.getQueryData(PARAMS_QUERY_KEY) ?? PARAMETROS_DEFAULT,
    staleTime: Infinity,
  });

  function setParam<K extends keyof ParametrosCalculadora>(key: K, value: ParametrosCalculadora[K]) {
    qc.setQueryData<ParametrosCalculadora>(PARAMS_QUERY_KEY, prev => ({ ...(prev ?? PARAMETROS_DEFAULT), [key]: value }));
  }

  return { params, setParam };
}

// Centraliza parâmetros + os 4 cálculos (bonificação, premiação, bônus 1º
// preço, resumo) — usado nas páginas /analise-ht e /analise-ht/resumo, que
// compartilham o mesmo cálculo via cache do React Query (ver hooks
// individuais): calcular em qualquer uma mantém o resultado ao navegar.
export function useAnaliseHtCalculadora(uploads: UploadAlvo[]) {
  const { params: p, setParam } = useParametrosCalculadora();
  const {
    teorMedio, valorFino, percentual, limitePagoPorGrama,
    limiteValorGrama, pesoMinimo, valorBonusPrimeiroPreco, limiteMediaBonusPrimeiroPreco,
    teorMedioLucro, valorFinoLucro,
  } = p;
  const setTeorMedio = (v: number) => setParam('teorMedio', v);
  const setValorFino = (v: number) => setParam('valorFino', v);
  const setPercentual = (v: number) => setParam('percentual', v);
  const setLimitePagoPorGrama = (v: number) => setParam('limitePagoPorGrama', v);
  const setLimiteValorGrama = (v: number) => setParam('limiteValorGrama', v);
  const setPesoMinimo = (v: number) => setParam('pesoMinimo', v);
  const setValorBonusPrimeiroPreco = (v: number) => setParam('valorBonusPrimeiroPreco', v);
  const setLimiteMediaBonusPrimeiroPreco = (v: number) => setParam('limiteMediaBonusPrimeiroPreco', v);
  const setTeorMedioLucro = (v: number) => setParam('teorMedioLucro', v);
  const setValorFinoLucro = (v: number) => setParam('valorFinoLucro', v);

  const uploadIds = useMemo(() => uploads.map(u => u.id), [uploads]);
  const { resultado: bonificacao, calcular: calcularBonificacao, isCalculating: isCalculatingBonificacao } = useAnaliseHtBonificacao(uploadIds);
  const { resultado: premiacao, calcular: calcularPremiacao, isCalculating: isCalculatingPremiacao } = useAnaliseHtPremiacao(uploadIds);
  const { resultado: bonusPrimeiroPreco, calcular: calcularBonusPrimeiroPreco, isCalculating: isCalculatingBonus } = useAnaliseHtBonusPrimeiroPreco(uploadIds);
  const { resultado: resumo, calcular: calcularResumo, isCalculating: isCalculatingResumo } = useAnaliseHtResumo(uploadIds);
  const { resultado: metasLoja, calcular: calcularMetasLoja, isCalculating: isCalculatingMetasLoja } = useAnaliseHtMetasLoja();
  const { itens: lojaBaseItens } = useAnaliseHtLojaBase();
  const referenciaGerente = useMemo(() => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const { itens: gratificacaoItens } = useAnaliseHtGratificacao(uploadIds, [referenciaGerente]);

  const gratificacaoPorChave = useMemo(() => {
    const map: Record<string, number> = {};
    const lojaPorUpload = new Map(uploads.map(u => [u.id, u.loja]));
    const lojaBasePorAvaliador = new Map(lojaBaseItens.map(item => [item.avaliador, item.loja]));
    for (const g of gratificacaoItens) {
      // Gratificação de gerente não tem upload_id — a "loja" usada na chave
      // é a loja-base atribuída manualmente (ex: "Gerente").
      const loja = g.uploadId ? lojaPorUpload.get(g.uploadId) : lojaBasePorAvaliador.get(g.avaliador);
      if (loja) map[`${g.avaliador}::${loja}`] = (map[`${g.avaliador}::${loja}`] ?? 0) + g.valor;
    }
    return map;
  }, [gratificacaoItens, uploads, lojaBaseItens]);

  const metaLojaPorChave = useMemo(() => {
    const map: Record<string, number> = {};
    const metaPorLoja = new Map(metasLoja.map(m => [m.loja, m]));
    for (const item of lojaBaseItens) {
      const meta = metaPorLoja.get(item.loja);
      if (!meta) continue;
      // Prêmio "em grupo" (peso + pago/grama + abaixo do limite) vai pra
      // toda avaliadora da loja; conversão é individual — só quem bateu a
      // própria meta de conversão ganha o prêmio de conversão.
      const conversaoDela = meta.conversaoPorAvaliadora.find(c => c.avaliador === item.avaliador);
      const premioConversaoDela = conversaoDela?.metaBatida ? meta.premioConversao : 0;
      const total = meta.premioGrupo + premioConversaoDela;
      if (total) map[`${item.avaliador}::${item.loja}`] = total;
    }
    return map;
  }, [metasLoja, lojaBaseItens]);

  const premiacaoPorChave = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of premiacao) map[`${p.avaliador}::${p.loja}`] = p.premio;
    return map;
  }, [premiacao]);

  const bonusPrimeiroPrecoPorChave = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bonusPrimeiroPreco) map[`${b.avaliador}::${b.loja}`] = b.bonus;
    return map;
  }, [bonusPrimeiroPreco]);

  const bonificacaoPorChave = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bonificacao) map[`${b.avaliador}::${b.loja}`] = b.comissao;
    return map;
  }, [bonificacao]);

  const lojasSemGrupo = useMemo(
    () => uploads.map(u => u.loja).filter(loja => !grupoLojasPorLoja(loja)),
    [uploads]
  );

  const isCalculating = isCalculatingBonificacao || isCalculatingPremiacao || isCalculatingBonus || isCalculatingResumo || isCalculatingMetasLoja;

  // Cache de resultado (React Query) vive só na sessão do navegador — some
  // ao logar de novo/recarregar a página. Recalcula automaticamente uma
  // vez ao carregar se ainda não houver nada em cache, para não abrir a
  // tela com tudo zerado até o usuário clicar em Calcular manualmente.
  // IMPORTANTE: não usar useRef aqui — ele é local ao componente e reseta
  // toda vez que a página remonta (ex: navegar Bonificação -> Resumo ->
  // Bonificação), disparando recálculo de novo mesmo já havendo cache
  // (ver conversa 2026-09-03: botão "preso" em Calculando ao reabrir).
  // `bonificacao.length > 0` já é a checagem correta e persiste no cache
  // global independente de quantas vezes o componente remonta.
  useEffect(() => {
    if (uploads.length === 0) return;
    if (bonificacao.length > 0) return;
    handleCalcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads.length, bonificacao.length]);

  function handleCalcular() {
    calcularBonificacao({
      uploadIds,
      teorMedio: teorMedio / 100,
      valorFino,
      percentual: percentual / 100,
      limitePagoPorGrama,
    });

    const alvosPremiacao = uploads
      .map(u => ({ uploadId: u.id, grupoLojas: grupoLojasPorLoja(u.loja) }))
      .filter((a): a is { uploadId: string; grupoLojas: string } => a.grupoLojas !== null);
    if (alvosPremiacao.length > 0) {
      calcularPremiacao({ alvos: alvosPremiacao, limiteValorGrama, pesoMinimo });
    }

    calcularBonusPrimeiroPreco({ uploadIds, valorBonus: valorBonusPrimeiroPreco, limiteMedia: limiteMediaBonusPrimeiroPreco });

    calcularResumo({
      uploadIds,
      teorMedio: teorMedio / 100,
      valorFino,
      limitePagoPorGrama,
      teorMedioLucro: teorMedioLucro / 100,
      valorFinoLucro,
    });

    calcularMetasLoja(uploadIds);
  }

  return {
    params: {
      teorMedio, setTeorMedio,
      valorFino, setValorFino,
      percentual, setPercentual,
      limitePagoPorGrama, setLimitePagoPorGrama,
      limiteValorGrama, setLimiteValorGrama,
      pesoMinimo, setPesoMinimo,
      valorBonusPrimeiroPreco, setValorBonusPrimeiroPreco,
      limiteMediaBonusPrimeiroPreco, setLimiteMediaBonusPrimeiroPreco,
      teorMedioLucro, setTeorMedioLucro,
      valorFinoLucro, setValorFinoLucro,
    },
    bonificacao,
    premiacaoPorChave,
    bonusPrimeiroPrecoPorChave,
    bonificacaoPorChave,
    metaLojaPorChave,
    gratificacaoPorChave,
    resumo,
    lojasSemGrupo,
    isCalculating,
    handleCalcular,
  };
}
