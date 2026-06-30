'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { type FlowNodeData } from '@/hooks/use-fluxograma';

export function FlowNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData;

  const handleStyle = 'w-2.5 h-2.5 !bg-zinc-500 !border-zinc-400 hover:!bg-indigo-500 transition-colors';

  const InfoBadge = d.responsavel ? (
    <span className="text-[9px] leading-none opacity-70 mt-0.5 truncate max-w-[110px]">
      {d.responsavel}
    </span>
  ) : null;

  const DescDot = d.description ? (
    <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-70" />
  ) : null;

  if (d.nodeType === 'decision') {
    return (
      <div className="relative" style={{ width: 130, height: 130 }}>
        <Handle type="source" position={Position.Top}    id="t" className={handleStyle} style={{ top: 2 }} />
        <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} style={{ bottom: 2 }} />
        <Handle type="source" position={Position.Left}   id="l" className={handleStyle} style={{ left: 2 }} />
        <Handle type="source" position={Position.Right}  id="r" className={handleStyle} style={{ right: 2 }} />

        <div
          className={`absolute inset-0 transition-colors ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent' : ''}`}
          style={{
            transform: 'rotate(45deg)',
            background: selected ? '#854d0e' : '#92400e',
            border: '2px solid #d97706',
            borderRadius: 6,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          {DescDot}
          <span className="text-[11px] font-semibold text-amber-100 text-center leading-tight select-none pointer-events-none">
            {d.label}
          </span>
          {d.responsavel && (
            <span className="text-[9px] text-amber-200/60 leading-none mt-0.5 text-center truncate max-w-[90px] select-none pointer-events-none">
              {d.responsavel}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (d.nodeType === 'terminal') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center px-5 py-2.5 min-w-[120px] cursor-pointer transition-all ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent' : ''}`}
        style={{
          borderRadius: 999,
          background: selected ? '#14532d' : '#166534',
          border: '2px solid #22c55e',
          minHeight: 44,
        }}
      >
        {DescDot}
        <Handle type="source" position={Position.Top}    id="t" className={handleStyle} />
        <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} />
        <Handle type="source" position={Position.Left}   id="l" className={handleStyle} />
        <Handle type="source" position={Position.Right}  id="r" className={handleStyle} />

        <span className="text-xs font-bold text-green-100 text-center leading-tight select-none pointer-events-none whitespace-nowrap">
          {d.label}
        </span>
        {InfoBadge && (
          <span className="text-[9px] text-green-200/60 leading-none mt-0.5 select-none pointer-events-none whitespace-nowrap">
            {d.responsavel}
          </span>
        )}
      </div>
    );
  }

  // Default: process
  return (
    <div
      className={`relative flex flex-col items-center justify-center px-4 py-3 min-w-[140px] cursor-pointer transition-all ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-transparent' : ''}`}
      style={{
        borderRadius: 8,
        background: selected ? '#1e3a5f' : '#1e40af',
        border: '2px solid #3b82f6',
        minHeight: 48,
      }}
    >
      {DescDot}
      <Handle type="source" position={Position.Top}    id="t" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" className={handleStyle} />
      <Handle type="source" position={Position.Left}   id="l" className={handleStyle} />
      <Handle type="source" position={Position.Right}  id="r" className={handleStyle} />

      <span className="text-xs font-semibold text-blue-50 text-center leading-tight select-none pointer-events-none">
        {d.label}
      </span>
      {InfoBadge && (
        <span className="text-[9px] text-blue-200/60 leading-none mt-0.5 select-none pointer-events-none">
          {d.responsavel}
        </span>
      )}
    </div>
  );
}
