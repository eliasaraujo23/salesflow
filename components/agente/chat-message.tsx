'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Copy, Check, ZoomIn, CameraOff } from 'lucide-react';
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

function CopyBlockButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }, [text]);
  return (
    <button
      onClick={copy}
      title="Copiar"
      className="opacity-0 group-hover/block:opacity-100 transition shrink-0 p-1 rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
    >
      {done ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
    </button>
  );
}

function renderWithImages(
  text: string,
  imageMap: ImageMap,
  onZoom: (url: string) => void,
) {
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

    if (ref) {
      const thumb = imgUrl ? (
        <button
          onClick={() => onZoom(imgUrl)}
          className="group/img relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.1] hover:border-indigo-400 hover:shadow-md transition-all"
          title={ref}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl} alt={ref} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn size={14} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <div className="shrink-0 w-20 h-20 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.12] flex flex-col items-center justify-center gap-1 text-zinc-300 dark:text-zinc-600">
          <CameraOff size={18} />
          <span className="text-[9px] leading-none">sem foto</span>
        </div>
      );

      return (
        <div
          key={i}
          className="group/block flex gap-3 items-start p-3 mt-2 first:mt-1 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.06]"
        >
          {thumb}
          <div className="flex-1 text-sm leading-relaxed">{textNode}</div>
          <CopyBlockButton text={block} />
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
  const [copied, setCopied]   = useState(false);
  const [zoom, setZoom]       = useState<string | null>(null);
  const [zoomed, setZoomed]   = useState(false);

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
      {isUser ? (
        <div className="flex justify-end py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="group relative max-w-[85%] md:max-w-[70%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20">
            {renderPlainText(message.text)}
          </div>
        </div>
      ) : (
        <div className="group relative flex items-start gap-3 py-4 animate-in fade-in slide-in-from-bottom-1 duration-300">
          <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mt-0.5">
            <Sparkles size={13} className="text-white" />
          </div>
          <div className="flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 min-w-0">
            {hasImages
              ? renderWithImages(message.text, imageMap, setZoom)
              : renderPlainText(message.text)
            }
          </div>
          <button
            onClick={copy}
            title="Copiar"
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
          >
            {copied
              ? <Check size={13} className="text-green-500" />
              : <Copy size={13} />
            }
          </button>
        </div>
      )}

      {/* Lightbox */}
      {zoom && (
        <div
          className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center ${zoomed ? 'overflow-auto p-0 cursor-zoom-out' : 'p-4 cursor-zoom-in'}`}
          onClick={() => { setZoom(null); setZoomed(false); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt="Imagem ampliada"
            className={`shadow-2xl transition-all duration-200 ${zoomed ? 'rounded-none w-auto h-auto min-w-[150%] min-h-[150%] object-contain' : 'rounded-xl max-w-full max-h-full object-contain'}`}
            onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
          />
        </div>
      )}
    </>
  );
}
