import { useCallback, useRef } from 'react';

export function useSaleSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playFireworks = useCallback(() => {
    try {
      // Reutiliza o elemento para evitar múltiplas instâncias
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/firework.mp3.mp3');
        audioRef.current.volume = 1.0;
      }
      const audio = audioRef.current;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // autoplay bloqueado pelo browser — ignora
      });
    } catch {
      // falha silenciosa
    }
  }, []);

  return playFireworks;
}
