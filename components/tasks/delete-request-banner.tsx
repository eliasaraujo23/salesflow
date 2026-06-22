'use client';

import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { type DeleteRequest } from '@/components/firebase-provider';

interface DeleteRequestBannerProps {
  requests: DeleteRequest[];
  onApprove: (docId: string, taskId: string | number) => void;
  onReject: (docId: string) => void;
}

export function DeleteRequestBanner({ requests, onApprove, onReject }: DeleteRequestBannerProps) {
  if (!requests.length) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
          Solicitações de exclusão
          <span className="ml-1.5 inline-flex items-center justify-center bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full">
            {requests.length}
          </span>
        </span>
      </div>
      <div className="space-y-2">
        {requests.map((r) => (
          <div
            key={r.docId}
            className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900/60 rounded-lg px-3 py-2.5 border border-amber-100 dark:border-amber-500/10"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {r.title ?? String(r.taskId)}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">
                Solicitado por {r.requestedByName ?? r.requestedBy ?? '—'} · {r.createdAt}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onReject(r.docId)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
                title="Rejeitar"
              >
                <X size={13} />
              </button>
              <button
                onClick={() => onApprove(r.docId, r.taskId)}
                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                title="Aprovar e excluir tarefa"
              >
                <Check size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
