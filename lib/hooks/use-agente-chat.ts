'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  images?: { ref: string; url: string }[];
};

export function useAgenteChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const nextId                  = useRef(1);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const messagesRef             = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: nextId.current++, role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat-agente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          // histórico completo da sessão — correções do usuário no meio da conversa
          // (ex: explicar o significado de uma sigla) precisam continuar visíveis.
          history: messagesRef.current.map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const json = await res.json() as { reply?: string };
      const reply = json.reply ?? 'Sem resposta.';

      // Extrai referências do reply (ex: **E11111**) e busca imagens em paralelo
      const refs = [...reply.matchAll(/\*\*([A-Za-z]\d{4,6})\*\*/g)].map(m => m[1]);
      let images: { ref: string; url: string }[] = [];
      if (refs.length > 0) {
        try {
          const imgRes = await fetch(`/api/chat-agente/images?refs=${refs.join(',')}`);
          const imgJson = await imgRes.json() as { images?: { ref: string; url: string }[] };
          images = imgJson.images ?? [];
        } catch {
          // imagens são opcionais — falha silenciosa
        }
      }

      setMessages(prev => [...prev, {
        id: nextId.current++,
        role: 'assistant',
        text: reply,
        images: images.length > 0 ? images : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: nextId.current++,
        role: 'assistant',
        text: 'Erro de conexão. Tente novamente.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    send(input);
  }, [input, send]);

  const clear = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return { messages, input, setInput, loading, handleSubmit, send, clear, bottomRef };
}
