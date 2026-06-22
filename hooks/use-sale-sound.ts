import { useCallback } from 'react';

function makeDistCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const buf = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buf);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function noiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * durationSec);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// Uma explosão individual: ruído curto + sub-grave
function bang(ctx: AudioContext, master: GainNode, t: number, vol: number, pitch: number) {
  // Ruído branco com envelope
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.6);
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(pitch, t);
  lpf.frequency.exponentialRampToValueAtTime(pitch * 0.15, t + 0.5);
  const dist = ctx.createWaveShaper();
  dist.curve = makeDistCurve(350);
  dist.oversample = '2x';
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  src.connect(lpf); lpf.connect(dist); dist.connect(g); g.connect(master);
  src.start(t); src.stop(t + 0.6);

  // Sub-grave
  const sub = ctx.createOscillator();
  const subG = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(pitch * 0.15, t);
  sub.frequency.exponentialRampToValueAtTime(20, t + 0.4);
  subG.gain.setValueAtTime(vol * 0.9, t);
  subG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  sub.connect(subG); subG.connect(master);
  sub.start(t); sub.stop(t + 0.45);
}

export function useSaleSound() {
  const playFireworks = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 1.0;
      master.connect(ctx.destination);
      const now = ctx.currentTime;

      // ── Crackle contínuo por 5s — base de fogos
      const crackle = ctx.createBufferSource();
      crackle.buffer = noiseBuffer(ctx, 5.5);
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 2000;
      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.15, now);
      crackleGain.gain.setValueAtTime(0.18, now + 1.0);
      crackleGain.gain.setValueAtTime(0.12, now + 3.0);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 5.2);
      crackle.connect(hpf); hpf.connect(crackleGain); crackleGain.connect(master);
      crackle.start(now); crackle.stop(now + 5.5);

      // ── Sequência de explosões ao longo dos 5s
      // [tempo, volume, frequência do filtro]
      const bangs: [number, number, number][] = [
        [0.00, 1.00, 1800], // BOOM inicial — o maior
        [0.30, 0.75, 1400],
        [0.75, 0.65, 2200],
        [1.20, 0.80, 1600],
        [1.70, 0.55, 2600],
        [2.20, 0.85, 1500], // segundo grande
        [2.65, 0.60, 2000],
        [3.10, 0.70, 1700],
        [3.55, 0.65, 2400],
        [4.00, 0.75, 1900],
        [4.40, 0.60, 2100],
        [4.75, 0.90, 1600], // finalzão
      ];

      bangs.forEach(([t, vol, pitch]) => bang(ctx, master, now + t, vol, pitch));

      setTimeout(() => ctx.close(), 6500);
    } catch {
      // falha silenciosa
    }
  }, []);

  return playFireworks;
}
