'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, ArrowUp, Mic, Square } from 'lucide-react';
import { useAgenteChat } from '@/lib/hooks/use-agente-chat';
import { useSpeechToText } from '@/lib/hooks/use-speech-to-text';
import { ChatMessageBubble } from '@/components/agente/chat-message';

export default function AgentePage() {
  const { messages, input, setInput, loading, handleSubmit, bottomRef } = useAgenteChat();
  const isEmpty = messages.length === 0;
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleSpeechResult = useCallback((text: string) => {
    setInput(text);
    if (inputRef.current) autoGrow(inputRef.current);
  }, [setInput]);

  const { listening, supported: micSupported, toggle: toggleMic } = useSpeechToText(handleSpeechResult);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 relative overflow-hidden">

      {/* Glow ambiente sutil, só decorativo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[280px] rounded-full bg-gradient-to-br from-indigo-400/10 via-violet-400/10 to-transparent blur-3xl" aria-hidden />

      {/* Mensagens ou Empty State */}
      <div className="flex-1 overflow-y-auto z-10 px-4 md:px-6 py-6 flex flex-col gap-1 [scrollbar-gutter:stable]">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-7 pb-10 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25 animate-in zoom-in-95 duration-500">
                <Sparkles size={20} className="text-white" />
              </div>
              <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">Pergunte ao Nexus qualquer coisa relacionada à revenda</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1.5">Referência, tipo de peça, destino ou carro chefe — vou te ajudar</p>
            </div>
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto w-full flex flex-col gap-1">
              {messages.map(msg => (
                <ChatMessageBubble key={msg.id} message={msg} />
              ))}
              {loading && (
                <div className="flex items-start gap-3 py-4 animate-in fade-in duration-200">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                    <Sparkles size={13} className="text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 z-10 px-4 md:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-white dark:from-zinc-950 via-white/95 dark:via-zinc-950/95 to-transparent">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-zinc-900 p-1.5 shadow-sm focus-within:border-indigo-400 dark:focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); autoGrow(e.target); }}
            placeholder={listening ? 'Ouvindo... fale sua pergunta' : 'Referência ou pergunta…'}
            autoComplete="off"
            disabled={loading}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.SyntheticEvent);
                requestAnimationFrame(() => { if (inputRef.current) inputRef.current.style.height = 'auto'; });
              }
            }}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none disabled:opacity-50 max-h-40 leading-relaxed"
          />
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={loading}
              aria-label={listening ? 'Parar gravação' : 'Gravar pergunta por voz'}
              title={listening ? 'Parar gravação' : 'Gravar pergunta por voz'}
              className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                listening
                  ? 'bg-red-500 text-white shadow-sm shadow-red-500/30 animate-pulse'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              {listening ? <Square size={14} fill="currentColor" /> : <Mic size={17} />}
            </button>
          )}
          <button
            type="submit"
            disabled={!input.trim() || loading}
            aria-label="Enviar"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all active:scale-90 shadow-sm shadow-indigo-500/30"
          >
            {loading
              ? <Send size={15} className="animate-pulse" />
              : <ArrowUp size={16} strokeWidth={2.5} />
            }
          </button>
        </form>
        <p className="max-w-3xl mx-auto text-center text-[10px] text-zinc-400 dark:text-zinc-600 mt-2 hidden sm:block">
          Respostas geradas a partir dos dados do sistema — confirme antes de decisões importantes.
        </p>
      </div>

    </div>
  );
}
