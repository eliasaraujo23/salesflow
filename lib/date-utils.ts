/**
 * Converte string "YYYY-MM-DD" em Date local (sem UTC shift).
 * new Date("YYYY-MM-DD") trata como UTC midnight — errado no Brasil.
 */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Retorna a data local no formato YYYY-MM-DD, sem conversão UTC. */
export function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayLocalISO(): string {
  return localISO(new Date());
}

export function firstOfMonthLocalISO(): string {
  const d = new Date();
  d.setDate(1);
  return localISO(d);
}
