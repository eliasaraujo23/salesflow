'use client';

import { useRef } from 'react';
import { Upload, X, Eye, EyeOff } from 'lucide-react';
import type { Leilao, LeilaoStatus } from '@/lib/hooks/use-leiloes';

const STATUS_BADGE: Record<Exclude<LeilaoStatus, 'finalizado'>, { label: string; className: string }> = {
  captando:          { label: 'Captando',          className: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  convite:           { label: 'Convite',            className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  convite_catalogo:  { label: 'Conv. e Catálogo',   className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  venda_pos_leilao:  { label: 'Venda pós leilão',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

export type ActivePieceInfo = {
  codigoPlatforma: string;
  label: string;
  cor:   string;
};

export type ActiveRefsMap = Map<string, ActivePieceInfo>;

export interface UploadedFile {
  filename:        string;
  codigoPlatforma: string | null;
  leilao:          Leilao | null;
  count:           number;
  vendidos:        string[];
  pricePerRef:     Record<string, number>;
}

// Re-export storage type alias so page can use one import
export type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';

export function extractCodigoFromFilename(filename: string): string | null {
  const m = filename.match(/(\d{4,6})/);
  return m ? m[1] : null;
}

function splitCsvLine(line: string, sep: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === sep && !inQ) { cols.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur);
  return cols;
}

export function parseLeiloesBr(text: string): { refs: string[]; vendidos: string[]; pricePerRef: Record<string, number> } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { refs: [], vendidos: [], pricePerRef: {} };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const rawHeaders = splitCsvLine(lines[0], sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, ''));

  const idxMini  = headers.findIndex(h => h.includes('minidesc') || h.includes('mini'));
  const idxValor = headers.findIndex(h => h.includes('valorvend'));
  // Coluna "Base" do leiloes.br = preço base cadastrado (é o que deve bater com preco_avista)
  // Fallbacks para outros formatos possíveis
  const idxPreco = (() => {
    for (const h of ['base', 'precobase', 'valorbase', 'precocontratado', 'lanceinicial']) {
      const i = headers.indexOf(h);
      if (i >= 0) return i;
    }
    return headers.findIndex(h => h.includes('preco') && !h.includes('venda'));
  })();

  if (idxMini < 0) return { refs: [], vendidos: [], pricePerRef: {} };

  const refs: string[] = [];
  const vendidos: string[] = [];
  const pricePerRef: Record<string, number> = {};

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line, sep);
    const ref = (cols[idxMini] ?? '').trim().replace(/^"|"$/g, '').toUpperCase();
    if (!ref) continue;
    refs.push(ref);
    if (idxValor >= 0) {
      const raw = (cols[idxValor] ?? '').trim().replace(/^"|"$/g, '').replace(',', '.');
      const valor = parseFloat(raw) || 0;
      if (valor > 0) vendidos.push(ref);
    }
    if (idxPreco >= 0) {
      const raw = (cols[idxPreco] ?? '').trim().replace(/^"|"$/g, '').replace(',', '.');
      const preco = parseFloat(raw) || 0;
      if (preco > 0) pricePerRef[ref] = preco;
    }
  }

  return { refs, vendidos, pricePerRef };
}

interface Props {
  uploaded:        UploadedFile[];
  excludedFiles:   Set<string>;
  leiloes:         Leilao[];
  onAdd:           (file: UploadedFile, refs: string[]) => void;
  onRemove:        (filename: string) => void;
  onToggleExclude: (filename: string) => void;
}

export function BaseSistemaUpload({
  uploaded, excludedFiles, leiloes, onAdd, onRemove, onToggleExclude,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(file => {
      const codigo = extractCodigoFromFilename(file.name);
      const leilao = codigo ? leiloes.find(l => l.codigoPlatforma === codigo) ?? null : null;
      const reader = new FileReader();
      reader.onload = ev => {
        const { refs, vendidos, pricePerRef } = parseLeiloesBr(ev.target?.result as string);
        onAdd({ filename: file.name, codigoPlatforma: codigo, leilao, count: refs.length, vendidos, pricePerRef }, refs);
      };
      reader.readAsText(file, 'UTF-8');
    });
    e.target.value = '';
  }

  const seen = new Set<string>();
  const filtered = [...uploaded].filter(f => {
    if (seen.has(f.filename)) return false;
    seen.add(f.filename);
    if (f.leilao?.status === 'finalizado') return false;
    return true;
  }).sort((a, b) => Number(a.codigoPlatforma ?? 0) - Number(b.codigoPlatforma ?? 0));

  // Separa por conta: ETERNNO vs BRUNO, resto em "outros"
  const isEternno = (cor?: string) => cor === '#0d9488' || cor === '#2563eb' || cor === '#16a34a';
  const isBruno   = (cor?: string) => cor === '#ea580c' || cor === '#d97706';
  const eternno = filtered.filter(f => isEternno(f.leilao?.cor));
  const bruno   = filtered.filter(f => isBruno(f.leilao?.cor));
  const outros  = filtered.filter(f => !isEternno(f.leilao?.cor) && !isBruno(f.leilao?.cor));

  const chipClass = (excluded: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all ${
      excluded
        ? 'border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-zinc-800/40 opacity-50'
        : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900'
    }`;

  function renderChip(f: typeof filtered[number]) {
    const excluded = excludedFiles.has(f.filename);
    const cor      = f.leilao?.cor ?? '#71717a';
    const label    = f.leilao ? f.leilao.nome : f.codigoPlatforma ? '(sem cadastro)' : f.filename;
    return (
      <div key={f.filename} className={chipClass(excluded)}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: excluded ? '#a1a1aa' : cor }} />
        <span className={`font-bold tabular-nums shrink-0 ${excluded ? 'text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'}`}>
          N°{f.codigoPlatforma ?? '—'}
        </span>
        {f.leilao && (
          <span className={`shrink-0 tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            excluded ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}>
            #{f.leilao.numero}
          </span>
        )}
        <span className={`flex-1 truncate ${excluded ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-400'}`}>{label}</span>

        <span className={`shrink-0 tabular-nums ${excluded ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-500'}`}>{f.count} peças</span>
        {f.vendidos.length > 0 && (
          <span className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums">{f.vendidos.length} vendidas</span>
        )}
        <button onClick={() => onToggleExclude(f.filename)} title={excluded ? 'Incluir' : 'Excluir'}
          className={`shrink-0 p-1 rounded transition-colors ${excluded ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>
          {excluded ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={() => onRemove(f.filename)} title="Remover"
          className="shrink-0 p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        {filtered.length > 0 ? (
        <div className="flex gap-6 items-start flex-1">
          {/* Coluna ETERNNO */}
          {eternno.length > 0 && (
            <div className="flex flex-col gap-1.5 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400" style={{ color: '#16a34a' }}>Eternno</p>
              {eternno.map(renderChip)}
            </div>
          )}
          {/* Coluna BRUNO */}
          {bruno.length > 0 && (
            <div className="flex flex-col gap-1.5 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ea580c' }}>Bruno Araújo</p>
              {bruno.map(renderChip)}
            </div>
          )}
          {/* Outros (sem cor definida) */}
          {outros.length > 0 && (
            <div className="flex flex-col gap-1.5 flex-1">
              {outros.map(renderChip)}
            </div>
          )}
        </div>
        ) : <div className="flex-1" />}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.10] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-xs font-medium transition-colors"
        >
          <Upload size={12} />
          {uploaded.length > 0 ? 'Adicionar mais' : 'Carregar bases ativas (CSV)'}
        </button>
      </div>
    </div>
  );
}
