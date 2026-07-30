'use client';

import { useRef, useEffect } from 'react';
import { Send, RotateCcw, Sparkles, X } from 'lucide-react';
import { useAgenteChat } from '@/lib/hooks/use-agente-chat';
import { ChatMessageBubble } from '@/components/agente/chat-message';

const SUGGESTIONS = [
  'E11111',
  'Qual o custo da E11111?',
  'Colar riviera mais caro disponível',
  'Anel solitário diamante em comodato',
  'Carros chefe do achados perdidos',
  'Colar riviera vendido pelo achados perdidos',
];

export default function AgentePage() {
  const { messages, input, setInput, loading, handleSubmit, send, clear, bottomRef } = useAgenteChat();
  const isEmpty = messages.length === 0;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">

      {/* Header */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Busca de Peça</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isEmpty
              ? 'Digite uma referência ou faça uma pergunta'
              : `${Math.ceil(messages.length / 2)} pergunta${messages.length > 2 ? 's' : ''} nesta conversa`}
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={() => { clear(); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
          >
            <RotateCcw size={12} />
            Limpar
          </button>
        )}
      </div>

      {/* Mensagens ou Empty State */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-3">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={18} className="text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">O que você quer saber?</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Referência, tipo de peça, destino ou carro chefe</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { send(s); }}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-0.5">
                  <Sparkles size={12} className="text-indigo-500 animate-pulse" />
                </div>
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-t border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Referência ou pergunta…"
              autoComplete="off"
              disabled={loading}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.SyntheticEvent); } }}
              className="w-full px-4 py-2.5 pr-8 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 disabled:opacity-50 transition"
            />
            {input && (
              <button
                type="button"
                onClick={() => { setInput(''); inputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

    </div>
  );
}
