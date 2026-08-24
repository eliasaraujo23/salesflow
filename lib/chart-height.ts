// Altura padronizada (em px) para cards com HBarChart, em degraus por quantidade de itens.
// Mantém o tamanho de barra consistente entre todas as telas do Painel Mensal.
export function chartCardHeight(itemCount: number): number {
  if (itemCount <= 10) return 380;
  if (itemCount <= 20) return 600;
  return 800;
}
