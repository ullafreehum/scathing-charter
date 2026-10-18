// "Ash & Ebony" songs 2-4, code only, same API and sound world as ash-and-ebony-lean.js: 0 "Salt & Silt" (warm, rocking harp), 1 "Red Mountain Procession" (slow march, horns, chant), 2 "Ghostgate Vigil" (sparse glass bells, ghost wind).
// const s = createScore(ctx, ctx.destination, { song: 0|1|2 }); s.start(vol); s.setMood(0|1|2); s.setVolume(v); s.stop(). One score per start; moods as in the original (0 calm, 1 after Baar Dau, 2 duel).
// To rotate: play ash-and-ebony-lean.js first, then every ~5 min stop() one score and start() the next (start fades in over 1.5 s, stop fades out over 0.5 s), pick a random song that isn't the one just heard, and pass the current mood to the new score with setMood(). Every bass note is 55 Hz or higher.
export const SONGS = ['Salt & Silt', 'Red Mountain Procession', 'Ghostgate Vigil'];
export function createScore(ctx, out, { manual = false, song = 0 } = {}) {
  const hz = m => 440 * 2 ** ((m - 69) / 12), rnd = Math.random;
  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const flt = (type, f, q = 1) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const bus = g(0), comp = ctx.createDynamicsCompressor(), send = g(0.5), conv = ctx.createConvolver(), wet = g(0.5);
  comp.threshold.value = -16; comp.ratio.value = 3; bus.connect(comp); comp.connect(out);
  const ir = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate); // a dark 4 s hall: decaying noise, smoothed
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 0; for (let i = 0; i < d.length; i++) { s = 0.7 * s + 0.3 * (rnd() * 2 - 1); d[i] = s * (1 - i / d.length) ** 3; } }
  conv.buffer = ir; send.connect(conv); conv.connect(wet); wet.connect(bus);
  const route = (n, pan = 0) => { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); p.connect(bus); p.connect(send); };
  const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), ch = nb.getChannelData(0); let b0 = 0;
  for (let i = 0; i < ch.length; i++) { b0 = 0.98 * b0 + 0.02 * (rnd() * 2 - 1); ch[i] = b0 * 6; }
  const note = (f, t, dur, vel, type = 'sine', atk = 0.03, pan = 0) => {
    const o = osc(type, f), e = g(0.0001); o.connect(e); route(e, pan);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vel, t + atk); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
  };
  const pad = (f, t, dur, v) => { // two slightly detuned voices, the filter opens and closes over the chord
    const fl = flt('lowpass', 250), e = g(0.0001); fl.connect(e); route(e, rnd() - 0.5);
    fl.frequency.setValueAtTime(250, t); fl.frequency.linearRampToValueAtTime(900, t + dur * 0.45); fl.frequency.linearRampToValueAtTime(250, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v, t + dur * 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [-4, 4].forEach(c => { const o = osc('triangle', f); o.detune.value = c; o.connect(fl); o.start(t); o.stop(t + dur + 0.1); });
  };
  const horn = (f, t, dur, v = 0.03) => { // a low brass-like swell
    const fl = flt('lowpass', 200), e = g(0.0001), o = osc('sawtooth', f); o.connect(fl); fl.connect(e); route(e);
    fl.frequency.setValueAtTime(200, t); fl.frequency.linearRampToValueAtTime(700, t + dur * 0.5); fl.frequency.linearRampToValueAtTime(200, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v, t + dur * 0.5); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.1);
  };
  const choir = (f, t, dur) => { // a sawtooth through two vowel formants with a slow vibrato
    const o = osc('sawtooth', f), v = osc('sine', 5), vg = g(f * 0.01), e = g(0.0001); v.connect(vg); vg.connect(o.frequency);
    [650, 1080].forEach(c => { const fl = flt('bandpass', c, 5); o.connect(fl); fl.connect(e); }); route(e, rnd() - 0.5);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.1, t + dur * 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1); v.start(t); v.stop(t + dur + 0.1);
  };
  const bell = (f, t, v, pan) => [1, 2.01, 3.99, 5.43].forEach((m, i) => note(f * m, t, 7 - i * 1.5, v / (1 + i * 1.5), 'sine', 0.004, pan)); // glassy partials
  const breath = (f, t, dur, pan) => { // wind that whistles on one pitch
    const s = ctx.createBufferSource(), fl = flt('bandpass', f, 25), e = g(0.0001); s.buffer = nb; s.loop = true; s.connect(fl); fl.connect(e); route(e, pan);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.6, t + dur * 0.5); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t, rnd() * 2); s.stop(t + dur + 0.1);
  };
  const gong = (f, t) => [1, 2.76, 5.4].forEach((m, i) => note(f * m, t, 9 - i * 2, 0.035 / (i + 1), 'sine', 0.01, 0.3)); // inharmonic partials
  const crackle = t => { const s = ctx.createBufferSource(), h = flt('highpass', 2500), e = g(0.02); s.buffer = nb; s.connect(h); h.connect(e); route(e, rnd() * 2 - 1);
    e.gain.setValueAtTime(0.02, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.start(t, rnd() * 2, 0.06); };
  const thump = (t, v, f = 110) => { const o = osc('sine', f), e = g(0.0001); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f / 2, t + 0.3);
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.8); o.connect(e); route(e); o.start(t); o.stop(t + 0.9); }; // a frame drum / heartbeat
  let step = 0, mood = 0, timer = 0;
  const Q = [{ // 0 Salt & Silt: A Dorian, 6/8 rocking harp over a surf-like swell
    beat: 1.2, len: 6, dr: ['sine', 'triangle', 'triangle'], lp: 300, dv: 0.09, pv: 0.04, wind: ['lowpass', 500, 0.7, 0.09, 300, 0.09], hb: 1, gong: 1, mh: 1,
    A: [[45, [0, 3, 7]], [38, [0, 4, 7]], [43, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]], [45, [0, 3, 7]], [40, [0, 3, 7]]], // Am D G Am F G Am Em
    B: [[38, [0, 4, 7]], [45, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]], [38, [0, 4, 7]], [45, [0, 3, 7]], [40, [0, 3, 7]], [45, [0, 7, 12]]], // D Am F G D Am Em A
    play(t, b, n, root, iv) {
      const f = hz(root + 24 + iv[[0, 1, 2, 1, 2, 1][b]]), p = (b - 2.5) / 5;
      if (!(b % 3) || mood || rnd() < 0.6) { note(f, t, 2.4, b % 3 ? 0.04 : 0.06, 'triangle', 0.005, p); note(f * 2, t, 1.2, 0.012, 'sine', 0.005, p); }
      if (!b && mood && n % 2) [2, 1, 0, 1].forEach((k, j) => note(hz(root + 36 + iv[k]), t + 1 + j * 1.5, 3, 0.04, 'sine', 0.05, j / 3 - 0.5)); // a slow tune above the harp
      if (rnd() < [0.1, 0.2, 0.3][mood]) note(hz(root + 36 + iv[rnd() * 3 | 0]), t + rnd(), 4, 0.03, 'sine', 0.02, rnd() * 1.4 - 0.7);
    } }, { // 1 Red Mountain Procession: E Phrygian climbing to C, frame drum, horn calls, chant
    beat: 0.9, len: 8, dr: ['sine', 'sawtooth', 'triangle'], lp: 220, dv: 0.1, pv: 0.04, wind: ['bandpass', 200, 1, 0.05, 100, 0.07], hb: 0, gong: 1, mh: 0,
    A: [[40, [0, 3, 7]], [41, [0, 4, 7]], [40, [0, 3, 7]], [38, [0, 4, 7]], [40, [0, 3, 7]], [41, [0, 4, 7]], [43, [0, 4, 7]], [40, [0, 5, 7]]], // Em F Em D Em F G Esus
    B: [[36, [0, 4, 7]], [38, [0, 3, 7]], [40, [0, 3, 7]], [41, [0, 4, 7]], [36, [0, 4, 7]], [38, [0, 3, 7]], [40, [0, 3, 7]], [40, [0, 5, 7]]], // C Dm Em F C Dm Em Esus
    play(t, b, n, root, iv) {
      if (!b) thump(t, 0.3); else if (b == 4) thump(t, mood ? 0.22 : 0.12);
      if (mood && !(b % 2) && b % 4) thump(t, 0.1, 150);
      if (mood == 2 && b == 7) { thump(t, 0.12, 150); thump(t + 0.45, 0.1, 150); }
      if (!b) { horn(hz(root), t, 7.5); if (mood) horn(hz(root + 7), t + 0.2, 7, 0.02); if (mood && !(n % 2)) choir(hz(root + 24), t + 0.5, 6); }
      if (b == 2 && (n % 2 || mood) && (mood || n % 4 == 1)) [0, 1, 2].forEach(k => horn(hz(root + 12 + iv[k]), t + k * 1.6, 3.5)); // the call: three chord tones climbing
      if (rnd() < [0.1, 0.15, 0.2][mood]) note(hz(root + 36 + iv[rnd() * 3 | 0]), t + rnd() * 0.8, 4, 0.03, 'sine', 0.02, rnd() * 1.4 - 0.7);
    } }, { // 2 Ghostgate Vigil: open modal chords, glass bells, one whistling wind, long silences
    beat: 1.5, len: 8, dr: ['sine', 'sine', 'triangle'], lp: 240, dv: 0.07, pv: 0.035, wind: ['bandpass', 900, 6, 0.04, 500, 0.05], hb: 1, gong: 1, mh: 0,
    A: [[36, [0, 7, 11]], [33, [0, 7, 10]], [41, [0, 7, 11]], [43, [0, 2, 7]], [36, [0, 7, 11]], [33, [0, 7, 10]], [41, [0, 7, 11]], [43, [0, 7, 12]]], // C A F G, no thirds
    B: [[39, [0, 7, 11]], [34, [0, 7, 11]], [44, [0, 7, 11]], [34, [0, 2, 7]], [39, [0, 7, 11]], [42, [0, 7, 11]], [44, [0, 7, 11]], [39, [0, 7, 12]]], // Eb Bb Ab Bb Eb Gb Ab Eb
    play(t, b, n, root, iv) {
      if (!b) breath(hz(root + 36 + iv[1]), t, 10, -0.4);
      if (b == 4 && mood) breath(hz(root + 48 + iv[2]), t + 0.5, 8, 0.4);
      if (!b && mood && n % 2) [2, 1, 0, 1].forEach((k, j) => bell(hz(root + 48 + iv[k]), t + 1 + j * 0.9, 0.03, j / 2 - 0.7)); // a music-box phrase, falling
      if (rnd() < [0.3, 0.45, 0.6][mood]) bell(hz(root + 36 + iv[rnd() * 3 | 0] + 12 * (rnd() < 0.5)), t + rnd() * 1.2, 0.035, rnd() * 1.6 - 0.8);
    } }][song % 3];
  const lp = flt('lowpass', Q.lp, 1.2), dg = g(Q.dv), base = hz(Q.A[0][0]);
  const d = Q.dr.map((ty, i) => osc(ty, base * [1, 2, 2.006][i]));
  d.forEach(o => o.connect(lp)); lp.connect(dg); route(dg);
  const [wt, wfq, wq, wr, wd, wv] = Q.wind, wind = ctx.createBufferSource(), wf = flt(wt, wfq, wq), wl = osc('sine', wr), wlg = g(wd), wlg2 = g(wv * 0.8), wg = g(wv);
  wind.buffer = nb; wind.loop = true; wl.connect(wlg); wlg.connect(wf.frequency); wl.connect(wlg2); wlg2.connect(wg.gain); wind.connect(wf); wf.connect(wg); route(wg); // the wind swells and fades like breathing
  const live = [...d, wind, wl];
  const tick = t => { // one beat; a chord lasts len beats, a progression 8 chords, then the second progression
    const L = Q.len, beat = step % L, n = (step / L | 0) % 8, [root, iv] = ((step / L / 8 | 0) & 1 ? Q.B : Q.A)[n];
    if (!beat) {
      const r = hz(root); d.forEach((o, i) => o.frequency.exponentialRampToValueAtTime(r * [1, 2, 2.006][i], t + 3));
      iv.forEach(i => pad(hz(root + 12 + i), t, L * Q.beat, Q.pv));
      if (mood && Q.mh && !(n % 2)) horn(hz(root + 12), t + 0.5, L * Q.beat - 1);
      if (mood && Q.gong && n == 4) gong(hz(root + 24), t + 0.2);
    }
    Q.play(t, beat, n, root, iv);
    for (let k = 0, c = [1, 2, 4][mood]; k < c; k++) if (rnd() < 0.6) crackle(t + rnd() * Q.beat);
    if (Q.hb && mood == 1 && beat % 4 == 0) { thump(t, 0.1, 90); thump(t + 0.36, 0.06, 90); }
    if (Q.hb && mood == 2 && beat % 2 == 0) { thump(t, 0.14, 90); thump(t + 0.33, 0.08, 90); }
    step++;
  };
  return {
    tick,
    start(vol = 0.4) { live.forEach(o => o.start()); bus.gain.setTargetAtTime(vol, ctx.currentTime, 1.5); if (!manual) { tick(ctx.currentTime + 0.05); timer = setInterval(() => ctx.state == 'running' && tick(ctx.currentTime + 0.05), Q.beat * 1000); } },
    setVolume(v) { bus.gain.setTargetAtTime(v, ctx.currentTime, 0.3); },
    setMood(m) { mood = m; },
    stop() { clearInterval(timer); bus.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(() => { live.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }); bus.disconnect(); }, 3000); },
  };
}
