'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';

const SWATCHES = [
  // Greens
  '#166534', '#15803d', '#16a34a', '#4ade80',
  // Blues
  '#1e40af', '#1d4ed8', '#0369a1', '#0ea5e9',
  // Purples
  '#581c87', '#7e22ce', '#6d28d9', '#8b5cf6',
  // Reds / Pinks
  '#991b1b', '#b91c1c', '#9d174d', '#db2777',
  // Ambers / Oranges
  '#92400e', '#b45309', '#c2410c', '#ea580c',
  // Teals
  '#0f766e', '#0d9488', '#0e7490', '#0891b2',
  // Darks
  '#1f2937', '#374151',
];

interface Props {
  value: string;           // hex or empty string (= use node default)
  onChange: (color: string) => void;
  nodeDefaultColor: string;
}

export function ColorPicker({ value, onChange, nodeDefaultColor }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayColor = value || nodeDefaultColor;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
      >
        <span
          className="w-4 h-4 rounded shrink-0 border border-black/20 dark:border-white/20"
          style={{ backgroundColor: displayColor }}
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-300 flex-1 text-left font-mono">
          {value ? value.toUpperCase() : 'Padrão'}
        </span>
        <Palette size={12} className="text-zinc-400" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-zinc-900 shadow-2xl p-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Cores rápidas</p>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {SWATCHES.map(color => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => { onChange(color); setOpen(false); }}
                className={`w-full aspect-square rounded-md transition-all hover:scale-110 ${
                  value === color ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="border-t border-zinc-100 dark:border-white/[0.06] my-2" />

          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Personalizado</p>
          <input
            type="color"
            value={value || nodeDefaultColor}
            onChange={e => onChange(e.target.value)}
            className="w-full h-8 rounded-lg cursor-pointer border border-zinc-200 dark:border-white/[0.08] bg-transparent p-0.5"
          />

          {value && (
            <>
              <div className="border-t border-zinc-100 dark:border-white/[0.06] mt-3 mb-1" />
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="w-full text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 py-1 rounded hover:bg-zinc-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                ↺ Usar cor padrão
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
