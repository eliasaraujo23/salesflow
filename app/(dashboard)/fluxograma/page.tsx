'use client';

import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  BackgroundVariant, ConnectionMode, type NodeTypes, type EdgeTypes, type Node,
} from '@xyflow/react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useFluxograma, type FlowNodeType } from '@/hooks/use-fluxograma';
import { FlowNode } from '@/components/fluxograma/flow-node';
import { FlowEdge } from '@/components/fluxograma/flow-edge';
import { NodeDetailPanel, type NodeDetailValues } from '@/components/fluxograma/node-detail-panel';
const NODE_TYPES_CONFIG: { type: FlowNodeType; label: string; color: string; desc: string }[] = [
  { type: 'terminal', label: 'Início / Fim', color: 'bg-green-800 border-green-500 text-green-100',  desc: 'Ponto de partida ou chegada' },
  { type: 'process',  label: 'Etapa',        color: 'bg-blue-800  border-blue-500  text-blue-100',   desc: 'Passo ou ação do processo' },
  { type: 'decision', label: 'Decisão',       color: 'bg-amber-800 border-amber-500 text-amber-100', desc: 'Bifurcação / condição' },
];

export default function FluxogramaPage() {
  const {
    nodes, edges, saving, loaded,
    onNodesChange, onEdgesChange, onConnect,
    addNode, updateNodeData, updateEdgeLabel, clearAll,
  } = useFluxograma();

  // ── Theme detection ──────────────────────────────────────────────
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const update = () => setColorMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Selected node (detail panel) ─────────────────────────────────
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Sync panel with latest node data when nodes change
  useEffect(() => {
    if (!selectedNode) return;
    const updated = nodes.find(n => n.id === selectedNode.id);
    if (updated) setSelectedNode(updated);
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inject edge label callback ────────────────────────────────────
  const edgesWithCallback = useMemo(
    () => edges.map(e => ({ ...e, data: { ...(e.data ?? {}), onLabelChange: updateEdgeLabel } })),
    [edges, updateEdgeLabel],
  );

  // ── ReactFlow type maps ───────────────────────────────────────────
  const nodeTypes: NodeTypes = useMemo(() => ({ flowNode: FlowNode }), []);
  const edgeTypes: EdgeTypes = useMemo(() => ({ flowEdge: FlowEdge }), []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (confirm('Limpar todo o fluxograma? Essa ação não pode ser desfeita.')) {
      clearAll();
      setSelectedNode(null);
    }
  }, [nodes.length, clearAll]);

const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSaveNodeDetail = useCallback((id: string, data: NodeDetailValues) => {
    updateNodeData(id, data);
  }, [updateNodeData]);

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
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/[0.08]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mr-1">Adicionar</span>

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
          <Save size={12} className={saving ? 'animate-pulse text-indigo-400' : 'text-zinc-400 dark:text-zinc-600'} />
          {saving ? 'Salvando...' : 'Salvo'}
        </div>

        <button
          onClick={handleClear}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-30 transition-colors"
        >
          <Trash2 size={12} />
          Limpar
        </button>
      </div>

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-5 px-4 py-1.5 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-white/[0.04]">
        {NODE_TYPES_CONFIG.map(({ type, label, desc }) => (
          <span key={type} className="text-[10px] text-zinc-400 dark:text-zinc-500">
            <span className="font-bold text-zinc-600 dark:text-zinc-400">{label}</span> — {desc}
            {' · '}
          </span>
        ))}
        <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
          Clique no nó para editar · Duplo clique na seta para adicionar rótulo
        </span>
      </div>

      {/* ── Canvas + Panel ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edgesWithCallback}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            deleteKeyCode="Delete"
            colorMode={colorMode}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{
              type: 'flowEdge',
              markerEnd: { type: 'arrowclosed' as never, color: '#6366f1' },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color={colorMode === 'dark' ? '#ffffff10' : '#00000012'}
            />
            <Controls className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-700 !shadow-sm" />
            <MiniMap
              className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-700"
              nodeColor={(n) => {
                const t = (n.data as { nodeType?: string })?.nodeType;
                return t === 'terminal' ? '#16a34a' : t === 'decision' ? '#d97706' : '#2563eb';
              }}
            />
          </ReactFlow>
        </div>

        {/* Detail Panel — slides in from right, no overlay */}
        <div
          className={`shrink-0 overflow-hidden border-l border-zinc-200 dark:border-white/[0.08] transition-all duration-200 ease-in-out ${
            selectedNode ? 'w-72' : 'w-0'
          }`}
        >
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onSave={handleSaveNodeDetail}
          />
        </div>
      </div>
    </div>
  );
}
