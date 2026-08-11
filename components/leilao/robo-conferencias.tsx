'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Download, RefreshCw, ChevronDown } from 'lucide-react';
import type { UploadedFileStored } from '@/lib/hooks/use-leilao-bases-storage';
import type { ConferenciaIssue } from '@/app/api/leilao/conferencia/route';
import { fetchConferencia } from '@/lib/actions/fetch-conferencia';
import { downloadCsv } from '@/lib/leilao-csv';

interface InterDuplicate {
  ref:        string;
  otherFiles: UploadedFileStored[];
}

interface IntraDuplicate {
  ref:   string;
  count: number;
}

interface LeilaoResult {
  file:           UploadedFileStored;
  destinos:       ConferenciaIssue[];
  vendas:         ConferenciaIssue[];
  interDuplicates: InterDuplicate[];
  intraDuplicates: IntraDuplicate[];
}

interface Props {
  uploadedFiles:   UploadedFileStored[];
  refsPerFile:     Map<string, string[]>;
  excludedFiles:   Set<string>;
  activeDestinos:  string[];
}

function LeilaoHeader({ file }: { file: UploadedFileStored }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: file.leilao?.cor ?? '#71717a' }} />
      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
        N°{file.codigoPlatforma ?? '—'}
      </span>
      {file.leilao && (
        <>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-xs font-semibold text-zinc-500 tabular-nums">#{file.leilao.numero}</span>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">{file.leilao.nome}</span>
        </>
      )}
    </div>
  );
}

export function RoboConferencias({ uploadedFiles, refsPerFile, excludedFiles, activeDestinos }: Props) {
  const [results,   setResults]   = useState<LeilaoResult[] | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(filename: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  }

  const activeFiles = useMemo(
    () => uploadedFiles.filter(f => !excludedFiles.has(f.filename)),
    [uploadedFiles, excludedFiles],
  );

  // ── Duplicatas (calculado localmente, sem API) ────────────────
  const duplicatesByFile = useMemo(() => {
    // Mapa ref → arquivos DISTINTOS (cada arquivo conta 1 vez por ref)
    const refToFiles = new Map<string, UploadedFileStored[]>();
    for (const f of activeFiles) {
      const seenInFile = new Set<string>();
      for (const ref of (refsPerFile.get(f.filename) ?? [])) {
        if (!ref) continue;
        const upper = ref.toUpperCase();
        if (seenInFile.has(upper)) continue;
        seenInFile.add(upper);
        const list = refToFiles.get(upper) ?? [];
        list.push(f);
        refToFiles.set(upper, list);
      }
    }

    const byFile = new Map<string, { inter: InterDuplicate[]; intra: IntraDuplicate[] }>();
    for (const f of activeFiles) {
      const refCount = new Map<string, number>();
      for (const ref of (refsPerFile.get(f.filename) ?? [])) {
        if (!ref) continue;
        const upper = ref.toUpperCase();
        refCount.set(upper, (refCount.get(upper) ?? 0) + 1);
      }

      const inter: InterDuplicate[] = [];
      const intra: IntraDuplicate[] = [];

      for (const [upper, count] of refCount.entries()) {
        const origRef = (refsPerFile.get(f.filename) ?? []).find(r => r.toUpperCase() === upper) ?? upper;
        if (count > 1) {
          intra.push({ ref: origRef, count });
        }
        const allFiles = refToFiles.get(upper) ?? [];
        if (allFiles.length > 1) {
          const others = allFiles.filter(o => o.filename !== f.filename);
          inter.push({ ref: origRef, otherFiles: others });
        }
      }

      inter.sort((a, b) => a.ref.localeCompare(b.ref));
      intra.sort((a, b) => a.ref.localeCompare(b.ref));
      byFile.set(f.filename, { inter, intra });
    }
    return byFile;
  }, [activeFiles, refsPerFile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerificar() {
    setLoading(true);
    setError(null);
    try {
      // Collect all unique refs across active files
      const allRefs = Array.from(
        new Set(
          activeFiles.flatMap(f =>
            (refsPerFile.get(f.filename) ?? []).filter(r => r && !/^\d/.test(r))
          )
        )
      );

      const issues = await fetchConferencia(allRefs, activeDestinos);
      const issueMap = new Map<string, ConferenciaIssue>(
        issues.map(i => [i.referencia.toUpperCase(), i])
      );

      const leilaoResults: LeilaoResult[] = activeFiles.map(f => {
        const destinos: ConferenciaIssue[] = [];
        const vendas:   ConferenciaIssue[] = [];

        const seenRefs = new Set<string>();
        for (const ref of (refsPerFile.get(f.filename) ?? [])) {
          if (!ref) continue;
          const upper = ref.toUpperCase();
          if (seenRefs.has(upper)) continue;
          seenRefs.add(upper);
          const issue = issueMap.get(upper);
          if (!issue) continue;
          if (issue.problema === 'destino_exclusivo') destinos.push(issue);
          else vendas.push(issue);
        }

        destinos.sort((a, b) => a.referencia.localeCompare(b.referencia));
        vendas.sort((a, b) => a.referencia.localeCompare(b.referencia));

        const { inter, intra } = duplicatesByFile.get(f.filename) ?? { inter: [], intra: [] };
        return {
          file: f,
          destinos,
          vendas,
          interDuplicates: inter,
          intraDuplicates: intra,
        };
      });

      leilaoResults.sort((a, b) => Number(a.file.codigoPlatforma ?? 0) - Number(b.file.codigoPlatforma ?? 0));
      setResults(leilaoResults);
      setCollapsed(new Set(leilaoResults.map(r => r.file.filename)));
    } catch {
      setError('Erro ao verificar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function exportAll() {
    if (!results) return;
    const lines = ['leilao_br;leilao_num;leilao_nome;referencia;problema;detalhe'];
    for (const { file, destinos, vendas, interDuplicates: inter, intraDuplicates: intra } of results) {
      const base = `N°${file.codigoPlatforma ?? '?'};#${file.leilao?.numero ?? '?'};${file.leilao?.nome ?? '?'}`;
      for (const d of destinos)
        lines.push(`${base};${d.referencia};Destino exclusivo;${d.destino ?? ''}`);
      for (const v of vendas)
        lines.push(`${base};${v.referencia};${v.status_nome};`);
      for (const d of intra)
        lines.push(`${base};${d.ref};Duplicata no CSV;aparece ${d.count}x no mesmo arquivo`);
      for (const d of inter) {
        const others = d.otherFiles.map((o: UploadedFileStored) => `N°${o.codigoPlatforma ?? '?'} #${o.leilao?.numero ?? '?'} ${o.leilao?.nome ?? ''}`).join(' / ');
        lines.push(`${base};${d.ref};Duplicata entre leilões;também em ${others}`);
      }
    }
    if (lines.length > 1) downloadCsv(lines.join('\n'), 'conferencias_leiloes.csv');
  }

  const totalIssues = results
    ? results.reduce((n, r) => n + r.destinos.length + r.vendas.length + r.interDuplicates.length + r.intraDuplicates.length, 0)
    : null;

  return (
    <div className="flex flex-col gap-3">

      {/* Barra de ação */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          {activeFiles.length} leilão{activeFiles.length !== 1 ? 'es' : ''} ativo{activeFiles.length !== 1 ? 's' : ''}
          {totalIssues !== null && totalIssues > 0 && (
            <span className="ml-2 text-red-500 font-semibold">
              · {totalIssues} problema{totalIssues !== 1 ? 's' : ''} encontrado{totalIssues !== 1 ? 's' : ''}
            </span>
          )}
          {totalIssues === 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">· Tudo certo!</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {totalIssues !== null && totalIssues > 0 && (
            <button
              onClick={exportAll}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold transition-colors"
            >
              <Download size={11} />
              Exportar CSV
            </button>
          )}
          <button
            onClick={handleVerificar}
            disabled={loading || activeFiles.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white disabled:text-zinc-400 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Verificando...' : results ? 'Reverificar' : 'Verificar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Sem resultados ainda */}
      {!results && !loading && (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] p-6 text-center">
          <p className="text-xs text-zinc-400">Clique em <span className="font-semibold text-zinc-600 dark:text-zinc-300">Verificar</span> para consultar o banco de dados</p>
        </div>
      )}

      {/* Um card por leilão */}
      {results && results.map(({ file, destinos, vendas, interDuplicates, intraDuplicates }) => {
        const total = destinos.length + vendas.length + interDuplicates.length + intraDuplicates.length;
        const ok = total === 0;
        const isCollapsed = collapsed.has(file.filename);
        return (
          <div key={file.filename} className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">

            {/* Header — clicável para recolher */}
            <button
              type="button"
              onClick={() => toggleCollapse(file.filename)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                ok
                  ? 'bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  : 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
              } ${!isCollapsed && !ok ? 'border-b border-zinc-200 dark:border-white/[0.06]' : ''}`}
            >
              <LeilaoHeader file={file} />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 tabular-nums">{file.count} peças</span>
                {ok ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} /> {total} problema{total !== 1 ? 's' : ''}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  className={`text-zinc-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                />
              </div>
            </button>

            {!isCollapsed && ok ? (
              <div className="px-4 py-3">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Nenhum problema encontrado.</span>
              </div>
            ) : !isCollapsed && (
              <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">

                {/* Destino exclusivo */}
                {destinos.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                        Em comodato com terceiros — {destinos.length} peça{destinos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {destinos.map(d => (
                      <div key={d.referencia} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 tabular-nums w-20 shrink-0">{d.referencia}</span>
                        <span className="text-[11px] text-orange-600 dark:text-orange-400 flex-1">{d.destino}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status de venda */}
                {vendas.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                        Com status de venda — {vendas.length} peça{vendas.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {vendas.map(v => (
                      <div key={v.referencia} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 tabular-nums w-20 shrink-0">{v.referencia}</span>
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex-1">{v.status_nome}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Duplicatas no mesmo leilão */}
                {intraDuplicates.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        Duplicada no mesmo CSV — {intraDuplicates.length} peça{intraDuplicates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {intraDuplicates.map(d => (
                      <div key={d.ref} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 tabular-nums w-20 shrink-0">{d.ref}</span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">aparece {d.count}× no arquivo</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Duplicatas em outros leilões */}
                {interDuplicates.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-violet-50 dark:bg-violet-950/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        Também em outro leilão — {interDuplicates.length} peça{interDuplicates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {interDuplicates.map(d => (
                      <div key={d.ref} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 tabular-nums w-20 shrink-0">{d.ref}</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {d.otherFiles.map((o, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.leilao?.cor ?? '#7c3aed' }} />
                              N°{o.codigoPlatforma ?? '?'}
                              {o.leilao && <>{' · '}#{o.leilao.numero}{' · '}{o.leilao.nome}</>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
