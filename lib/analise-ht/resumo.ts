// Resumo por avaliadora (formato "planilha", colunas=avaliadoras) — ver
// conversa com Elias (2026-09-01/02). Duas bases de dados diferentes:
// - Atividade (Avaliações/Compras/Não compras/Conversão, Peso Comprado/Não
//   Comprado, %Bonificação): conta a linha quando a avaliadora é o
//   PRIMEIRO nome não-dono (sozinha OU acompanhada).
// - Financeiro (Média Geral, 1º/2º/3º Preço): só conta quando a avaliadora
//   aparece 100% SOZINHA (sem "/").
// Ambas excluem bijuteria (motivo_nc='4') e linhas só-prata (sem ouro/platina).

import { n, somaOuroPlatina, naoDonosNaOrdem, ehDono, type AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

export interface ResumoParams {
  teorMedio: number;         // ex: 0.67
  valorFino: number;         // ex: 620
  limitePagoPorGrama: number; // ex: 130 — usado no % Bonificação
  // Separados dos de cima para não acoplar o Lucro Gerado (estimativa
  // usada só no Resumo) aos parâmetros de Bonificação.
  teorMedioLucro: number;    // ex: 0.67
  valorFinoLucro: number;    // ex: 620
}

export const DEFAULT_RESUMO_PARAMS: ResumoParams = {
  teorMedio: 0.67,
  valorFino: 620,
  limitePagoPorGrama: 130,
  teorMedioLucro: 0.67,
  valorFinoLucro: 620,
};

export interface ResumoAvaliadora {
  avaliador: string;
  avaliacoes: number;
  compras: number;
  naoCompras: number;
  conversao: number; // 0-1
  pesoComprado: number;
  pesoNaoComprado: number;
  percentualBonificacao: number; // 0-1
  mediaGeral: number;
  primeiroPreco: number;
  segundoPreco: number;
  terceiroPreco: number;
  lucroGerado: number;
}

function isSozinha(avaliadorRaw: string | null): string | null {
  if (!avaliadorRaw) return null;
  const nome = avaliadorRaw.trim();
  if (!nome || nome.includes('/') || ehDono(nome)) return null;
  return nome;
}

function isElegivel(r: AnaliseHtRegistroDb): boolean {
  if (!r.cod_interno?.trim()) return false; // linha vazia
  if (r.motivo_nc?.trim() === '4') return false; // bijuteria
  return somaOuroPlatina(r) > 0; // fora só-prata
}

export function calcularResumo(
  registros: AnaliseHtRegistroDb[],
  params: ResumoParams = DEFAULT_RESUMO_PARAMS,
): ResumoAvaliadora[] {
  const elegiveis = registros.filter(isElegivel);

  const porAvaliadorAtividade = new Map<string, AnaliseHtRegistroDb[]>();
  const porAvaliadorFinanceiro = new Map<string, AnaliseHtRegistroDb[]>();

  for (const r of elegiveis) {
    const primeiroNome = naoDonosNaOrdem(r.avaliador)[0];
    if (primeiroNome) {
      const atual = porAvaliadorAtividade.get(primeiroNome) ?? [];
      atual.push(r);
      porAvaliadorAtividade.set(primeiroNome, atual);
    }

    const sozinha = isSozinha(r.avaliador);
    if (sozinha) {
      const atual = porAvaliadorFinanceiro.get(sozinha) ?? [];
      atual.push(r);
      porAvaliadorFinanceiro.set(sozinha, atual);
    }
  }

  const avaliadores = new Set([...porAvaliadorAtividade.keys(), ...porAvaliadorFinanceiro.keys()]);
  const resultado: ResumoAvaliadora[] = [];

  for (const avaliador of avaliadores) {
    const linhasAtividade = porAvaliadorAtividade.get(avaliador) ?? [];
    const linhasFinanceiro = porAvaliadorFinanceiro.get(avaliador) ?? [];

    const avaliacoes = linhasAtividade.length;
    const comprasAtividade = linhasAtividade.filter(r => r.transacao?.trim().toUpperCase() === 'COMPRA');
    const naoComprasAtividade = linhasAtividade.filter(r => r.transacao?.trim().toUpperCase() !== 'COMPRA');
    const compras = comprasAtividade.length;
    const naoCompras = naoComprasAtividade.length;
    const conversao = avaliacoes > 0 ? compras / avaliacoes : 0;

    const comprasFinanceiro = linhasFinanceiro.filter(r => r.transacao?.trim().toUpperCase() === 'COMPRA');

    const pesoComprado = comprasAtividade.reduce((s, r) => s + somaOuroPlatina(r), 0);
    const pesoNaoComprado = naoComprasAtividade.reduce((s, r) => s + somaOuroPlatina(r), 0);

    const bonificadas = comprasAtividade.filter(r => n(r.pago_por_grama) > 0 && n(r.pago_por_grama) < params.limitePagoPorGrama);
    const percentualBonificacao = comprasAtividade.length > 0 ? bonificadas.length / comprasAtividade.length : 0;

    const somaGasto = comprasFinanceiro.reduce((s, r) => s + n(r.valor_gasto), 0);
    const somaPeso = comprasFinanceiro.reduce((s, r) => s + n(r.peso_total), 0);
    // Média aritmética simples de pago_por_grama — não ponderada por peso
    // (ver conversa 2026-09-04: comparado direto contra a coluna Pago por
    // Grama da planilha, ex: (30,77+363,64+100+150)/4 = 161,10).
    const mediaSimples = (linhas: AnaliseHtRegistroDb[]) => {
      if (linhas.length === 0) return 0;
      return linhas.reduce((s, r) => s + n(r.pago_por_grama), 0) / linhas.length;
    };
    const mediaGeral = mediaSimples(comprasFinanceiro);

    const mediaPorPreco = (codigo: string) => {
      const grupo = comprasFinanceiro.filter(r => r.preco?.trim() === codigo);
      return mediaSimples(grupo);
    };

    const valorVendaTotal = somaPeso * params.teorMedioLucro * params.valorFinoLucro;
    const lucroGerado = valorVendaTotal - somaGasto;

    resultado.push({
      avaliador,
      avaliacoes,
      compras,
      naoCompras,
      conversao,
      pesoComprado,
      pesoNaoComprado,
      percentualBonificacao,
      mediaGeral,
      primeiroPreco: mediaPorPreco('1'),
      segundoPreco: mediaPorPreco('2'),
      terceiroPreco: mediaPorPreco('3'),
      lucroGerado,
    });
  }

  return resultado.sort((a, b) => b.avaliacoes - a.avaliacoes);
}
