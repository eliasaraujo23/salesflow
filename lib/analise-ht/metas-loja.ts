// Metas e premiação por loja — ver conversa com Elias (2026-09-02/09-03).
// A base de cálculo é a LOJA inteira (todas as compras de ouro+platina do
// upload, sem filtrar por avaliador sozinho/dupla) — 3 metas "em grupo":
// peso comprado, pago/grama médio (abaixo de), % de compras abaixo de um
// valor/grama. Cada uma dessas paga o prêmio cheio a TODA avaliadora cuja
// loja-base é essa loja (ver analise_ht_loja_base).
// Conversão é a exceção: é individual — cada avaliadora tem sua própria
// conversão (compras dela / avaliações dela, mesmo critério "Atividade" do
// resumo: primeiro não-dono da linha, sozinha ou acompanhada) e só quem
// bate a meta ganha o prêmio de conversão; quem não bate, não ganha.

import { n, somaOuroPlatina, naoDonosNaOrdem, type AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

export interface MetaLojaConfig {
  loja: string;
  metaPeso: number;
  premioPeso: number;
  metaPagoGrama: number;
  premioPagoGrama: number;
  metaConversao: number; // 0-1
  premioConversao: number;
  limiteAbaixo250: number;
  metaAbaixo250: number; // 0-1
  premioAbaixo250: number;
}

export interface ConversaoAvaliadora {
  avaliador: string;
  avaliacoes: number;
  compras: number;
  conversao: number;
  metaBatida: boolean;
}

export interface MetaLojaResultado {
  loja: string;
  pesoComprado: number;
  metaPesoBatida: boolean;
  pagoPorGramaMedio: number;
  metaPagoGramaBatida: boolean;
  percentualAbaixo250: number;
  metaAbaixo250Batida: boolean;
  // Conversão agregada da loja inteira — só informativa, não define prêmio
  // (a meta de conversão que paga é sempre individual, ver abaixo).
  conversaoGeral: number;
  // Prêmio "em grupo" (peso + pago/grama + abaixo do limite) — pago a toda
  // avaliadora da loja, independente de conversão individual.
  premioGrupo: number;
  premioConversao: number;
  // Conversão por avaliadora — cada uma só ganha premioConversao se bateu.
  conversaoPorAvaliadora: ConversaoAvaliadora[];
}

function isElegivel(r: AnaliseHtRegistroDb): boolean {
  if (!r.cod_interno?.trim()) return false;
  if (r.motivo_nc?.trim() === '4') return false; // bijuteria
  return somaOuroPlatina(r) > 0; // fora só-prata
}

export function calcularMetaLoja(
  registros: AnaliseHtRegistroDb[],
  config: MetaLojaConfig,
): MetaLojaResultado {
  const elegiveis = registros.filter(isElegivel);
  const compras = elegiveis.filter(r => r.transacao?.trim().toUpperCase() === 'COMPRA');

  const pesoComprado = compras.reduce((s, r) => s + somaOuroPlatina(r), 0);
  const metaPesoBatida = pesoComprado >= config.metaPeso;

  const somaGasto = compras.reduce((s, r) => s + n(r.valor_gasto), 0);
  const somaPeso = compras.reduce((s, r) => s + n(r.peso_total), 0);
  const pagoPorGramaMedio = somaPeso > 0 ? somaGasto / somaPeso : 0;
  const metaPagoGramaBatida = somaPeso > 0 && pagoPorGramaMedio < config.metaPagoGrama;

  const abaixo250 = compras.filter(r => {
    const ppg = n(r.pago_por_grama);
    return ppg > 0 && ppg < config.limiteAbaixo250;
  });
  const percentualAbaixo250 = compras.length > 0 ? abaixo250.length / compras.length : 0;
  const metaAbaixo250Batida = percentualAbaixo250 >= config.metaAbaixo250;

  const conversaoGeral = elegiveis.length > 0 ? compras.length / elegiveis.length : 0;

  const premioGrupo =
    (metaPesoBatida ? config.premioPeso : 0) +
    (metaPagoGramaBatida ? config.premioPagoGrama : 0) +
    (metaAbaixo250Batida ? config.premioAbaixo250 : 0);

  const porAvaliador = new Map<string, { avaliacoes: number; compras: number }>();
  for (const r of elegiveis) {
    const avaliador = naoDonosNaOrdem(r.avaliador)[0];
    if (!avaliador) continue;
    const atual = porAvaliador.get(avaliador) ?? { avaliacoes: 0, compras: 0 };
    atual.avaliacoes += 1;
    if (r.transacao?.trim().toUpperCase() === 'COMPRA') atual.compras += 1;
    porAvaliador.set(avaliador, atual);
  }

  const conversaoPorAvaliadora: ConversaoAvaliadora[] = [...porAvaliador.entries()]
    .map(([avaliador, { avaliacoes, compras: comprasAvaliador }]) => {
      const conversao = avaliacoes > 0 ? comprasAvaliador / avaliacoes : 0;
      return {
        avaliador,
        avaliacoes,
        compras: comprasAvaliador,
        conversao,
        metaBatida: conversao >= config.metaConversao,
      };
    })
    .sort((a, b) => b.conversao - a.conversao);

  return {
    loja: config.loja,
    pesoComprado,
    metaPesoBatida,
    pagoPorGramaMedio,
    metaPagoGramaBatida,
    percentualAbaixo250,
    metaAbaixo250Batida,
    conversaoGeral,
    premioGrupo,
    premioConversao: config.premioConversao,
    conversaoPorAvaliadora,
  };
}
