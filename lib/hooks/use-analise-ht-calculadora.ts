'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

// Persistido no banco (analise_ht_parametros) — antes vivia só em cache do
// React Query (memória do navegador) e se perdia ao recarregar a página ou
// abrir em outra sessão (ver conversa 2026-09-04). O cache aqui é só a
// camada otimista: busca do banco no mount, atualiza local a cada tecla, e
// salva no banco com debounce para não disparar um PUT por caractere.
const PARAMS_QUERY_KEY = ['analise-ht-parametros'];

async function fetchParametros(): Promise<ParametrosCalculadora> {
  const res = await fetch('/api/analise-ht/parametros', { cache: 'no-store' });
  if (!res.ok) return PARAMETROS_DEFAULT;
  const body = await res.json().catch(() => ({}));
  return body.data ? { ...PARAMETROS_DEFAULT, ...body.data } : PARAMETROS_DEFAULT;
}

function useParametrosCalculadora() {
  const qc = useQueryClient();
  const { data: params = PARAMETROS_DEFAULT, isSuccess: parametrosCarregados } = useQuery<ParametrosCalculadora>({
    queryKey: PARAMS_QUERY_KEY,
    queryFn: fetchParametros,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function salvarNoBanco(proximo: ParametrosCalculadora) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch('/api/analise-ht/parametros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proximo),
      });
      if (!res.ok) toast.error('Falha ao salvar parâmetros.');
    }, 600);
  }

  function setParam<K extends keyof ParametrosCalculadora>(key: K, value: ParametrosCalculadora[K]) {
    const proximo = { ...(qc.getQueryData<ParametrosCalculadora>(PARAMS_QUERY_KEY) ?? PARAMETROS_DEFAULT), [key]: value };
    qc.setQueryData<ParametrosCalculadora>(PARAMS_QUERY_KEY, proximo);
    salvarNoBanco(proximo);
  }

  return { params, setParam, parametrosCarregados };
}

// Centraliza parâmetros + os 4 cálculos (bonificação, premiação, bônus 1º
// preço, resumo) — usado nas páginas /analise-ht e /analise-ht/resumo, que
// compartilham o mesmo cálculo via cache do React Query (ver hooks
// individuais): calcular em qualquer uma mantém o resultado ao navegar.
export function useAnaliseHtCalculadora(uploads: UploadAlvo[]) {
  const { params: p, setParam, parametrosCarregados } = useParametrosCalculadora();
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
  // IMPORTANTE: só dispara depois que os parâmetros terminaram de
  // carregar do banco (parametrosCarregados) — sem isso, o auto-cálculo
  // ao recarregar a página rodava com os valores default (67/620) antes
  // do fetch de /api/analise-ht/parametros terminar, e o resultado ficava
  // errado até alguém clicar em Calcular manualmente de novo (ver
  // conversa 2026-09-04: Lucro Gerado voltando ao valor antigo).
  useEffect(() => {
    if (!parametrosCarregados) return;
    if (uploads.length === 0) return;
    if (bonificacao.length > 0) return;
    handleCalcular();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploads.length, bonificacao.length, parametrosCarregados]);

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
