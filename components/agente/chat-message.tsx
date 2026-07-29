'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, ZoomIn } from 'lucide-react';
import { type ChatMessage } from '@/lib/hooks/use-agente-chat';

function renderLine(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={j}>{part.slice(2, -2)}</strong>
      : part
  );
}

function renderPlainText(text: string) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {renderLine(line)}
    </span>
  ));
}

interface ImageMap { [ref: string]: string }

function renderWithImages(
  text: string,
  imageMap: ImageMap,
  onZoom: (url: string) => void,
) {
  // Divide em blocos por linha em branco
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, i) => {
    const refMatch = block.match(/^\*\*([A-Za-z]\d{4,6})\*\*/);
    const ref = refMatch ? refMatch[1].toUpperCase() : null;
    const imgUrl = ref ? imageMap[ref] : null;

    const textNode = (
      <span>
        {block.split('\n').map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderLine(line)}
          </span>
        ))}
      </span>
    );

    if (imgUrl) {
      return (
        <div key={i} className="flex gap-2.5 items-start mt-3 first:mt-0">
          <button
            onClick={() => onZoom(imgUrl)}
            className="group/img shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/[0.1] hover:border-indigo-400 transition"
            title={ref ?? undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl} alt={ref ?? ''} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition flex items-center justify-center">
              <ZoomIn size={14} className="text-white opacity-0 group-hover/img:opacity-100 transition" />
            </div>
          </button>
          <div className="flex-1 text-xs leading-relaxed">{textNode}</div>
        </div>
      );
    }

    return (
      <div key={i} className={i > 0 ? 'mt-2' : ''}>
        {textNode}
      </div>
    );
  });
}

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom]     = useState<string | null>(null);

  function copy() {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const imageMap: ImageMap = {};
  if (message.images) {
    for (const img of message.images) {
      imageMap[img.ref.toUpperCase()] = img.url;
    }
  }

  const hasImages = message.images && message.images.length > 0;

  return (
    <>
      <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-0.5">
            <Sparkles size={12} className="text-indigo-500" />
          </div>
        )}
        <div className={`group relative max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
        }`}>
          {hasImages
            ? renderWithImages(message.text, imageMap, setZoom)
            : renderPlainText(message.text)
          }

          {!isUser && (
            <button
              onClick={copy}
              title="Copiar"
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-white/[0.1] shadow-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              {copied
                ? <Check size={11} className="text-green-500" />
                : <Copy size={11} />
              }
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt="Imagem ampliada"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
