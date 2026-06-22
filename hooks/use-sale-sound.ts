import { useCallback } from 'react';

export function useSaleSound() {
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // 3 notas ascendentes: C5 → E5 → G5
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;

        const t0 = ctx.currentTime + i * 0.18;
        const t1 = t0 + 0.35;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t1);
        osc.start(t0);
        osc.stop(t1);
        // libera o contexto após o último bip
        if (i === notes.length - 1) {
          osc.onended = () => ctx.close();
        }
      });
    } catch {
      // TV não suporta Web Audio — falha silenciosa
    }
  }, []);

  return playChime;
}
