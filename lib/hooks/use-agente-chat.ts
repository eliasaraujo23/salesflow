'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

export function useAgenteChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const nextId                  = useRef(1);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        body: JSON.stringify({ message: trimmed }),
      });
      const json = await res.json() as { reply?: string };
      const reply = json.reply ?? 'Sem resposta.';
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: 'Erro de conexão. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  }, [input, send]);

  const clear = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return { messages, input, setInput, loading, handleSubmit, send, clear, bottomRef };
}
