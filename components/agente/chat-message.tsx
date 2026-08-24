'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Copy, Check, ZoomIn, CameraOff, Share2 } from 'lucide-react';
import { toast } from 'sonner';
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

interface ImageMap { [ref: string]: string[] }
interface ZoomState { urls: string[]; index: number; ref: string }

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

/** Baixa uma imagem via proxy do servidor (evita CORS numa URL presignada do R2) como File pronto pra compartilhar. */
async function fetchAsFile(url: string, name: string): Promise<File> {
  const res = await fetch(`/api/chat-agente/images/download?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('download falhou');
  const blob = await res.blob();
  const ext = blob.type.split('/')[1]?.split('+')[0] ?? 'jpg';
  return new File([blob], `${name}.${ext}`, { type: blob.type });
}

let shareInProgress = false;

/** Compartilha várias imagens via Web Share API (celular — abre o menu nativo com WhatsApp etc). */
async function shareImages(urls: string[], ref: string) {
  if (shareInProgress) return; // navegador só permite um navigator.share() ativo por vez
  shareInProgress = true;
  try {
    const files = await Promise.all(urls.map((u, i) => fetchAsFile(u, urls.length > 1 ? `${ref}-${i + 1}` : ref)));
    await navigator.share({ files, title: ref });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return; // usuário cancelou o compartilhamento
    console.error('[shareImages] falhou:', err);
    const msg = err instanceof Error ? err.message : String(err);
    toast.error(`Não foi possível compartilhar a imagem. (${msg})`);
  } finally {
    shareInProgress = false;
  }
}

/** Copia uma imagem para a área de transferência — cola direto no WhatsApp Web/app com Ctrl+V. */
async function copyImageToClipboard(url: string, ref: string) {
  try {
    const res = await fetch(`/api/chat-agente/images/download?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('download falhou');
    let blob = await res.blob();
    // A Clipboard API só aceita PNG de forma confiável entre navegadores — converte se vier JPEG.
    if (blob.type !== 'image/png') {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('conversão falhou'))), 'image/png');
      });
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast.success('Imagem copiada — cole (Ctrl+V) no WhatsApp Web ou no app.');
  } catch (err) {
    console.error('[copyImageToClipboard] falhou:', err, ref);
    toast.error('Não foi possível copiar a imagem.');
  }
}

function renderWithImages(
  text: string,
  imageMap: ImageMap,
  onZoom: (state: ZoomState) => void,
) {
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, i) => {
    const refMatch = block.match(/^\*\*([A-Za-z]\d{4,6})\*\*/);
    const ref = refMatch ? refMatch[1].toUpperCase() : null;
    const urls = ref ? imageMap[ref] ?? [] : [];

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
      const thumbs = urls.length > 0 ? (
        <div className="shrink-0 flex gap-1.5">
          {urls.map((url, idx) => (
            <button
              key={url}
              onClick={() => onZoom({ urls, index: idx, ref })}
              className="group/img relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.1] hover:border-indigo-400 hover:shadow-md transition-all"
              title={idx === 0 ? `${ref} — foto principal` : `${ref} — foto secundária`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={ref} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn size={14} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
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
          {thumbs}
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
  const [zoom, setZoom]       = useState<ZoomState | null>(null);
  const [zoomed, setZoomed]   = useState(false);

  function copy() {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const imageMap: ImageMap = {};
  if (message.images) {
    for (const img of message.images) {
      const key = img.ref.toUpperCase();
      (imageMap[key] ??= []).push(img.url);
    }
  }

  const hasImages = message.images && message.images.length > 0;
  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare;

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
      {zoom && zoom.urls.length > 0 && (
        <div
          className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center ${zoomed ? 'overflow-auto p-0 cursor-zoom-out' : 'p-4 cursor-zoom-in'}`}
          onClick={() => { setZoom(null); setZoomed(false); }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom.urls[zoom.index] ?? zoom.urls[0]}
            alt="Imagem ampliada"
            className={`shadow-2xl transition-all duration-200 ${zoomed ? 'rounded-none w-auto h-auto min-w-[150%] min-h-[150%] object-contain' : 'rounded-xl max-w-full max-h-full object-contain'}`}
            onClick={e => { e.stopPropagation(); setZoomed(z => !z); }}
          />

          {zoom.urls.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
              {zoom.urls.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => { e.stopPropagation(); setZoom(z => z && { ...z, index: idx }); }}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === zoom.index ? 'bg-white' : 'bg-white/40'}`}
                  aria-label={idx === 0 ? 'Foto principal' : 'Foto secundária'}
                />
              ))}
            </div>
          )}

          <div className="absolute top-4 right-4 flex gap-2">
            {canShareFiles && (
              <button
                onClick={e => { e.stopPropagation(); shareImages(zoom.urls, zoom.ref); }}
                title="Compartilhar"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 text-zinc-800 text-sm font-medium shadow-lg hover:bg-white transition-colors"
              >
                <Share2 size={15} />
                {zoom.urls.length > 1 ? 'Compartilhar as 2' : 'Compartilhar'}
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); copyImageToClipboard(zoom.urls[zoom.index] ?? zoom.urls[0], zoom.ref); }}
              title="Copiar imagem para colar no WhatsApp"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 text-zinc-800 text-sm font-medium shadow-lg hover:bg-white transition-colors"
            >
              <Copy size={15} />
              Copiar imagem
            </button>
          </div>
        </div>
      )}
    </>
  );
}
