import { useCallback } from 'react';

function distortionCurve(amount: number): Float32Array {
  const n = 512;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

export function useSaleSound() {
  const playExplosion = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 1.0;
      master.connect(ctx.destination);
      const now = ctx.currentTime;

      // ── 1. Ruído branco — o "crack" da explosão
      const noiseLen = ctx.sampleRate * 1.2;
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) noiseData[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      // Passa-baixa: corta frequências altas — deixa grave como explosão
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(1800, now);
      lpf.frequency.exponentialRampToValueAtTime(200, now + 1.0);

      // Distorção no ruído
      const distort = ctx.createWaveShaper();
      distort.curve = distortionCurve(400);
      distort.oversample = '4x';

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(1.0, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      noise.connect(lpf);
      lpf.connect(distort);
      distort.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + 1.2);

      // ── 2. Sub-grave: impacto físico
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(90, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.5);
      subGain.gain.setValueAtTime(1.0, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      sub.connect(subGain);
      subGain.connect(master);
      sub.start(now);
      sub.stop(now + 0.5);

      // ── 3. Mid-range punch — dá "corpo" à explosão
      const mid = ctx.createOscillator();
      const midDist = ctx.createWaveShaper();
      const midGain = ctx.createGain();
      mid.type = 'sawtooth';
      mid.frequency.setValueAtTime(180, now);
      mid.frequency.exponentialRampToValueAtTime(55, now + 0.4);
      midDist.curve = distortionCurve(600);
      midDist.oversample = '2x';
      midGain.gain.setValueAtTime(0.7, now);
      midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      mid.connect(midDist);
      midDist.connect(midGain);
      midGain.connect(master);
      mid.start(now);
      mid.stop(now + 0.5);

      setTimeout(() => ctx.close(), 1600);
    } catch {
      // falha silenciosa
    }
  }, []);

  return playExplosion;
}
