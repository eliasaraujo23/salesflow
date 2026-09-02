// Regras de bonificação — ver conversa com Elias (2026-09-01). Sujeito a
// novas variantes.

// Donos por token (primeiro nome basta) — só existe uma pessoa com esse nome.
const DONOS_TOKEN = ['EDUARDO', 'HELTON', 'AUGUSTO'];
// Donas identificadas pelo NOME COMPLETO — existe homônima que é funcionária
// (ex: "Thaís Araújo" é avaliadora normal, "Thaís Almeida" é dona), então
// "THAÍS" sozinho não pode entrar em DONOS_TOKEN.
const DONOS_NOME_COMPLETO = ['THAÍS ALMEIDA'];

function ehDono(nome: string): boolean {
  const upper = nome.toUpperCase();
  if (DONOS_NOME_COMPLETO.includes(upper)) return true;
  return DONOS_TOKEN.some(d => upper.includes(d));
}

export interface AnaliseHtRegistroDb {
  cod_interno: string;
  transacao: string | null;
  motivo_nc: string | null;
  preco: string | null;
  peso_total: string | number;
  valor_gasto: string | number;
  pago_por_grama: string | number;
  ouro_24k: string | number;
  ouro_22k: string | number;
  pt: string | number;
  ouro_750: string | number;
  ouro_720: string | number;
  bx: string | number;
  platina: string | number;
  prata: string | number;
  avaliador: string | null;
}

export interface BonificacaoParams {
  teorMedio: number;   // ex: 0.67
  valorFino: number;   // ex: 620
  percentual: number;  // ex: 0.02
  limitePagoPorGrama: number; // ex: 130
}

export const DEFAULT_BONIFICACAO_PARAMS: BonificacaoParams = {
  teorMedio: 0.67,
  valorFino: 620,
  percentual: 0.02,
  limitePagoPorGrama: 130,
};

export interface BonificacaoSubtotal {
  linhasElegiveis: number;
  pesoTotal: number;
  valorGasto: number;
  valorVenda: number;
  lucro: number;
  comissao: number;
}

export interface BonificacaoParceiro extends BonificacaoSubtotal {
  parceiro: string;
}

export interface BonificacaoResultado extends BonificacaoSubtotal {
  avaliador: string;
  individual: BonificacaoSubtotal;
  emConjunto: BonificacaoSubtotal;
  parceiros: BonificacaoParceiro[];
}

function novoSubtotal(): BonificacaoSubtotal {
  return { linhasElegiveis: 0, pesoTotal: 0, valorGasto: 0, valorVenda: 0, lucro: 0, comissao: 0 };
}

function acumular(alvo: BonificacaoSubtotal, peso: number, gasto: number, venda: number, lucro: number, comissao: number) {
  alvo.linhasElegiveis += 1;
  alvo.pesoTotal += peso;
  alvo.valorGasto += gasto;
  alvo.valorVenda += venda;
  alvo.lucro += lucro;
  alvo.comissao += comissao;
}

export function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const num = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(num) ? num : 0;
}

export function somaOuroPlatina(r: AnaliseHtRegistroDb): number {
  return n(r.ouro_24k) + n(r.ouro_22k) + n(r.pt) + n(r.ouro_750) + n(r.ouro_720) + n(r.bx) + n(r.platina);
}

// Avaliadores não-donos da linha "Nome1/Nome2/...", na ordem em que aparecem.
export function naoDonosNaOrdem(avaliadorRaw: string | null): string[] {
  if (!avaliadorRaw) return [];
  const nomes = avaliadorRaw.split('/').map(nome => nome.trim()).filter(Boolean);
  return nomes.filter(nome => !ehDono(nome));
}

export function isLinhaElegivelBonificacao(r: AnaliseHtRegistroDb, params: BonificacaoParams): boolean {
  if (r.transacao?.trim().toUpperCase() !== 'COMPRA') return false;
  if (r.motivo_nc?.trim() === '4') return false; // bijuteria
  if (!r.cod_interno?.trim()) return false; // linha vazia

  const ouroPlatina = somaOuroPlatina(r);
  if (ouroPlatina <= 0) return false; // só prata (ou nada)

  const valorGasto = n(r.valor_gasto);
  const pagoPorGrama = n(r.pago_por_grama);
  if (valorGasto <= 0 || pagoPorGrama <= 0) return false;

  return pagoPorGrama <= params.limitePagoPorGrama;
}

// Regra de bonificação: por linha elegível, os 2% do lucro são divididos
// igualmente entre os avaliadores não-donos da linha (donos nunca recebem).
// 1 não-dono -> recebe os 2% inteiros. 2 não-donos -> 1% cada. 3 -> 2%/3 cada.
export function calcularBonificacao(
  registros: AnaliseHtRegistroDb[],
  params: BonificacaoParams = DEFAULT_BONIFICACAO_PARAMS,
): BonificacaoResultado[] {
  interface Acc {
    total: BonificacaoSubtotal;
    individual: BonificacaoSubtotal;
    emConjunto: BonificacaoSubtotal;
    parceiros: Map<string, BonificacaoSubtotal>;
  }
  const porAvaliador = new Map<string, Acc>();

  for (const r of registros) {
    if (!isLinhaElegivelBonificacao(r, params)) continue;

    const naoDonos = naoDonosNaOrdem(r.avaliador);
    if (naoDonos.length === 0) continue;

    const peso = n(r.peso_total);
    const gasto = n(r.valor_gasto);
    const valorVenda = peso * params.teorMedio * params.valorFino;
    const lucro = valorVenda - gasto;
    const comissaoPorAvaliador = (lucro * params.percentual) / naoDonos.length;
    const emDupla = naoDonos.length > 1;

    for (const avaliador of naoDonos) {
      const acc = porAvaliador.get(avaliador) ?? {
        total: novoSubtotal(), individual: novoSubtotal(), emConjunto: novoSubtotal(), parceiros: new Map<string, BonificacaoSubtotal>(),
      };
      acumular(acc.total, peso, gasto, valorVenda, lucro, comissaoPorAvaliador);
      acumular(emDupla ? acc.emConjunto : acc.individual, peso, gasto, valorVenda, lucro, comissaoPorAvaliador);

      if (emDupla) {
        for (const parceiro of naoDonos) {
          if (parceiro === avaliador) continue;
          const atual = acc.parceiros.get(parceiro) ?? novoSubtotal();
          acumular(atual, peso, gasto, valorVenda, lucro, comissaoPorAvaliador);
          acc.parceiros.set(parceiro, atual);
        }
      }

      porAvaliador.set(avaliador, acc);
    }
  }

  const resultado: BonificacaoResultado[] = [];
  for (const [avaliador, acc] of porAvaliador) {
    const parceiros: BonificacaoParceiro[] = [...acc.parceiros.entries()]
      .map(([parceiro, sub]) => ({ parceiro, ...sub }))
      .sort((a, b) => b.comissao - a.comissao);
    resultado.push({ avaliador, ...acc.total, individual: acc.individual, emConjunto: acc.emConjunto, parceiros });
  }

  return resultado.sort((a, b) => b.comissao - a.comissao);
}
