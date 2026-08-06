import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';

const PECA_MAX = 100;

// Destinos que indicam peça fora do circuito da loja (consignada a terceiros, etc.)
const DESTINOS_EXCL = new Set([
  'GRINGA', 'ETIQUETA UNICA', 'ACHADOS PERDIDOS', 'BRILHO VINTAGE',
  'LOHANA COELHO', 'LOUCA POR JOIAS', 'LUCIMARY', 'HELTON', 'EDUARDO',
  'THAIS', 'AGOSTO', 'AUGUSTO', 'PAMELA FERRARI', 'CADASTRO PENDENTE',
  'RETORNO SCRAP', 'EMERSON TIJUCA',
]);

function normalizeStr(s: string): string {
  return s.toUpperCase().trim()
    .replace(/[ÁÀÂÃ]/g, 'A').replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÍÌÎ]/g, 'I').replace(/[ÓÒÔÕ]/g, 'O')
    .replace(/[ÚÙÛ]/g, 'U').replace(/Ç/g, 'C');
}

function isDestinoExcluido(destino: string | null): boolean {
  if (!destino) return false;
  return DESTINOS_EXCL.has(normalizeStr(destino));
}

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
export function generateCsvCadastrar(pieces: LeilaoBaseRow[], startLote: number): string {
  const header = 'item;peca;lote;dia;preco_contratado;descricao;segunda_descricao';
  const rows = pieces.map((p, i) => {
    const lote     = startLote + i;
    const full     = sanitize(p.descricao_jewel ?? '');
    const peca     = full.slice(0, PECA_MAX);          // máx 100 chars — limite do robô
    const descFull = `${full} | REF: ${p.referencia}`;
    const preco    = Math.round(p.preco_avista ?? 0);
    return row(lote, peca, lote, 1, preco, descFull, p.referencia);
  });
  return [header, ...rows].join('\n');
}

// Peça elegível para transferência: existe no sistema e destino não está na lista de exclusão.
// Comodato com destino permitido é elegível — a exclusão de comodato geral foi removida.
// Peças com destino em DESTINOS_EXCL nunca chegam ao priceMap (filtradas pela API), mas
// verificamos aqui como segunda camada de defesa.
function isEligibleForTransfer(ref: string, priceMap: Map<string, LeilaoBaseRow>): boolean {
  const piece = priceMap.get(ref.toUpperCase());
  if (!piece) return false;
  if (isDestinoExcluido(piece.destino ?? null)) return false;
  return true;
}

// Retorna contagem de refs excluídas da transferência e o motivo:
// "foraBase": não aparece na Base Sistema (vendida, sem fotos, destino exclusivo, etc.)
// "destinoExcluido": está na base mas com destino na lista de exclusão (Lohana, Gringa, etc.)
export function countExcludedFromTransfer(
  refs:     string[],
  priceMap: Map<string, LeilaoBaseRow>,
): { foraBase: number; destinoExcluido: number; total: number } {
  let foraBase = 0, destinoExcluido = 0;
  for (const ref of refs) {
    const piece = priceMap.get(ref.toUpperCase());
    if (!piece) foraBase++;
    else if (isDestinoExcluido(piece.destino ?? null)) destinoExcluido++;
  }
  return { foraBase, destinoExcluido, total: foraBase + destinoExcluido };
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
  const header = 'lote;dia;minidescricao;numeroleilao;novo_valor';
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
    } else if (isDestinoExcluido(piece.destino ?? null)) {
      rows.push(`${ref};Destino Exclusivo;${piece.status_id === 6 ? 'Em Comodato' : 'Sem Venda'};${sanitize(piece.destino ?? '')};`);
    }
  }
  return [header, ...rows].join('\n');
}

// Gera CSV para "Upload Imagens"
// mini_descricao
export function generateCsvUploadImagens(refs: string[]): string {
  return ['mini_descricao', ...refs].join('\n');
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
