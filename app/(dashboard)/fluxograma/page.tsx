'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  BackgroundVariant, type NodeTypes,
} from '@xyflow/react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useFluxograma, type FlowNodeType } from '@/hooks/use-fluxograma';
import { FlowNode } from '@/components/fluxograma/flow-node';

const NODE_TYPES_CONFIG: { type: FlowNodeType; label: string; color: string; desc: string }[] = [
  { type: 'terminal', label: 'Início / Fim', color: 'bg-green-800 border-green-500 text-green-100',  desc: 'Ponto de partida ou chegada' },
  { type: 'process',  label: 'Etapa',        color: 'bg-blue-800  border-blue-500  text-blue-100',   desc: 'Passo ou ação do processo' },
  { type: 'decision', label: 'Decisão',       color: 'bg-amber-800 border-amber-500 text-amber-100', desc: 'Bifurcação / condição' },
];

export default function FluxogramaPage() {
  const {
    nodes, edges, saving, loaded,
    onNodesChange, onEdgesChange, onConnect,
    addNode, updateNodeLabel, clearAll,
  } = useFluxograma();

  // Injeta o callback de edição nos dados de cada nó
  const nodesWithCallback = useMemo(
    () => nodes.map(n => ({ ...n, data: { ...n.data, onLabelChange: updateNodeLabel } })),
    [nodes, updateNodeLabel],
  );

  const nodeTypes: NodeTypes = useMemo(() => ({ flowNode: FlowNode }), []);

  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (confirm('Limpar todo o fluxograma? Essa ação não pode ser desfeita.')) clearAll();
  }, [nodes.length, clearAll]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 text-sm gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
        Carregando fluxograma...
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border-b border-white/[0.08]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1">Adicionar</span>

        {NODE_TYPES_CONFIG.map(({ type, label, color }) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-opacity hover:opacity-90 ${color}`}
          >
            <Plus size={12} />
            {label}
          </button>
        ))}

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Save size={12} className={saving ? 'animate-pulse text-indigo-400' : 'text-zinc-600'} />
          {saving ? 'Salvando...' : 'Salvo'}
        </div>

        <button
          onClick={handleClear}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800 bg-red-950 text-red-300 text-xs font-semibold hover:bg-red-900 disabled:opacity-30 transition-colors"
        >
          <Trash2 size={12} />
          Limpar
        </button>
      </div>

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-5 px-4 py-1.5 bg-zinc-950 border-b border-white/[0.04]">
        {NODE_TYPES_CONFIG.map(({ type, label, desc }) => (
          <span key={type} className="text-[10px] text-zinc-500">
            <span className="font-bold text-zinc-400">{label}</span> — {desc}
            {' · '}
          </span>
        ))}
        <span className="text-[10px] text-zinc-600">Duplo clique para editar · Arraste as bolinhas para conectar</span>
      </div>

      {/* ── Canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodesWithCallback}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          colorMode="dark"
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: 'arrowclosed' as any, color: '#6366f1' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff10" />
          <Controls className="!bg-zinc-900 !border-zinc-700 !shadow-none" />
          <MiniMap
            className="!bg-zinc-900 !border-zinc-700"
            nodeColor={(n) => {
              const t = (n.data as any)?.nodeType;
              return t === 'terminal' ? '#16a34a' : t === 'decision' ? '#d97706' : '#2563eb';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
