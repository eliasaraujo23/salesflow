import type { LeilaoBaseRow } from '@/lib/hooks/use-leilao-base';

const PECA_MAX = 100;

// Usa ponto-e-vírgula como separador para evitar conflito com vírgulas nas descrições
function row(...fields: (string | number)[]): string {
  return fields.map(f => String(f ?? '')).join(';');
}

// Gera CSV para "Cadastrar Peças"
// item;peca;lote;dia;preco_contratado;descricao;segunda_descricao
export function generateCsvCadastrar(pieces: LeilaoBaseRow[], startLote: number): string {
  const header = 'item;peca;lote;dia;preco_contratado;descricao;segunda_descricao';
  const rows = pieces.map((p, i) => {
    const lote     = startLote + i;
    const full     = p.descricao_jewel ?? '';
    const peca     = full.length > PECA_MAX ? full.slice(0, PECA_MAX) : full;
    const descFull = `${full} | REF: ${p.referencia}`;
    const preco    = Math.round(p.preco_avista ?? 0);
    return row(lote, peca, lote, 1, preco, descFull, p.referencia);
  });
  return [header, ...rows].join('\n');
}

// Gera CSV para "Transferir Leilão" (sem atualizar preço)
// lote,dia,mini_descricao,numero_leilao
export function generateCsvTransferir(refs: string[], novoLeilao: string): string {
  const header = 'lote,dia,mini_descricao,numero_leilao';
  const rows = refs.map(ref => `,,${ref},${novoLeilao}`);
  return [header, ...rows].join('\n');
}

// Gera CSV para "Transferir c/ Valor" (atualiza preço na transferência)
// lote,dia,minidescricao,numeroleilao,novo_valor
export function generateCsvTransferirComValor(
  refs:        string[],
  priceMap:    Map<string, LeilaoBaseRow>,
  novoLeilao:  string,
): string {
  const header = 'lote,dia,minidescricao,numeroleilao,novo_valor';
  const rows = refs.map(ref => {
    const preco = Math.round(priceMap.get(ref.toUpperCase())?.preco_avista ?? 0);
    return `,,${ref},${novoLeilao},${preco}`;
  });
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
  const header = 'mini_descricao,novo_valor';
  const rows = refs.map(ref => {
    const preco = Math.round(priceMap.get(ref.toUpperCase())?.preco_avista ?? 0);
    return `${ref},${preco}`;
  });
  return [header, ...rows].join('\n');
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
