// Bônus "1º Preço" — ver conversa com Elias (2026-09-01/03).
// Elegível: TRANSACAO=COMPRA, PRECO='1', avaliador aparece sozinho na linha
// (sem "/", sem dupla). Calcula a MÉDIA de pago_por_grama por avaliador
// (só entre essas linhas); quem tiver a MENOR média ganha um bônus fixo —
// mas só se essa menor média for < limiteMedia (ex: R$60). Se a menor
// média não ficar abaixo do limite, ninguém ganha.

import { n, naoDonosNaOrdem, type AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

export interface BonusPrimeiroPrecoParams {
  valorBonus: number;  // ex: 500
  limiteMedia: number; // ex: 60 — a menor média só ganha se ficar abaixo disso
}

export const DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS: BonusPrimeiroPrecoParams = {
  valorBonus: 500,
  limiteMedia: 60,
};

function isLinhaElegivel(r: AnaliseHtRegistroDb): boolean {
  if (r.transacao?.trim().toUpperCase() !== 'COMPRA') return false;
  if (r.motivo_nc?.trim() === '4') return false; // bijuteria
  if (r.preco?.trim() !== '1') return false;
  if (!r.cod_interno?.trim()) return false;

  const naoDonos = naoDonosNaOrdem(r.avaliador);
  return naoDonos.length === 1 && (r.avaliador?.trim().split('/').length ?? 0) === 1;
}

export interface BonusPrimeiroPrecoResultado {
  avaliador: string;
  linhas: number;
  mediaPagoPorGrama: number;
  bonus: number;
}

export function calcularBonusPrimeiroPreco(
  registros: AnaliseHtRegistroDb[],
  params: BonusPrimeiroPrecoParams = DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS,
): BonusPrimeiroPrecoResultado[] {
  const porAvaliador = new Map<string, { soma: number; linhas: number }>();

  for (const r of registros) {
    if (!isLinhaElegivel(r)) continue;

    const avaliador = naoDonosNaOrdem(r.avaliador)[0];
    if (!avaliador) continue;

    const pagoPorGrama = n(r.pago_por_grama);
    const atual = porAvaliador.get(avaliador) ?? { soma: 0, linhas: 0 };
    atual.soma += pagoPorGrama;
    atual.linhas += 1;
    porAvaliador.set(avaliador, atual);
  }

  const medias = [...porAvaliador.entries()].map(([avaliador, { soma, linhas }]) => ({
    avaliador,
    linhas,
    mediaPagoPorGrama: soma / linhas,
  }));

  if (medias.length === 0) return [];

  const menorMedia = Math.min(...medias.map(m => m.mediaPagoPorGrama));
  const ganhaBonus = menorMedia < params.limiteMedia;

  return medias
    .map(m => ({ ...m, bonus: ganhaBonus && m.mediaPagoPorGrama === menorMedia ? params.valorBonus : 0 }))
    .sort((a, b) => a.mediaPagoPorGrama - b.mediaPagoPorGrama);
}
