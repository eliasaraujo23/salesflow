'use client';

import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

interface FlowNodeData {
  label: string;
  nodeType: 'process' | 'decision' | 'terminal';
  onLabelChange?: (id: string, label: string) => void;
}

export function FlowNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(d.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(d.label); }, [d.label]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim() || d.label;
    setDraft(trimmed);
    d.onLabelChange?.(id, trimmed);
  }

  const handleStyle = 'w-2.5 h-2.5 !bg-zinc-500 !border-zinc-400 hover:!bg-indigo-500 transition-colors';

  if (d.nodeType === 'decision') {
    return (
      <div
        className="relative"
        style={{ width: 130, height: 130 }}
        onDoubleClick={() => setEditing(true)}
      >
        <Handle type="target" position={Position.Top}    id="t" className={handleStyle} style={{ top: 2 }} />
        <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} style={{ bottom: 2 }} />
        <Handle type="source" position={Position.Left}   id="l" className={handleStyle} style={{ left: 2 }} />
        <Handle type="source" position={Position.Right}  id="r" className={handleStyle} style={{ right: 2 }} />

        <div
          className={`absolute inset-0 flex items-center justify-center transition-colors
            ${selected ? 'ring-2 ring-indigo-500' : ''}
          `}
          style={{
            transform: 'rotate(45deg)',
            background: selected ? '#854d0e' : '#92400e',
            border: '2px solid #d97706',
            borderRadius: 6,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {editing ? (
            <textarea
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setDraft(d.label); setEditing(false); } }}
              className="nodrag w-full text-center text-[11px] font-semibold bg-transparent text-amber-100 resize-none outline-none leading-tight"
              rows={2}
            />
          ) : (
            <span className="text-[11px] font-semibold text-amber-100 text-center leading-tight select-none pointer-events-none">
              {d.label}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (d.nodeType === 'terminal') {
    return (
      <div
        className={`flex items-center justify-center px-5 py-2.5 min-w-[120px] cursor-pointer transition-all
          ${selected ? 'ring-2 ring-indigo-500' : ''}
        `}
        style={{
          borderRadius: 999,
          background: selected ? '#14532d' : '#166534',
          border: '2px solid #22c55e',
          minHeight: 44,
        }}
        onDoubleClick={() => setEditing(true)}
      >
        <Handle type="target" position={Position.Top}    id="t" className={handleStyle} />
        <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} />
        <Handle type="source" position={Position.Left}   id="l" className={handleStyle} />
        <Handle type="source" position={Position.Right}  id="r" className={handleStyle} />

        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setDraft(d.label); setEditing(false); } }}
            className="nodrag text-center text-xs font-bold bg-transparent text-green-100 resize-none outline-none leading-tight w-[100px]"
            rows={1}
          />
        ) : (
          <span className="text-xs font-bold text-green-100 text-center leading-tight select-none pointer-events-none whitespace-nowrap">
            {d.label}
          </span>
        )}
      </div>
    );
  }

  // Default: process
  return (
    <div
      className={`flex items-center justify-center px-4 py-3 min-w-[140px] cursor-pointer transition-all
        ${selected ? 'ring-2 ring-indigo-500' : ''}
      `}
      style={{
        borderRadius: 8,
        background: selected ? '#1e3a5f' : '#1e40af',
        border: '2px solid #3b82f6',
        minHeight: 48,
      }}
      onDoubleClick={() => setEditing(true)}
    >
      <Handle type="target" position={Position.Top}    id="t" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} />
      <Handle type="source" position={Position.Left}   id="l" className={handleStyle} />
      <Handle type="source" position={Position.Right}  id="r" className={handleStyle} />

      {editing ? (
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setDraft(d.label); setEditing(false); } }}
          className="nodrag text-center text-xs font-semibold bg-transparent text-blue-50 resize-none outline-none leading-tight w-[120px]"
          rows={2}
        />
      ) : (
        <span className="text-xs font-semibold text-blue-50 text-center leading-tight select-none pointer-events-none">
          {d.label}
        </span>
      )}
    </div>
  );
}
