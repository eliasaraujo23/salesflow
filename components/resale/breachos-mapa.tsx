'use client';

import React, { useState, useRef } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Plus, Minus } from 'lucide-react';

const GEO_URL = '/brazil-states.json';

export interface Brecho {
  nome: string;
  estado: string;
  uf: string;
}

const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-70.81, -9.02],  AL: [-36.62, -9.66],  AM: [-64.66, -3.47],
  AP: [-51.07, 0.90],   BA: [-41.73, -12.97],  CE: [-39.32, -5.50],
  DF: [-47.93, -15.78], ES: [-40.34, -19.57],  GO: [-49.63, -15.83],
  MA: [-45.29, -5.42],  MG: [-44.57, -18.10],  MS: [-54.53, -20.77],
  MT: [-56.10, -12.64], PA: [-52.21, -3.79],   PB: [-36.78, -7.12],
  PE: [-37.68, -8.47],  PI: [-42.80, -7.72],   PR: [-51.55, -24.89],
  RJ: [-43.17, -22.41], RN: [-36.53, -5.79],   RO: [-63.58, -10.83],
  RR: [-61.22, 2.03],   RS: [-53.08, -30.03],  SC: [-50.48, -27.25],
  SE: [-37.07, -10.57], SP: [-48.55, -22.19],  TO: [-48.33, -10.17],
};

const DEFAULT_CENTER: [number, number] = [-54, -15];
const BASE_SCALE = 680;
const ZOOM_STEP = 160;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;

interface TooltipState { x: number; y: number; uf: string; nome: string; items: Brecho[] }
interface Props { breachos: Brecho[] }

function getColor(count: number): string {
  if (count === 0) return '#27272a';
  if (count === 1) return '#4338ca';
  if (count <= 3) return '#6366f1';
  if (count <= 6) return '#818cf8';
  return '#a5b4fc';
}

export function BrechosMapa({ breachos }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [dragging, setDragging] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const byUf = breachos.reduce<Record<string, Brecho[]>>((acc, b) => {
    if (!acc[b.uf]) acc[b.uf] = [];
    acc[b.uf].push(b);
    return acc;
  }, {});
  const activeUfs = Object.keys(byUf);
  const scale = BASE_SCALE + (zoom - 1) * ZOOM_STEP;

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, cx: center[0], cy: center[1] };
    setDragging(true);
    setTooltip(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const W = mapRef.current?.clientWidth ?? 800;
    const factor = (360 / (2 * Math.PI * scale)) * (800 / W);
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setCenter([
      dragRef.current.cx - dx * factor,
      dragRef.current.cy + dy * factor,
    ]);
  }

  function handleMouseUp() {
    dragRef.current = null;
    setDragging(false);
  }

const canPan = zoom > 1;
  const cursor = canPan ? (dragging ? 'grabbing' : 'grab') : 'default';

  return (
    <div className="flex flex-col h-full">
      {/* Stats + legend */}
      <div className="flex items-center gap-6 mb-3 shrink-0">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{breachos.length}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Estados</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{activeUfs.length}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {[['#4338ca','1'],['#6366f1','2–3'],['#818cf8','4–6'],['#a5b4fc','7+']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-zinc-900 dark:bg-zinc-950 select-none"
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setTooltip(null);
        }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale, center }}
          width={800}
          height={620}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: import('react-simple-maps').GeoFeature[] }) =>
              geographies.map((geo: import('react-simple-maps').GeoFeature) => {
                const uf = String(geo.properties.sigla ?? geo.properties.UF ?? geo.properties.SIGLA ?? '');
                const nome = String(geo.properties.name ?? geo.properties.nome ?? uf);
                const count = byUf[uf]?.length ?? 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count)}
                    stroke="#09090b"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', fill: count > 0 ? '#c7d2fe' : '#3f3f46' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      if (dragging) return;
                      const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, uf, nome, items: byUf[uf] ?? [] });
                    }}
                    onMouseMove={(e: React.MouseEvent<SVGPathElement>) => {
                      if (dragging) return;
                      const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
                    }}
                    onMouseLeave={() => { if (!dragging) setTooltip(null); }}
                  />
                );
              })
            }
          </Geographies>

          {activeUfs.map(uf => {
            const coords = STATE_COORDS[uf];
            if (!coords) return null;
            const count = byUf[uf].length;
            const r = count >= 10 ? 14 : count >= 5 ? 12 : 10;
            return (
              <Marker key={uf} coordinates={coords}>
                <circle r={r} fill="#e0e7ff" fillOpacity={0.95} stroke="#6366f1" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                <text textAnchor="middle" dy=".35em"
                  style={{ fontFamily: 'sans-serif', fontSize: count >= 10 ? 9 : 10, fontWeight: 700, fill: '#312e81', pointerEvents: 'none' }}>
                  {count}
                </text>
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setZoom(z => Math.min(z + 1, ZOOM_MAX))}
            disabled={zoom >= ZOOM_MAX}
            className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded-lg border border-white/[0.1] transition-colors shadow-lg"
          >
            <Plus size={14} />
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setZoom(z => Math.max(z - 1, ZOOM_MIN))}
            disabled={zoom <= ZOOM_MIN}
            className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded-lg border border-white/[0.1] transition-colors shadow-lg"
          >
            <Minus size={14} />
          </button>
        </div>

        {/* Tooltip */}
        {tooltip && !dragging && (
          <div
            className="absolute z-10 pointer-events-none bg-zinc-900 border border-white/[0.13] rounded-lg shadow-xl px-3 py-2.5 min-w-[160px]"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {tooltip.nome} · {tooltip.uf}
            </div>
            {tooltip.items.length > 0 ? tooltip.items.map(b => (
              <div key={b.nome} className="text-xs text-zinc-200 leading-snug py-0.5 border-b border-white/[0.06] last:border-0">
                {b.nome}
              </div>
            )) : (
              <div className="text-xs text-zinc-500 italic">Nenhum brechó neste estado</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
