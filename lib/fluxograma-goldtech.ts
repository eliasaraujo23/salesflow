import { type Node, type Edge, MarkerType } from '@xyflow/react';

const ARROW = { type: MarkerType.ArrowClosed, color: '#6366f1' };

function edge(
  id: string,
  source: string,
  target: string,
  opts?: { label?: string; sourceHandle?: string; targetHandle?: string }
): Edge {
  const e: Edge = {
    id,
    source,
    target,
    type: 'flowEdge',
    data: opts?.label ? { label: opts.label } : {},
    markerEnd: ARROW,
  };
  if (opts?.sourceHandle) e.sourceHandle = opts.sourceHandle;
  if (opts?.targetHandle) e.targetHandle = opts.targetHandle;
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT HORIZONTAL  (fluxo principal y ≈ 280, SCRAP abaixo y ≈ 510,
//                     Manutenção e Parceiros acima y ≈ 60)
// ─────────────────────────────────────────────────────────────────────────────

export const GOLDTECH_NODES: Node[] = [

  // ── LOJAS DE ORIGEM (coluna esquerda, em leque) ──────────────────────────
  {
    id: 'gtt', type: 'flowNode', position: { x: 60, y: 120 },
    data: { nodeType: 'terminal', label: 'Loja GTT', responsavel: 'GTT' },
  },
  {
    id: 'gti', type: 'flowNode', position: { x: 60, y: 240 },
    data: { nodeType: 'terminal', label: 'Loja GTI', responsavel: 'GTI' },
  },
  {
    id: 'k24', type: 'flowNode', position: { x: 60, y: 360 },
    data: { nodeType: 'terminal', label: 'Loja 24k', responsavel: '24k' },
  },
  {
    id: 'etn', type: 'flowNode', position: { x: 60, y: 480 },
    data: { nodeType: 'terminal', label: 'Loja ETN', responsavel: 'ETN' },
  },

  // ── FLUXO PRINCIPAL (y=256, centro ≈ 280) ────────────────────────────────
  {
    id: 'compra', type: 'flowNode', position: { x: 280, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Compra e Assinatura Física',
      description: 'Loja compra os itens do cliente e realiza a assinatura do papel físico. Material é preparado para envio ao DownTown.',
    },
  },
  {
    id: 'downtown', type: 'flowNode', position: { x: 490, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Chegada no DownTown',
      description: 'Material enviado pelas lojas chega ao centro de triagem para classificação.',
    },
  },
  // decision 130×130 → center (685+65, 215+65) = (750, 280)
  {
    id: 'triagem', type: 'flowNode', position: { x: 685, y: 215 },
    data: { nodeType: 'decision', label: 'Tipo do Material?' },
  },

  // ── RAMO SCRAP (abaixo da linha principal, y ≈ 510) ──────────────────────
  {
    id: 'scrap', type: 'flowNode', position: { x: 685, y: 510 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Mateus Vaz',
      description: 'Material Scrap separado para destino de exportação.',
      responsavel: 'Mateus Vaz',
    },
  },
  {
    id: 'exportacao', type: 'flowNode', position: { x: 900, y: 504 },
    data: { nodeType: 'terminal', label: 'Exportação / Destino Final' },
  },

  // ── RAMO SECOND HAND (continua na linha principal) ───────────────────────
  {
    id: 'vitor', type: 'flowNode', position: { x: 880, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Vitor',
      description: 'Vitor recebe e avalia o material Second Hand.',
      responsavel: 'Vitor',
    },
  },
  // decision 130×130 → center (1075+65, 215+65) = (1140, 280)
  {
    id: 'qualidade', type: 'flowNode', position: { x: 1075, y: 215 },
    data: { nodeType: 'decision', label: 'Peça danificada?' },
  },

  // ── MANUTENÇÃO (acima da linha principal, y = 60) ─────────────────────────
  {
    id: 'manutencao', type: 'flowNode', position: { x: 1075, y: 60 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Francesco',
      description: 'Peça é enviada para manutenção. Após o conserto retorna ao Vitor para nova avaliação.',
      responsavel: 'Francesco',
    },
  },

  // ── LIMPEZA E CADASTRO ───────────────────────────────────────────────────
  {
    id: 'limpeza', type: 'flowNode', position: { x: 1270, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Limpeza da Peça',
      description: 'Vitor realiza a limpeza da peça aprovada.',
      responsavel: 'Vitor',
    },
  },
  {
    id: 'cadastro', type: 'flowNode', position: { x: 1470, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Cadastro no Sistema',
      description: 'Vitor realiza o cadastro do item no sistema.',
      responsavel: 'Vitor',
    },
  },

  // ── FOTOGRAFIA ───────────────────────────────────────────────────────────
  {
    id: 'foto-envio', type: 'flowNode', position: { x: 1670, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Envio para Fotografia',
      description: 'Joia limpa e cadastrada é enviada ao setor de Fotografia.',
    },
  },
  {
    id: 'foto-exec', type: 'flowNode', position: { x: 1870, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Fotos e Vídeos',
      description: 'Setor de Fotografia produz fotos e vídeos da peça.',
      responsavel: 'Fotografia',
    },
  },

  // ── REVENDA E DISTRIBUIÇÃO ───────────────────────────────────────────────
  {
    id: 'revenda', type: 'flowNode', position: { x: 2070, y: 256 },
    data: {
      nodeType: 'process',
      label: 'Revenda — Precificação',
      description: 'Joia retorna ao setor de Revenda para ser precificada e distribuída.',
      responsavel: 'Revenda',
    },
  },
  // decision 130×130 → center (2265+65, 215+65) = (2330, 280)
  {
    id: 'destino', type: 'flowNode', position: { x: 2265, y: 215 },
    data: { nodeType: 'decision', label: 'Destino Comercial?' },
  },
  {
    id: 'parceiros', type: 'flowNode', position: { x: 2465, y: 60 },
    data: { nodeType: 'terminal', label: 'Distribuir para Parceiros' },
  },
  {
    id: 'eternno', type: 'flowNode', position: { x: 2465, y: 490 },
    data: { nodeType: 'terminal', label: 'Enviar para Eternno' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGES
// ─────────────────────────────────────────────────────────────────────────────
export const GOLDTECH_EDGES: Edge[] = [

  // Lojas → Compra (entram pela esquerda do nó Compra)
  edge('e-gtt-compra', 'gtt', 'compra', { targetHandle: 'l' }),
  edge('e-gti-compra', 'gti', 'compra', { targetHandle: 'l' }),
  edge('e-24k-compra', 'k24', 'compra', { targetHandle: 'l' }),
  edge('e-etn-compra', 'etn', 'compra', { targetHandle: 'l' }),

  // Fluxo principal até a triagem
  edge('e-compra-downtown',  'compra',   'downtown'),
  edge('e-downtown-triagem', 'downtown', 'triagem'),

  // Triagem → SCRAP (sai pela base, vai para baixo)
  edge('e-triagem-scrap', 'triagem', 'scrap',
    { label: 'SCRAP', sourceHandle: 'b' }),

  // Triagem → Second Hand (sai pela direita, continua horizontal)
  edge('e-triagem-vitor', 'triagem', 'vitor',
    { label: 'SECOND HAND', sourceHandle: 'r' }),

  // SCRAP branch (segue para a direita)
  edge('e-scrap-exportacao', 'scrap', 'exportacao'),

  // Second Hand: Vitor → Qualidade
  edge('e-vitor-qualidade', 'vitor', 'qualidade'),

  // Qualidade → Manutenção (sai pelo topo, vai para cima)
  edge('e-qualidade-manut', 'qualidade', 'manutencao',
    { label: 'SIM', sourceHandle: 't' }),

  // Manutenção → Vitor (sai pela esquerda, retorna para o Vitor)
  edge('e-manut-vitor', 'manutencao', 'vitor',
    { label: 'Após conserto', sourceHandle: 'l', targetHandle: 't' }),

  // Qualidade → Limpeza (sai pela direita, continua horizontal)
  edge('e-qualidade-limpeza', 'qualidade', 'limpeza',
    { label: 'NÃO', sourceHandle: 'r' }),

  // Fluxo Second Hand até distribuição
  edge('e-limpeza-cadastro',   'limpeza',    'cadastro'),
  edge('e-cadastro-fotoenvio', 'cadastro',   'foto-envio'),
  edge('e-fotoenvio-exec',     'foto-envio', 'foto-exec'),
  edge('e-exec-revenda',       'foto-exec',  'revenda'),
  edge('e-revenda-destino',    'revenda',    'destino'),

  // Destino → Parceiros (sai pelo topo, Rota A)
  edge('e-destino-parceiros', 'destino', 'parceiros',
    { label: 'Rota A', sourceHandle: 't' }),

  // Destino → Eternno (sai pela base, Rota B)
  edge('e-destino-eternno', 'destino', 'eternno',
    { label: 'Rota B', sourceHandle: 'b' }),
];
