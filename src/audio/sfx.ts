// Tiny procedural Web Audio effects: no audio files, works offline.
import { createScore, type Score } from './score';
import { createScore as createSong } from './songs';
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.8;
let wind: { stop: () => void; gain: GainNode; level: number } | null = null;
let musicOn = false, mood: 0 | 1 | 2 = 0;
let music: Score | null = null;
const MUSIC_LEVEL = 0.4; // the score's own level at full volume
const SONG_MS = 5 * 60 * 1000; // each song plays about five minutes, then another one starts
let song = -1, rotate = 0; // -1 = the first score (score.js), 0-2 = songs.js

export function setSound(on: boolean) { enabled = on; if (!on) stopWind(); syncMusic(); }
/** Master volume 0–1 for effects and wind. */
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (wind && ctx) wind.gain.gain.setTargetAtTime(wind.level * volume, ctx.currentTime, 0.2);
  music?.setVolume(MUSIC_LEVEL * volume); syncMusic();
}
/** The background score (Settings → Music): plays while music and sound are on and the volume is above zero. */
export function setMusic(on: boolean) { musicOn = on; syncMusic(); }
/** 0 calm, 1 after Baar Dau falls, 2 during a card duel. */
export function setMusicMood(m: 0 | 1 | 2) { mood = m; music?.setMood(m); }
function syncMusic() {
  const want = musicOn && enabled && volume > 0;
  if (want && !music) playSong(song);
  else if (!want && music) { clearTimeout(rotate); music.stop(); music = null; }
}
/** Starts song `n` (the first score is -1), then after SONG_MS a random different one, in the current mood. */
function playSong(n: number) {
  const a = ac(); if (!a) return;
  song = n; music = n < 0 ? createScore(a, a.destination) : createSong(a, a.destination, { song: n as 0 | 1 | 2 });
  music.setMood(mood); music.start(MUSIC_LEVEL * volume);
  clearTimeout(rotate);
  rotate = window.setTimeout(() => {
    if (!music) return;
    music.stop(); music = null;
    const others = [-1, 0, 1, 2].filter(x => x !== song);
    playSong(others[Math.floor(Math.random() * others.length)]);
  }, SONG_MS);
}
function ac(): AudioContext | null {
  if (!enabled || volume <= 0) return null;
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; }
}
function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, glide?: number) {
  const a = ac(); if (!a) return;
  vol *= volume;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
/** A soft bell: gentle attack, long fade, no harsh edge. */
function bell(freq: number, dur: number, vol: number, delay = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * volume, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol: number, freq: number) {
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol * volume;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
export const sfx = {
  coin() { tone(1800, 0.12, 'triangle', 0.08); tone(2600, 0.1, 'triangle', 0.05, 0.05); },
  sell() { tone(1400, 0.1, 'triangle', 0.07); tone(2100, 0.14, 'triangle', 0.06, 0.06); tone(2900, 0.12, 'sine', 0.04, 0.12); },
  step() { noise(0.25, 0.12, 700); },
  sting() { bell(392, 0.7, 0.05); bell(311, 0.9, 0.04, 0.12); },
  boom() { noise(1.6, 0.3, 180); tone(55, 1.4, 'sine', 0.18, 0, 30); },
  page() { noise(0.12, 0.06, 2400); },
  bad() { bell(196, 0.4, 0.06); },
  heal() { bell(523, 1.2, 0.05); bell(659, 1.2, 0.045, 0.12); bell(784, 1.6, 0.04, 0.24); bell(1568, 1.4, 0.012, 0.3); },
};
export function startWind(intensity: number) {
  const a = ac(); if (!a) return;
  const level = 0.015 + intensity * 0.05;
  if (wind) { wind.level = level; wind.gain.gain.setTargetAtTime(level * volume, a.currentTime, 1.5); return; }
  const len = a.sampleRate * 4; const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < len; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) * 0.995; d[i] = last * 6; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.6;
  const g = a.createGain(); g.gain.value = level * volume;
  src.connect(f).connect(g).connect(a.destination); src.start();
  wind = { stop: () => src.stop(), gain: g, level };
}
export function stopWind() { try { wind?.stop(); } catch { /* already stopped */ } wind = null; }

/** The phone app going to the background (or coming back): silence everything, then pick up where it was. */
export function pauseAudio(paused: boolean) {
  if (!ctx) return;
  void (paused ? ctx.suspend() : ctx.resume()).catch(() => { /* context closed */ });
}
