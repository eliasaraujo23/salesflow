// Central color tokens — single source of truth for the entire app.
// Every entity must have a unique color. Do not reuse these values for other purposes.

export const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1',  // indigo
  JM: '#a855f7',  // violet
  JR: '#10b981',  // emerald
  JC: '#ef4444',  // red   — was #f59e0b (amber = Scrap). Changed to avoid collision.
};

export const CANAL_COLORS: Record<string, string> = {
  Eternno:         '#3b82f6',  // blue
  Parceiros:       '#f97316',  // orange
  'Leilão':        '#14b8a6',  // teal   — was #a855f7 (violet = JM). Changed.
  'Mercado Livre': '#eab308',  // yellow — was #F5A623 (amber ≈ Scrap/JC). Changed.
};

// B2B / B2C segment colors — distinct from Tipo and Canal.
// Tailwind class sets for use in components that can't use arbitrary hex.
export const SEGMENT_CLASSES = {
  B2B: { bar: 'bg-sky-500',   text: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-500/10'   },
  B2C: { bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
} as const;

// Hex equivalents for charts that require a plain color string.
export const SEGMENT_HEX = {
  B2B: '#0ea5e9',  // sky-500   — was #6366f1 (indigo = JF). Changed.
  B2C: '#22c55e',  // green-500 — was #10b981 (emerald = JR). Changed.
} as const;

// Scrap brand color — reserved for Scrap section headers only.
export const SCRAP_COLOR = '#f59e0b' as const;

// Lojas (Joias/Mês page only — acceptable overlap with Tipo since never on same screen)
export const LOJA_COLORS: Record<string, string> = {
  Tijuca:  '#6366f1',
  Ipanema: '#10b981',
  Méier:   '#f59e0b',
  Eternno: '#3b82f6',
  Eduardo: '#a855f7',
  'Thaís': '#ec4899',
  Outro:   '#71717a',
};
