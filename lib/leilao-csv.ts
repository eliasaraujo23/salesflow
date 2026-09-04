import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';
import { loteParaDia } from '@/lib/leilao-lote';

const PECA_MAX = 100;

// Remove quebras de linha e substitui ponto-e-vírgula (que é o delimitador do CSV)
function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/;/g, ',').trim();
}

// Usa ponto-e-vírgula como separador para evitar conflito com vírgulas nas descrições
function row(...fields: (string | number)[]): string {
  return fields.map(f => sanitize(String(f ?? ''))).join(';');
}

// Gera CSV para "Cadastrar Peças"
// item;peca;lote;dia;preco_contratado;descricao;segunda_descricao
export function generateCsvCadastrar(pieces: LeilaoBaseRow[], startLote: number, numDias: number): string {
  const header = 'item;peca;lote;dia;preco_contratado;descricao;segunda_descricao';
  const rows = pieces.map((p, i) => {
    const lote     = startLote + i;
    const full     = sanitize(p.descricao_jewel ?? '');
    const peca     = full.slice(0, PECA_MAX);
    const descFull = `${full} | REF: ${p.referencia}`;
    const preco    = Math.round(p.preco_avista ?? 0);
    return row(lote, peca, lote, loteParaDia(lote, numDias), preco, descFull, p.referencia);
  });
  return [header, ...rows].join('\n');
}

// Peça elegível para transferência: existe na Base Sistema (já filtrada pela API com as regras ativas).
function isEligibleForTransfer(ref: string, priceMap: Map<string, LeilaoBaseRow>): boolean {
  return priceMap.has(ref.toUpperCase());
}

// Retorna contagem de refs excluídas da transferência.
// Peças com destino excluído já são removidas pela API antes de chegar ao priceMap.
export function countExcludedFromTransfer(
  refs:     string[],
  priceMap: Map<string, LeilaoBaseRow>,
): { foraBase: number; destinoExcluido: number; total: number } {
  let foraBase = 0;
  for (const ref of refs) {
    if (!priceMap.has(ref.toUpperCase())) foraBase++;
  }
  return { foraBase, destinoExcluido: 0, total: foraBase };
}

// Gera CSV para "Transferir Leilão" (sem atualizar preço)
// Exclui peças em comodato e sem correspondência no sistema
export function generateCsvTransferir(
  refs:     string[],
  novoLeilao: string,
  priceMap?: Map<string, LeilaoBaseRow>,
): string {
  const header = 'lote;dia;mini_descricao;numero_leilao';
  const eligible = priceMap ? refs.filter(r => isEligibleForTransfer(r, priceMap)) : refs;
  const rows = eligible.map(ref => `;;${ref};${novoLeilao}`);
  return [header, ...rows].join('\n');
}

// Gera CSV para "Transferir c/ Valor" (atualiza preço na transferência)
// Exclui peças sem preço (evita zerar) além dos critérios de isEligibleForTransfer
export function generateCsvTransferirComValor(
  refs:        string[],
  priceMap:    Map<string, LeilaoBaseRow>,
  novoLeilao:  string,
): string {
  const header = 'lote;dia;mini_descricao;numero_leilao;novo_valor';
  const rows = refs
    .filter(ref => {
      if (!isEligibleForTransfer(ref, priceMap)) return false;
      const preco = priceMap.get(ref.toUpperCase())?.preco_avista ?? 0;
      return preco > 0;
    })
    .map(ref => {
      const preco = Math.round(priceMap.get(ref.toUpperCase())!.preco_avista!);
      return `;;${ref};${novoLeilao};${preco}`;
    });
  return [header, ...rows].join('\n');
}

// Detail info para refs não encontradas no priceMap — vem do endpoint /api/leilao/refs-detail
export interface RefDetailExtra {
  referencia:  string;
  motivo:      string;
  destino:     string | null;
  status_nome: string;
  fotos:       number;
}

// Gera CSV das peças excluídas da transferência, com motivo e destino detalhados.
// details: mapa ref → RefDetailExtra (opcional); quando presente, enriquece "Fora da Base".
export function generateCsvExcluidas(
  refs:     string[],
  priceMap: Map<string, LeilaoBaseRow>,
  details?: Map<string, RefDetailExtra>,
): string {
  const header = 'referencia;motivo;status;destino;fotos';
  const rows: string[] = [];
  for (const ref of refs) {
    const piece  = priceMap.get(ref.toUpperCase());
    const detail = details?.get(ref.toUpperCase()) ?? details?.get(ref);
    if (!piece) {
      const motivo  = detail?.motivo      ?? 'Fora da Base Sistema';
      const status  = detail?.status_nome ?? '';
      const destino = sanitize(detail?.destino ?? '');
      const fotos   = detail?.fotos !== undefined ? String(detail.fotos) : '';
      rows.push(`${ref};${motivo};${status};${destino};${fotos}`);
    }
  }
  return [header, ...rows].join('\n');
}

export interface ImageKeysRow {
  mini_descricao: string;
  key_principal:  string | null;
  key_extra_1:    string | null;
  key_extra_2:    string | null;
  key_extra_3:    string | null;
  key_extra_4:    string | null;
  key_extra_5:    string | null;
}

// Gera CSV para "Upload Imagens" com chaves de imagem do banco
export function generateCsvUploadImagens(refs: string[], imageKeys?: Map<string, ImageKeysRow>): string {
  const header = 'mini_descricao;key_principal;key_extra_1;key_extra_2;key_extra_3;key_extra_4;key_extra_5';
  if (!imageKeys) {
    // Fallback sem dados do banco: só a ref, demais colunas vazias
    const rows = refs.map(r => `${r};;;;;;`);
    return [header, ...rows].join('\n');
  }
  const rows = refs.map(ref => {
    const k = imageKeys.get(ref.toUpperCase()) ?? imageKeys.get(ref);
    return [
      ref,
      k?.key_principal ?? '',
      k?.key_extra_1   ?? '',
      k?.key_extra_2   ?? '',
      k?.key_extra_3   ?? '',
      k?.key_extra_4   ?? '',
      k?.key_extra_5   ?? '',
    ].join(';');
  });
  return [header, ...rows].join('\n');
}

// Gera CSV para "Atualizar Preço"
// mini_descricao,novo_valor
export function generateCsvAtualizarPreco(refs: string[], priceMap: Map<string, LeilaoBaseRow>): string {
  const header = 'mini_descricao;novo_valor';
  const rows = refs
    .filter(ref => (priceMap.get(ref.toUpperCase())?.preco_avista ?? 0) > 0)
    .map(ref => {
      const preco = Math.round(priceMap.get(ref.toUpperCase())!.preco_avista!);
      return `${ref};${preco}`;
    });
  return [header, ...rows].join('\n');
}

// Conta quantas refs têm preço válido no sistema (usado para exibir o total real no botão)
export function countRefsWithPrice(refs: string[], priceMap: Map<string, LeilaoBaseRow>): number {
  return refs.filter(ref => (priceMap.get(ref.toUpperCase())?.preco_avista ?? 0) > 0).length;
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content, ''], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
