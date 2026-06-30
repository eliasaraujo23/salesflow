'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

interface FlowEdgeData {
  label?: string;
  onLabelChange?: (id: string, label: string) => void;
}

export function FlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const d = (data ?? {}) as FlowEdgeData;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(d.label ?? ''); }, [d.label]);
  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  function commit() {
    setEditing(false);
    d.onLabelChange?.(id, draft.trim());
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: '#6366f1', strokeWidth: 2 }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            position: 'absolute',
            pointerEvents: 'all',
          }}
          className="nopan"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                if (e.key === 'Escape') { setDraft(d.label ?? ''); setEditing(false); }
              }}
              className="nodrag px-2 py-0.5 text-[11px] font-semibold rounded border border-indigo-400 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none w-28 text-center shadow-sm"
              placeholder="Ex: Sim, Não..."
            />
          ) : d.label ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 cursor-pointer select-none shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              {d.label}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] text-transparent hover:text-zinc-400 dark:hover:text-zinc-500 select-none cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border hover:border-dashed hover:border-zinc-300 dark:hover:border-zinc-600">
              + rótulo
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
