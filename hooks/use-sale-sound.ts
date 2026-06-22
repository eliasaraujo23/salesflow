import { useCallback } from 'react';

export function useSaleSound() {
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 1.0;
      master.connect(ctx.destination);

      // Batida grave inicial — impacto
      const boom = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(master);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
        g.gain.setValueAtTime(1.0, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      };

      // Fanfare: 3 notas ascendentes com duas camadas (fundamental + oitava)
      const fanfare = (freq: number, t: number, dur: number) => {
        (['sawtooth', 'sine'] as OscillatorType[]).forEach((type, layer) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(master);
          osc.type = type;
          osc.frequency.value = layer === 1 ? freq * 2 : freq;
          const vol = layer === 0 ? 0.55 : 0.35;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(vol, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          osc.start(t);
          osc.stop(t + dur);
        });
      };

      boom();
      // C5, E5, G5, C6 — quatro notas, mais dramático
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        fanfare(freq, ctx.currentTime + 0.05 + i * 0.16, 0.45);
      });

      // Fecha contexto após o último som
      setTimeout(() => ctx.close(), 1500);
    } catch {
      // falha silenciosa se TV não suportar
    }
  }, []);

  return playChime;
}
