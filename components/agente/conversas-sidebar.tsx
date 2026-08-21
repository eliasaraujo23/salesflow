'use client';

import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeft, Trash2, MessageSquare, Plus, Sparkles } from 'lucide-react';
import { useFirebase } from '@/components/firebase-provider';
import {
  listarConversasAction, excluirConversaAction, type AgenteConversa,
} from '@/lib/actions/agente-conversas';
import { type StoredChatMessage } from '@/lib/actions/agente-conversas';

interface ConversasSidebarProps {
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string, mensagens: StoredChatMessage[]) => void;
  onNewChat: () => void;
  activeConversaId: string | null;
  refreshKey: number;
}

function groupLabel(date: Date): string {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays <= 7) return 'Últimos 7 dias';
  if (diffDays <= 30) return 'Últimos 30 dias';
  return 'Mais antigas';
}

export function ConversasSidebar({ open, onToggle, onSelect, onNewChat, activeConversaId, refreshKey }: ConversasSidebarProps) {
  const { currentUser } = useFirebase();
  const [conversas, setConversas] = useState<AgenteConversa[]>([]);
  const [loading, setLoading] = useState(true);
  const userEmail = currentUser?.email;

  useEffect(() => {
    if (!userEmail) return;
    let active = true;
    listarConversasAction(userEmail).then(res => {
      if (!active) return;
      setConversas(res.data ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userEmail, refreshKey]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversas(prev => prev.filter(c => c.id !== id));
    await excluirConversaAction(id);
  }

  const groups = new Map<string, AgenteConversa[]>();
  for (const c of conversas) {
    const label = c.updatedAt ? groupLabel(c.updatedAt.toDate()) : 'Mais antigas';
    groups.set(label, [...(groups.get(label) ?? []), c]);
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] md:hidden animate-in fade-in duration-200"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 h-full md:h-auto w-[260px] shrink-0 bg-zinc-50 dark:bg-zinc-925 dark:bg-black/40 border-r border-zinc-200 dark:border-white/[0.06] flex flex-col transition-transform duration-250 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full md:-translate-x-full md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        <div className="shrink-0 flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <Sparkles size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Achador</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200 transition-colors"
            aria-label="Recolher histórico"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] text-sm text-zinc-700 dark:text-zinc-200 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            Nova conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 [scrollbar-gutter:stable]">
          {loading ? (
            <div className="flex flex-col gap-2 px-1 pt-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-9 rounded-lg bg-zinc-200/60 dark:bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : conversas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6 pt-10">
              <MessageSquare size={20} className="text-zinc-300 dark:text-zinc-600" />
              <p className="text-xs text-zinc-400">Suas conversas vão aparecer aqui.</p>
            </div>
          ) : (
            [...groups.entries()].map(([label, items]) => (
              <div key={label} className="mb-3">
                <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 px-2.5 py-1.5">{label}</p>
                {items.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id, c.mensagens)}
                    className={`group w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                      activeConversaId === c.id
                        ? 'bg-indigo-100/70 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-zinc-200/50 dark:hover:bg-white/[0.05] text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-[13px] truncate flex-1">{c.titulo || 'Conversa sem título'}</span>
                    <span
                      onClick={e => handleDelete(c.id, e)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Botão flutuante pra reabrir quando colapsado (desktop) */}
      {!open && (
        <button
          onClick={onToggle}
          className="hidden md:flex fixed top-[14px] left-3 z-30 items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200 transition-colors"
          aria-label="Mostrar histórico"
        >
          <PanelLeft size={16} />
        </button>
      )}
    </>
  );
}
