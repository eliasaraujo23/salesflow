'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
  addEdge, applyNodeChanges, applyEdgeChanges,
} from '@xyflow/react';
import { toast } from 'sonner';

export type FlowNodeType = 'process' | 'decision' | 'terminal';

export interface FlowNodeData {
  label: string;
  nodeType: FlowNodeType;
  description?: string;
  responsavel?: string;
  color?: string;
}

interface PendingSave { nodes: Node[]; edges: Edge[] }

export function useFluxograma() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef   = useRef<PendingSave | null>(null);
  const loadedRef    = useRef(false);

  useEffect(() => { loadedRef.current = loaded; }, [loaded]);

  // Carrega da API — migra edges antigas para o tipo customizado
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/fluxograma', { cache: 'no-store' });
        if (!res.ok) { if (!cancelled) setLoaded(true); return; }
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        setNodes(body.data?.nodes ?? []);
        setEdges((body.data?.edges ?? []).map((e: Edge) => ({ ...e, type: 'flowEdge' })));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scheduleSave = useCallback((n: Node[], e: Edge[]) => {
    if (!loadedRef.current) return;
    pendingRef.current = { nodes: n, edges: e };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!pendingRef.current) return;
      const { nodes: ns, edges: es } = pendingRef.current;
      setSaving(true);
      try {
        // JSON round-trip strips undefined fields before sending
        const payload = JSON.parse(JSON.stringify({ nodes: ns, edges: es }));
        const res = await fetch('/api/fluxograma', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('save failed');
      } catch {
        toast.error('Erro ao salvar fluxograma');
      } finally {
        setSaving(false);
      }
    }, 1200);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(prev => {
      const next = applyNodeChanges(changes, prev);
      setEdges(e => { scheduleSave(next, e); return e; });
      return next;
    });
  }, [scheduleSave]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(prev => {
      const next = applyEdgeChanges(changes, prev);
      setNodes(n => { scheduleSave(n, next); return n; });
      return next;
    });
  }, [scheduleSave]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(prev => {
      const next = addEdge({ ...connection, type: 'flowEdge' }, prev);
      setNodes(n => { scheduleSave(n, next); return n; });
      return next;
    });
  }, [scheduleSave]);

  const addNode = useCallback((type: FlowNodeType) => {
    const id = `node-${Date.now()}`;
    const labels: Record<FlowNodeType, string> = {
      terminal: 'Início / Fim',
      decision: 'Decisão',
      process:  'Nova etapa',
    };
    const newNode: Node = {
      id,
      type: 'flowNode',
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 150 },
      data: { label: labels[type], nodeType: type } satisfies FlowNodeData,
    };
    setNodes(prev => {
      const next = [...prev, newNode];
      setEdges(e => { scheduleSave(next, e); return e; });
      return next;
    });
  }, [scheduleSave]);

  const updateNodeData = useCallback((id: string, updates: Partial<FlowNodeData>) => {
    setNodes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n);
      setEdges(e => { scheduleSave(next, e); return e; });
      return next;
    });
  }, [scheduleSave]);

  const updateEdgeLabel = useCallback((id: string, label: string) => {
    setEdges(prev => {
      const next = prev.map(e =>
        e.id === id ? { ...e, data: { ...(e.data ?? {}), label } } : e
      );
      setNodes(n => { scheduleSave(n, next); return n; });
      return next;
    });
  }, [scheduleSave]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    scheduleSave([], []);
  }, [scheduleSave]);

  const loadFluxo = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    const ns = newNodes;
    const es = newEdges.map(e => ({ ...e, type: 'flowEdge' }));
    setNodes(ns);
    setEdges(es);
    scheduleSave(ns, es);
  }, [scheduleSave]);

  return {
    nodes, edges, saving, loaded,
    onNodesChange, onEdgesChange, onConnect,
    addNode, updateNodeData, updateEdgeLabel, clearAll, loadFluxo,
  };
}
