type CsvValue = string | number | null | undefined;

export function exportToCsv(
  filename: string,
  rows: Record<string, CsvValue>[],
  headers: { key: string; label: string }[],
) {
  const escape = (v: CsvValue): string => {
    const s = String(v ?? '').replace(/\r?\n/g, ' ');
    return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.map(h => h.label).join(';'),
    ...rows.map(r => headers.map(h => escape(r[h.key])).join(';')),
  ];

  const bom  = '﻿';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
