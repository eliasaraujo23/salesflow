'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useFirebase } from '@/components/firebase-provider';
import { criarConversaAction, salvarMensagensAction, type StoredChatMessage } from '@/lib/actions/agente-conversas';

export type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  images?: { ref: string; url: string }[];
};

export function useAgenteChat() {
  const { currentUser } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const nextId                  = useRef(1);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const messagesRef             = useRef<ChatMessage[]>([]);
  const conversaIdRef           = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const persist = useCallback(async (allMessages: ChatMessage[], firstQuestion: string) => {
    if (!currentUser) return; // sem sessão — não há onde salvar
    const stored: StoredChatMessage[] = allMessages.map(m => ({ role: m.role, text: m.text }));
    try {
      let isNew = false;
      if (!conversaIdRef.current) {
        const res = await criarConversaAction(currentUser.email, currentUser.name, firstQuestion);
        if (res.data?.id) {
          conversaIdRef.current = res.data.id;
          setConversaId(res.data.id);
          isNew = true;
        }
      }
      if (conversaIdRef.current) {
        await salvarMensagensAction(conversaIdRef.current, stored);
        if (isNew) setHistoryVersion(v => v + 1);
      }
    } catch {
      // histórico é best-effort — não deve travar a experiência de chat
    }
  }, [currentUser]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: nextId.current++, role: 'user', text: trimmed };
    const isFirst = messagesRef.current.length === 0;
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

      const assistantMsg: ChatMessage = {
        id: nextId.current++,
        role: 'assistant',
        text: reply,
        images: images.length > 0 ? images : undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      void persist([...messagesRef.current, userMsg, assistantMsg], isFirst ? trimmed : messagesRef.current[0]?.text ?? trimmed);
    } catch {
      const errorMsg: ChatMessage = { id: nextId.current++, role: 'assistant', text: 'Erro de conexão. Tente novamente.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, persist]);

  const handleSubmit = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    send(input);
  }, [input, send]);

  const clear = useCallback(() => {
    setMessages([]);
    setInput('');
    conversaIdRef.current = null;
    setConversaId(null);
  }, []);

  const loadConversa = useCallback((id: string, mensagens: StoredChatMessage[]) => {
    conversaIdRef.current = id;
    setConversaId(id);
    setMessages(mensagens.map(m => ({ id: nextId.current++, role: m.role, text: m.text })));
  }, []);

  return {
    messages, input, setInput, loading, handleSubmit, send, clear, bottomRef,
    loadConversa, conversaId, historyVersion,
  };
}
