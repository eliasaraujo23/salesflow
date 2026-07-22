'use client';

import { type ChatMessage } from '@/lib/hooks/use-agente-chat';

function renderText(text: string) {
  // Converte **bold** e quebras de linha
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j}>{part.slice(2, -2)}</strong>
            : part
        )}
      </span>
    );
  });
}

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
      }`}>
        {renderText(message.text)}
      </div>
    </div>
  );
}
