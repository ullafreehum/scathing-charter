// Tiny procedural Web Audio effects: no audio files, works offline.
let ctx: AudioContext | null = null;
let enabled = true;
let wind: { stop: () => void; gain: GainNode } | null = null;

export function setSound(on: boolean) { enabled = on; if (!on) stopWind(); }
function ac(): AudioContext | null {
  if (!enabled) return null;
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; }
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, glide?: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol: number, freq: number) {
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
export const sfx = {
  coin() { tone(1800, 0.12, 'triangle', 0.08); tone(2600, 0.1, 'triangle', 0.05, 0.05); },
  sell() { tone(1400, 0.1, 'triangle', 0.07); tone(2100, 0.14, 'triangle', 0.06, 0.06); tone(2900, 0.12, 'sine', 0.04, 0.12); },
  step() { noise(0.25, 0.12, 700); },
  sting() { tone(220, 0.5, 'sawtooth', 0.05, 0, 110); tone(330, 0.5, 'square', 0.025, 0.05, 160); },
  boom() { noise(1.6, 0.5, 180); tone(55, 1.4, 'sine', 0.25, 0, 30); },
  page() { noise(0.12, 0.06, 2400); },
  bad() { tone(160, 0.35, 'sawtooth', 0.05, 0, 90); },
};
export function startWind(intensity: number) {
  const a = ac(); if (!a) return;
  if (wind) { wind.gain.gain.setTargetAtTime(0.015 + intensity * 0.05, a.currentTime, 1.5); return; }
  const len = a.sampleRate * 4; const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 6; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
  const g = a.createGain(); g.gain.value = 0.015 + intensity * 0.05;
  src.connect(f).connect(g).connect(a.destination); src.start();
  wind = { stop: () => src.stop(), gain: g };
}
export function stopWind() { try { wind?.stop(); } catch { /* already stopped */ } wind = null; }
