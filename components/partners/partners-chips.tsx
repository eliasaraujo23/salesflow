'use client';

import React from 'react';

interface PartnersChipsProps {
  partners: string[];
  active: string | null;
  onSelect: (partner: string | null) => void;
}

export function PartnersChips({ partners, active, onSelect }: PartnersChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ChipButton label="Todos" isActive={active === null} onClick={() => onSelect(null)} />
      {partners.map(p => (
        <ChipButton key={p} label={p} isActive={active === p} onClick={() => onSelect(p)} />
      ))}
    </div>
  );
}

interface ChipButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ChipButton({ label, isActive, onClick }: ChipButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
        isActive
          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.13] hover:border-indigo-400 hover:text-indigo-500'
      }`}
    >
      {label}
    </button>
  );
}
