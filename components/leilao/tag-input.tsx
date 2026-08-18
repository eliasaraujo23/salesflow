'use client';

import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { X } from 'lucide-react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  validate?: (value: string) => boolean;
  hint?: string;
}

function splitInput(raw: string): string[] {
  return raw
    .split(/[\s,;|\t\n]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

export function TagInput({ tags, onChange, placeholder, disabled, validate, hint }: Props) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTokens(raw: string) {
    const candidates = splitInput(raw);
    if (!candidates.length) return;
    const next = [...tags];
    for (const c of candidates) {
      if (!next.includes(c) && (!validate || validate(c))) next.push(c);
    }
    onChange(next);
    setInputValue('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addTokens(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    e.preventDefault();
    addTokens(text);
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={[
        'flex flex-wrap gap-1.5 px-2 py-1.5 min-h-[36px] rounded-lg border transition-colors cursor-text',
        disabled
          ? 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-800 opacity-50 pointer-events-none'
          : 'border-zinc-200 dark:border-white/[0.10] bg-white dark:bg-zinc-900 focus-within:border-violet-400 dark:focus-within:border-violet-500',
      ].join(' ')}
    >
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] font-mono font-semibold"
        >
          {tag}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); removeTag(tag); }}
            className="text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 transition-colors"
          >
            <X size={9} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => { if (inputValue.trim()) addTokens(inputValue); }}
        placeholder={tags.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="flex-1 min-w-[80px] bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none"
      />
      {hint && tags.length === 0 && !inputValue && (
        <span className="w-full text-[10px] text-zinc-400 mt-0.5 pointer-events-none select-none">{hint}</span>
      )}
    </div>
  );
}
