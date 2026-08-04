'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, LabelList,
} from 'recharts';

function fmtYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

interface ChartRow { mesLabel: string; quantidade: number; }
interface CustomLabelProps { x?: number; y?: number; width?: number; value?: number; index?: number; }

function makeDataLabel(activeRef: React.RefObject<number | null>) {
  return function DataLabel({ x = 0, y = 0, width = 0, value = 0, index }: CustomLabelProps) {
    if (index != null && index === activeRef.current) return null;
    const text = value.toLocaleString('pt-BR');
    const W = Math.max(text.length * 6.5 + 16, 50);
    const H = 22;
    const cx = x + width / 2;
    return (
      <g>
        <rect x={cx - W / 2} y={y - H - 6} width={W} height={H} rx={5} fill="#3f3f46" />
        <text
          x={cx} y={y - H / 2 - 6 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill="#ffffff" fontSize={10} fontWeight={600}
        >
          {text}
        </text>
      </g>
    );
  };
}

const TOOLTIP = (
  <Tooltip
    formatter={(v) => [Number(v ?? 0).toLocaleString('pt-BR'), 'Peças']}
    labelStyle={{ color: '#a1a1aa', fontSize: 12 }}
    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
  />
);
const XAXIS = <XAxis dataKey="mesLabel" tick={{ fontSize: 12, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />;
const YAXIS = <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={40} />;
const GRID  = <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />;

interface Props {
  data: ChartRow[];
  chartType: 'area' | 'line' | 'bar';
  showLabels: boolean;
}

export function QuantidadeAreaChart({ data, chartType, showLabels }: Props) {
  const chartData = useMemo(() => data.map(r => ({ ...r })), [data]);
  const margin = { top: 40, right: 50, left: 8, bottom: 0 };
  const activeRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const DataLabel = useMemo(() => makeDataLabel(activeRef), []);

  function handleMouseMove(state: Record<string, unknown>) {
    const idx = typeof state?.activeTooltipIndex === 'number' ? (state.activeTooltipIndex as number) : null;
    if (activeRef.current !== idx) {
      activeRef.current = idx;
      forceRender(n => n + 1);
    }
  }
  function handleMouseLeave() {
    if (activeRef.current !== null) {
      activeRef.current = null;
      forceRender(n => n + 1);
    }
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin} onMouseMove={handleMouseMove as never} onMouseLeave={handleMouseLeave}>
          {GRID}{XAXIS}{YAXIS}{TOOLTIP}
          <Bar dataKey="quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]}>
            {showLabels && <LabelList dataKey="quantidade" content={DataLabel as never} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margin} onMouseMove={handleMouseMove as never} onMouseLeave={handleMouseLeave}>
          {GRID}{XAXIS}{YAXIS}{TOOLTIP}
          <Line type="monotone" dataKey="quantidade" stroke="#f59e0b" strokeWidth={2}
            dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }}>
            {showLabels && <LabelList dataKey="quantidade" content={DataLabel as never} />}
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={margin} onMouseMove={handleMouseMove as never} onMouseLeave={handleMouseLeave}>
        <defs>
          <linearGradient id="qtdGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {GRID}{XAXIS}{YAXIS}{TOOLTIP}
        <Area type="monotone" dataKey="quantidade" stroke="#f59e0b" strokeWidth={2}
          fill="url(#qtdGradient)"
          dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }}>
          {showLabels && <LabelList dataKey="quantidade" content={DataLabel as never} />}
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
