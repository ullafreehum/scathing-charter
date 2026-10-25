// The sounds of 0.11 (game feel), by Sorcerer. Interface: each under 120 ms, at or below `coin`, and never
// repeated faster than every 40 ms. tap (a button), tab (a tab change), open/close (a sheet or dialog),
// confirm (a trade, deposit or payment went through) and deny (a refused or disabled action).
// The duel's own six follow (createDuelSfx).
type Ctx = () => AudioContext | null;

function kit(getCtx: Ctx, getVolume: () => number) {
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
  return { gate, osc, noise };
}

export function createFeelSfx(getCtx: Ctx, getVolume: () => number) {
  const { gate, osc, noise } = kit(getCtx, getVolume);
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

// The duel's six (0.11, Sinan: "the duel on mobile feels too cheap"), tied to the board's beats in duelBoard.ts.
export function createDuelSfx(getCtx: Ctx, getVolume: () => number) {
  const { gate, osc, noise } = kit(getCtx, getVolume);
  const bell = (a: AudioContext, f: number, dur: number, peak: number, delay: number) => osc(a, 'sine', f, f, dur, peak, delay, 0.02);
  return {
    /** 90 ms: a card sliding off the deck. */
    draw() { const a = gate('draw'); if (!a) return; noise(a, 0.09, 0.03, 'bandpass', 1400, 3200, 0.9); },
    /** 120 ms: a swish plus the card's colour: stone = low wooden thud, steel = short metal ring, magicka = glassy shimmer. */
    play(res: 'stone' | 'steel' | 'magicka' = 'stone') {
      const a = gate('play'); if (!a) return;
      noise(a, 0.1, 0.035, 'bandpass', 3000, 1100, 1.0);
      if (res === 'stone') osc(a, 'sine', 180, 110, 0.12, 0.06, 0.03);
      else if (res === 'steel') { osc(a, 'triangle', 1320, 1260, 0.12, 0.025, 0.03); osc(a, 'square', 2640, 2600, 0.05, 0.006, 0.03); }
      else { osc(a, 'sine', 1180, 1180, 0.12, 0.022, 0.03, 0.01); osc(a, 'sine', 1770, 1770, 0.1, 0.014, 0.06, 0.01); }
    },
    /** 180-300 ms: a thump with grit. `size` = points lost; bigger hits are lower and a touch louder. */
    hit(size = 4) {
      const a = gate('hit'); if (!a) return;
      const k = Math.min(1, size / 20), dur = 0.18 + 0.12 * k;
      osc(a, 'sine', 95 - 30 * k, 38, dur, 0.06 + 0.02 * k);
      noise(a, dur * 0.8, 0.04 + 0.02 * k, 'lowpass', 900, 250, 0.7);
    },
    /** 160 ms: two quick rising knocks, stone set on stone. */
    build() {
      const a = gate('build'); if (!a) return;
      osc(a, 'triangle', 300, 280, 0.06, 0.04); noise(a, 0.03, 0.02, 'bandpass', 1800, 1800, 1.2);
      osc(a, 'triangle', 400, 380, 0.07, 0.04, 0.08); noise(a, 0.03, 0.02, 'bandpass', 2200, 2200, 1.2, 0.08);
    },
    /** About 1 s: three soft bells rising (C, E, G). */
    win() { const a = gate('win'); if (!a) return; bell(a, 523, 0.9, 0.05, 0); bell(a, 659, 0.9, 0.045, 0.14); bell(a, 784, 1.1, 0.045, 0.28); },
    /** About 1 s: two bells falling, the second low and dark. */
    lose() { const a = gate('lose'); if (!a) return; bell(a, 392, 0.8, 0.05, 0); bell(a, 262, 1.1, 0.05, 0.22); osc(a, 'sine', 131, 120, 1.0, 0.025, 0.22, 0.03); },
  };
}
