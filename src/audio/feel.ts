// The six interface sounds of 0.11 (game feel), by Sorcerer: each under 120 ms, at or below `coin`, and never
// repeated faster than every 40 ms. tap (a button), tab (a tab change), open/close (a sheet or dialog),
// confirm (a trade, deposit or payment went through) and deny (a refused or disabled action).
export function createFeelSfx(getCtx: () => AudioContext | null, getVolume: () => number) {
  const last: Record<string, number> = {};
  // A sound never repeats faster than 40 ms, so fast tapping never stacks into a buzz.
  const gate = (name: string) => {
    const a = getCtx(); if (!a) return null;
    const now = a.currentTime;
    if (last[name] !== undefined && now - last[name] < 0.04) return null;
    last[name] = now; return a;
  };
  const env = (g: GainNode, t: number, peak: number, attack: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak * getVolume(), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const osc = (a: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, delay = 0, attack = 0.004) => {
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, attack, dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  let noiseBuf: AudioBuffer | null = null;
  const noise = (a: AudioContext, dur: number, peak: number, type: BiquadFilterType, f0: number, f1: number, q = 0.8, delay = 0) => {
    if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
      noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.25), a.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + delay, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, 0.003, dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
  };

  return {
    /** 25 ms: a soft paper click, barely there. */
    tap() { const a = gate('tap'); if (!a) return; noise(a, 0.025, 0.03, 'bandpass', 2600, 2600, 1.4); },
    /** 70 ms: a page flick with a faint wooden note under it. */
    tab() {
      const a = gate('tab'); if (!a) return;
      noise(a, 0.05, 0.03, 'highpass', 2400, 4200, 0.7);
      osc(a, 'triangle', 740, 740, 0.07, 0.018, 0.01);
    },
    /** 100 ms: a small rising swish, like a ledger opening. */
    open() {
      const a = gate('open'); if (!a) return;
      noise(a, 0.09, 0.03, 'bandpass', 900, 2600, 1.1);
      osc(a, 'sine', 440, 660, 0.1, 0.022, 0, 0.02);
    },
    /** 80 ms: the same swish falling, a little quieter. */
    close() {
      const a = gate('close'); if (!a) return;
      noise(a, 0.07, 0.025, 'bandpass', 2400, 900, 1.1);
      osc(a, 'sine', 620, 430, 0.08, 0.018, 0, 0.01);
    },
    /** 110 ms: two soft notes, a fifth apart: "done". Plays under coin and sell. */
    confirm() {
      const a = gate('confirm'); if (!a) return;
      osc(a, 'sine', 660, 660, 0.06, 0.035);
      osc(a, 'sine', 990, 990, 0.07, 0.03, 0.045);
    },
    /** 70 ms: a short dull knock on wood. Not the old `bad` bell. */
    deny() {
      const a = gate('deny'); if (!a) return;
      osc(a, 'triangle', 170, 120, 0.07, 0.05);
      noise(a, 0.04, 0.03, 'lowpass', 600, 300, 0.7);
    },
  };
}
