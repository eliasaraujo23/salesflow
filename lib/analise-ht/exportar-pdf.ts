import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtKg = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface LinhaValoresPdf {
  linhasElegiveis: number;
  pesoTotal: number;
  valorGasto: number;
  valorVenda: number;
  lucro: number;
  comissao: number;
  premiacao: number;
  bonusPrimeiroPreco: number;
  metaLoja: number;
  gratificacao: number;
  total: number;
}

export interface LinhaAvaliadorPdf extends LinhaValoresPdf {
  avaliador: string;
  porLoja: (LinhaValoresPdf & { loja: string })[];
}

const COLUNAS = [
  'Avaliador', 'Loja', 'Compras', 'Peso', 'Valor Gasto', 'Valor de Venda', 'Lucro',
  'Bonificação', 'Premiação', 'Bônus 1º Preço', 'Comissão', 'Gratificação', 'Total',
];

// Exporta a tabela de Bonificação e Premiação em PDF com todas as linhas de
// detalhe por loja já expandidas (ignora o estado de expansão da tela) —
// ver conversa com Elias 2026-09-04.
export function exportarBonificacaoPdf(linhas: LinhaAvaliadorPdf[], totalGeral: number, mostrarColunaLoja: boolean) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.text('Bonificação e Premiação por avaliador', 40, 40);
  doc.setFontSize(10);
  doc.text(`Total geral: ${fmtBRL(totalGeral)}`, 40, 58);

  const body: (string | number)[][] = [];

  for (const r of linhas) {
    const lojasTexto = r.porLoja.map(l => l.loja).join(', ');
    body.push([
      r.avaliador,
      mostrarColunaLoja ? lojasTexto : '',
      r.linhasElegiveis,
      fmtKg(r.pesoTotal),
      fmtBRL(r.valorGasto),
      fmtBRL(r.valorVenda),
      fmtBRL(r.lucro),
      fmtBRL(r.comissao),
      fmtBRL(r.premiacao),
      fmtBRL(r.bonusPrimeiroPreco),
      fmtBRL(r.metaLoja),
      fmtBRL(r.gratificacao),
      fmtBRL(r.total),
    ]);

    if (mostrarColunaLoja && r.porLoja.length > 1) {
      for (const linha of r.porLoja) {
        body.push([
          `  - ${r.avaliador}`,
          linha.loja,
          linha.linhasElegiveis,
          fmtKg(linha.pesoTotal),
          fmtBRL(linha.valorGasto),
          fmtBRL(linha.valorVenda),
          fmtBRL(linha.lucro),
          fmtBRL(linha.comissao),
          fmtBRL(linha.premiacao),
          fmtBRL(linha.bonusPrimeiroPreco),
          fmtBRL(linha.metaLoja),
          fmtBRL(linha.gratificacao),
          fmtBRL(linha.total),
        ]);
      }
    }
  }

  autoTable(doc, {
    head: [COLUNAS],
    body,
    startY: 72,
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      0: { cellWidth: 90 },
    },
    didParseCell: data => {
      // Linhas de detalhe (avaliador prefixado com "↳") ficam em itálico,
      // mais claras e com fonte igual à linha-mãe (autoTable não deveria
      // aumentar a fonte sozinho, mas o cellWidth fixo evita o corte de
      // texto que estava acontecendo antes).
      const avaliadorCel = (data.row.raw as (string | number)[] | undefined)?.[0];
      if (typeof avaliadorCel === 'string' && avaliadorCel.trim().startsWith('-')) {
        data.cell.styles.textColor = [120, 120, 120];
        data.cell.styles.fontSize = 7;
      }
    },
  });

  doc.save(`bonificacao-premiacao-${new Date().toISOString().slice(0, 10)}.pdf`);
}
