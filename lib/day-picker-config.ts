// Shared DayPicker v9 configuration — fonte única de verdade para todos os pickers do projeto.
// Qualquer DayPicker deve usar className="drp-calendar" + um dos presets abaixo.
// Estilos de range/seleção ficam em globals.css (.drp-calendar selectors).

type DPYBaseClasses = {
  month: string;
  month_caption: string;
  caption_label: string;
  nav: string;
  button_previous: string;
  button_next: string;
  month_grid: string;
  weekdays: string;
  weekday: string;
  weeks: string;
  week: string;
  day: string;
  day_button: string;
  selected: string;
  range_start: string;
  range_end: string;
  range_middle: string;
  today: string;
  outside: string;
  disabled: string;
  hidden: string;
};

const BASE: DPYBaseClasses = {
  month:           'space-y-2',
  month_caption:   'flex justify-center relative items-center h-8',
  caption_label:   'text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize',
  nav:             'absolute inset-x-0 top-0 flex justify-between pointer-events-none',
  button_previous: 'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
  button_next:     'pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors',
  month_grid:      'w-full border-collapse',
  weekdays:        'flex',
  weekday:         'w-9 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 text-center pb-1',
  weeks:           '',
  week:            'flex mt-1',
  day:             'rdp-day relative w-9 h-9 p-0 text-center',
  day_button:      'rdp-day_button w-full h-full flex items-center justify-center text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer',
  selected:        'rdp-selected',
  range_start:     'rdp-range_start',
  range_end:       'rdp-range_end',
  range_middle:    'rdp-range_middle',
  today:           'rdp-today',
  outside:         'opacity-30',
  disabled:        'opacity-30 cursor-not-allowed',
  hidden:          'invisible',
};

/** Preset para pickers de um único mês (SingleDatePicker, campos de formulário) */
export const DPY_SINGLE = { months: 'p-3', ...BASE };

/** Preset para pickers multi-mês (RangeDatePicker, componente Calendar) */
export const DPY_RANGE  = { months: 'flex flex-wrap gap-4 p-3', ...BASE };

// ── Utilitários de data ────────────────────────────────────────────────────────

/** Date → 'yyyy-mm-dd' */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'yyyy-mm-dd' → Date | undefined */
export function fromISO(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** 'yyyy-mm-dd' → 'dd/mm/yyyy' para exibição */
export function fmtDisplay(iso: string): string {
  const d = fromISO(iso);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** 'dd/mm/yyyy' → 'yyyy-mm-dd'. Retorna null se inválido. */
export function parseDisplayDate(txt: string): string | null {
  const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const d = fromISO(iso);
  return d && !isNaN(d.getTime()) ? iso : null;
}
