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
// NODES
// ─────────────────────────────────────────────────────────────────────────────
export const GOLDTECH_NODES: Node[] = [

  // ── LOJAS DE ORIGEM ──────────────────────────────────────────────────────
  {
    id: 'gtt', type: 'flowNode', position: { x: 60, y: 60 },
    data: { nodeType: 'terminal', label: 'Loja GTT', responsavel: 'GTT' },
  },
  {
    id: 'gti', type: 'flowNode', position: { x: 265, y: 60 },
    data: { nodeType: 'terminal', label: 'Loja GTI', responsavel: 'GTI' },
  },
  {
    id: 'k24', type: 'flowNode', position: { x: 470, y: 60 },
    data: { nodeType: 'terminal', label: 'Loja 24k', responsavel: '24k' },
  },
  {
    id: 'etn', type: 'flowNode', position: { x: 675, y: 60 },
    data: { nodeType: 'terminal', label: 'Loja ETN', responsavel: 'ETN' },
  },

  // ── COMPRA E TRIAGEM CENTRAL ─────────────────────────────────────────────
  {
    id: 'compra', type: 'flowNode', position: { x: 318, y: 220 },
    data: {
      nodeType: 'process',
      label: 'Compra e Assinatura Física',
      description: 'Loja compra os itens do cliente e realiza a assinatura do papel físico. Material é preparado para envio ao DownTown.',
    },
  },
  {
    id: 'downtown', type: 'flowNode', position: { x: 318, y: 380 },
    data: {
      nodeType: 'process',
      label: 'Chegada no DownTown',
      description: 'Material enviado pelas lojas chega ao centro de triagem para classificação.',
    },
  },
  {
    id: 'triagem', type: 'flowNode', position: { x: 253, y: 525 },
    data: { nodeType: 'decision', label: 'Tipo do Material?' },
  },

  // ── RAMO SCRAP ───────────────────────────────────────────────────────────
  {
    id: 'scrap', type: 'flowNode', position: { x: 690, y: 620 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Mateus Vaz',
      description: 'Material Scrap separado para destino de exportação.',
      responsavel: 'Mateus Vaz',
    },
  },
  {
    id: 'exportacao', type: 'flowNode', position: { x: 683, y: 780 },
    data: { nodeType: 'terminal', label: 'Exportação / Destino Final' },
  },

  // ── RAMO SECOND HAND ─────────────────────────────────────────────────────
  {
    id: 'vitor', type: 'flowNode', position: { x: 168, y: 730 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Vitor',
      description: 'Vitor recebe e avalia o material Second Hand.',
      responsavel: 'Vitor',
    },
  },
  {
    id: 'qualidade', type: 'flowNode', position: { x: 103, y: 895 },
    data: { nodeType: 'decision', label: 'Peça danificada?' },
  },

  // ── MANUTENÇÃO ───────────────────────────────────────────────────────────
  {
    id: 'manutencao', type: 'flowNode', position: { x: -120, y: 1060 },
    data: {
      nodeType: 'process',
      label: 'Caixa do Francesco',
      description: 'Peça é enviada para manutenção. Após o conserto retorna ao Vitor para nova avaliação.',
      responsavel: 'Francesco',
    },
  },

  // ── LIMPEZA E CADASTRO ───────────────────────────────────────────────────
  {
    id: 'limpeza', type: 'flowNode', position: { x: 168, y: 1070 },
    data: {
      nodeType: 'process',
      label: 'Limpeza da Peça',
      description: 'Vitor realiza a limpeza da peça aprovada.',
      responsavel: 'Vitor',
    },
  },
  {
    id: 'cadastro', type: 'flowNode', position: { x: 168, y: 1220 },
    data: {
      nodeType: 'process',
      label: 'Cadastro no Sistema',
      description: 'Vitor realiza o cadastro do item no sistema.',
      responsavel: 'Vitor',
    },
  },

  // ── FOTOGRAFIA ───────────────────────────────────────────────────────────
  {
    id: 'foto-envio', type: 'flowNode', position: { x: 168, y: 1370 },
    data: {
      nodeType: 'process',
      label: 'Envio para Fotografia',
      description: 'Joia limpa e cadastrada é enviada ao setor de Fotografia.',
    },
  },
  {
    id: 'foto-exec', type: 'flowNode', position: { x: 168, y: 1520 },
    data: {
      nodeType: 'process',
      label: 'Fotos e Vídeos',
      description: 'Setor de Fotografia produz fotos e vídeos da peça.',
      responsavel: 'Fotografia',
    },
  },

  // ── REVENDA E DISTRIBUIÇÃO ───────────────────────────────────────────────
  {
    id: 'revenda', type: 'flowNode', position: { x: 168, y: 1670 },
    data: {
      nodeType: 'process',
      label: 'Revenda — Precificação',
      description: 'Joia retorna ao setor de Revenda para ser precificada e distribuída.',
      responsavel: 'Revenda',
    },
  },
  {
    id: 'destino', type: 'flowNode', position: { x: 103, y: 1830 },
    data: { nodeType: 'decision', label: 'Destino Comercial?' },
  },
  {
    id: 'parceiros', type: 'flowNode', position: { x: -70, y: 2020 },
    data: { nodeType: 'terminal', label: 'Distribuir para Parceiros' },
  },
  {
    id: 'eternno', type: 'flowNode', position: { x: 278, y: 2020 },
    data: { nodeType: 'terminal', label: 'Enviar para Eternno' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EDGES
// ─────────────────────────────────────────────────────────────────────────────
export const GOLDTECH_EDGES: Edge[] = [

  // Lojas → Compra e Assinatura
  edge('e-gtt-compra', 'gtt',  'compra', { targetHandle: 't' }),
  edge('e-gti-compra', 'gti',  'compra', { targetHandle: 't' }),
  edge('e-24k-compra', 'k24',  'compra', { targetHandle: 't' }),
  edge('e-etn-compra', 'etn',  'compra', { targetHandle: 't' }),

  // Fluxo principal até a triagem
  edge('e-compra-downtown',  'compra',   'downtown'),
  edge('e-downtown-triagem', 'downtown', 'triagem'),

  // Triagem → Scrap (sai pela direita)
  edge('e-triagem-scrap', 'triagem', 'scrap',
    { label: 'SCRAP', sourceHandle: 'r' }),

  // Triagem → Second Hand (sai por baixo)
  edge('e-triagem-vitor', 'triagem', 'vitor',
    { label: 'SECOND HAND', sourceHandle: 'b' }),

  // Scrap branch
  edge('e-scrap-exportacao', 'scrap', 'exportacao'),

  // Second Hand: Vitor → Qualidade
  edge('e-vitor-qualidade', 'vitor', 'qualidade'),

  // Qualidade → Manutenção (sai pela esquerda)
  edge('e-qualidade-manut', 'qualidade', 'manutencao',
    { label: 'SIM', sourceHandle: 'l' }),

  // Manutenção → Vitor (retorno, sai pelo topo)
  edge('e-manut-vitor', 'manutencao', 'vitor',
    { label: 'Após conserto', sourceHandle: 't', targetHandle: 'l' }),

  // Qualidade → Limpeza (sai por baixo)
  edge('e-qualidade-limpeza', 'qualidade', 'limpeza',
    { label: 'NÃO', sourceHandle: 'b' }),

  // Fluxo de limpeza até distribuição
  edge('e-limpeza-cadastro',   'limpeza',   'cadastro'),
  edge('e-cadastro-fotoenvio', 'cadastro',  'foto-envio'),
  edge('e-fotoenvio-exec',     'foto-envio','foto-exec'),
  edge('e-exec-revenda',       'foto-exec', 'revenda'),
  edge('e-revenda-destino',    'revenda',   'destino'),

  // Destino → Parceiros (sai pela esquerda)
  edge('e-destino-parceiros', 'destino', 'parceiros',
    { label: 'Rota A', sourceHandle: 'l' }),

  // Destino → Eternno (sai pela direita)
  edge('e-destino-eternno', 'destino', 'eternno',
    { label: 'Rota B', sourceHandle: 'r' }),
];
