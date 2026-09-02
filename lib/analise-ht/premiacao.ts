// Regra de premiação — ver conversa com Elias (2026-09-01).
// Elegível: TRANSACAO=COMPRA, não bijuteria, não só-prata, peso >= 20g e
// pago/grama < limite (padrão R$40). As 3 MENORES pago/grama da loja
// (por valor distinto — empate no mesmo valor divide a mesma posição,
// cada compra empatada recebe o prêmio cheio daquela posição) ganham
// prêmio conforme a tabela de faixas (valor x peso) do grupo de lojas.
// O prêmio de cada compra é dividido igualmente entre os avaliadores
// não-donos da linha, igual na bonificação.

import { n, somaOuroPlatina, naoDonosNaOrdem, type AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

export interface PremiacaoFaixa {
  valorMin: number;
  valorMax: number;
  pesoMin: number;
  pesoMax: number | null;
  premio1: number;
  premio2: number;
  premio3: number;
}

export interface PremiacaoParams {
  limiteValorGrama: number; // ex: 40
  pesoMinimo: number;       // ex: 20
}

export const DEFAULT_PREMIACAO_PARAMS: PremiacaoParams = {
  limiteValorGrama: 40,
  pesoMinimo: 20,
};

export const GRUPO_LOJAS = {
  GTT_PTQ_PGT_24K: 'GTT_PTQ_PGT_24K',
  GTI_CI: 'GTI_CI',
} as const;

// GTT=Tijuca, PTQ=Taquara, PGT=Premier Gold Tijuca ("Tijuquinha"), 24K=Méier
// GTI=Ipanema, PCI=Prime Joias Copanema ("Copacabana") — ver AGENTS.md seção 5.
// CI mantido como sinônimo de PCI (nome usado no AGENTS.md, mas a sigla real
// nos arquivos de Análise HT é PCI).
const LOJA_PARA_GRUPO: Record<string, string> = {
  GTT: GRUPO_LOJAS.GTT_PTQ_PGT_24K,
  PTQ: GRUPO_LOJAS.GTT_PTQ_PGT_24K,
  PGT: GRUPO_LOJAS.GTT_PTQ_PGT_24K,
  '24K': GRUPO_LOJAS.GTT_PTQ_PGT_24K,
  GTI: GRUPO_LOJAS.GTI_CI,
  PCI: GRUPO_LOJAS.GTI_CI,
  CI: GRUPO_LOJAS.GTI_CI,
};

export function grupoLojasPorLoja(loja: string): string | null {
  return LOJA_PARA_GRUPO[loja.trim().toUpperCase()] ?? null;
}

function isLinhaElegivelPremiacao(r: AnaliseHtRegistroDb, params: PremiacaoParams): boolean {
  if (r.transacao?.trim().toUpperCase() !== 'COMPRA') return false;
  if (r.motivo_nc?.trim() === '4') return false;
  if (!r.cod_interno?.trim()) return false;
  if (somaOuroPlatina(r) <= 0) return false;

  const pesoTotal = n(r.peso_total);
  const pagoPorGrama = n(r.pago_por_grama);
  if (n(r.valor_gasto) <= 0 || pagoPorGrama <= 0) return false;

  return pesoTotal >= params.pesoMinimo && pagoPorGrama < params.limiteValorGrama;
}

// Faixas de peso usam limites inteiros (20-30, 31-40, ...) — comparação pela
// parte inteira do peso, então 40,4g cai em "31-40", não em "41-50".
function buscarFaixa(faixas: PremiacaoFaixa[], valor: number, peso: number): PremiacaoFaixa | null {
  const pesoInteiro = Math.floor(peso);
  return faixas.find(f =>
    valor >= f.valorMin && valor <= f.valorMax &&
    pesoInteiro >= f.pesoMin && (f.pesoMax === null || pesoInteiro <= f.pesoMax)
  ) ?? null;
}

export interface PremiacaoVencedor {
  posicao: 1 | 2 | 3;
  codInterno: string;
  pagoPorGrama: number;
  pesoTotal: number;
  premioTotal: number;
  avaliadores: { avaliador: string; premio: number }[];
}

export interface PremiacaoResultadoAvaliador {
  avaliador: string;
  premio: number;
}

export interface PremiacaoResultado {
  vencedores: PremiacaoVencedor[];
  porAvaliador: PremiacaoResultadoAvaliador[];
}

export function calcularPremiacao(
  registros: AnaliseHtRegistroDb[],
  faixas: PremiacaoFaixa[],
  params: PremiacaoParams = DEFAULT_PREMIACAO_PARAMS,
): PremiacaoResultado {
  const elegiveis = registros.filter(r => isLinhaElegivelPremiacao(r, params));

  const valoresDistintos = [...new Set(elegiveis.map(r => n(r.pago_por_grama)))].sort((a, b) => a - b);
  const top3Valores = valoresDistintos.slice(0, 3);

  const vencedores: PremiacaoVencedor[] = [];
  const porAvaliadorMap = new Map<string, number>();

  top3Valores.forEach((valor, idx) => {
    const posicao = (idx + 1) as 1 | 2 | 3;
    const compras = elegiveis.filter(r => n(r.pago_por_grama) === valor);

    for (const r of compras) {
      const peso = n(r.peso_total);
      const faixa = buscarFaixa(faixas, valor, peso);
      if (!faixa) continue;

      const premioTotal = posicao === 1 ? faixa.premio1 : posicao === 2 ? faixa.premio2 : faixa.premio3;
      const naoDonos = naoDonosNaOrdem(r.avaliador);
      if (naoDonos.length === 0) continue;

      const premioPorAvaliador = premioTotal / naoDonos.length;
      const avaliadores = naoDonos.map(avaliador => ({ avaliador, premio: premioPorAvaliador }));

      for (const { avaliador, premio } of avaliadores) {
        porAvaliadorMap.set(avaliador, (porAvaliadorMap.get(avaliador) ?? 0) + premio);
      }

      vencedores.push({
        posicao,
        codInterno: r.cod_interno,
        pagoPorGrama: valor,
        pesoTotal: peso,
        premioTotal,
        avaliadores,
      });
    }
  });

  const porAvaliador = [...porAvaliadorMap.entries()]
    .map(([avaliador, premio]) => ({ avaliador, premio }))
    .sort((a, b) => b.premio - a.premio);

  return { vencedores, porAvaliador };
}
