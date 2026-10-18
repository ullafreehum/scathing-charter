// "Ash & Ebony" v3, still code only: drone, ash wind and crackle, chord pads, a recurring melody, a low horn, a distant gong, sparse chimes, optional heartbeat, one generated reverb.
// const s = createScore(ctx, ctx.destination); s.start(vol); s.setMood(0|1|2); s.setVolume(v); s.stop(). One score per start.
// Mood: 0 calm (before the eruption), 1 after Baar Dau (melody, horn, gong, rare heartbeat), 2 duel (heartbeat every two beats, more chimes and crackle).
export function createScore(ctx, out, { manual = false } = {}) {
  const hz = m => 440 * 2 ** ((m - 69) / 12);
  // [root midi, intervals]: Dm, Eb, Dm, C, Bb, A sus, Dm, Eb. D with a Phrygian second; every bass note is 55 Hz or higher.
  const CH = [[38, [0, 3, 7]], [39, [0, 4, 7]], [38, [0, 3, 7]], [36, [0, 4, 7]], [34, [0, 4, 7]], [33, [0, 5, 7]], [38, [0, 3, 7]], [39, [0, 4, 7]]];
  const CH2 = [[38, [0, 3, 7]], [34, [0, 4, 7]], [36, [0, 4, 7]], [33, [0, 5, 7]], [38, [0, 3, 7]], [41, [0, 4, 7]], [39, [0, 4, 7]], [38, [0, 3, 7]]]; // the second progression, every other 8 chords
  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const flt = (type, f, q = 1) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const bus = g(0), comp = ctx.createDynamicsCompressor(), send = g(0.5), conv = ctx.createConvolver(), wet = g(0.5);
  comp.threshold.value = -16; comp.ratio.value = 3; bus.connect(comp); comp.connect(out);
  const ir = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate); // a dark 4 s hall: decaying noise, smoothed
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let s = 0; for (let i = 0; i < d.length; i++) { s = 0.7 * s + 0.3 * (Math.random() * 2 - 1); d[i] = s * (1 - i / d.length) ** 3; } }
  conv.buffer = ir; send.connect(conv); conv.connect(wet); wet.connect(bus);
  const route = (n, pan = 0) => { const p = ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); p.connect(bus); p.connect(send); };
  const lp = flt('lowpass', 260, 1.2), dg = g(0.1), base = hz(CH[0][0]);
  const d = [osc('sine', base), osc('triangle', base * 2), osc('triangle', base * 2.006)];
  d.forEach(o => o.connect(lp)); lp.connect(dg); route(dg);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), ch = nb.getChannelData(0); let b = 0;
  for (let i = 0; i < ch.length; i++) { b = 0.98 * b + 0.02 * (Math.random() * 2 - 1); ch[i] = b * 6; }
  const wind = ctx.createBufferSource(), wf = flt('bandpass', 300, 2), wl = osc('sine', 0.07), wlg = g(150), wg = g(0.1);
  wind.buffer = nb; wind.loop = true; wl.connect(wlg); wlg.connect(wf.frequency); wind.connect(wf); wf.connect(wg); route(wg);
  const note = (f, t, dur, vel, type = 'sine', atk = 0.03, pan = 0) => {
    const o = osc(type, f), e = g(0.0001); o.connect(e); route(e, pan);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vel, t + atk); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
  };
  const pad = (f, t, dur) => { // two slightly detuned voices, the filter opens and closes over the chord
    const fl = flt('lowpass', 250), e = g(0.0001); fl.connect(e); route(e, Math.random() - 0.5);
    fl.frequency.setValueAtTime(250, t); fl.frequency.linearRampToValueAtTime(900, t + dur * 0.45); fl.frequency.linearRampToValueAtTime(250, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.045, t + dur * 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [-4, 4].forEach(c => { const o = osc('triangle', f); o.detune.value = c; o.connect(fl); o.start(t); o.stop(t + dur + 0.1); });
  };
  const horn = (f, t, dur) => { // a low brass-like swell
    const fl = flt('lowpass', 200), e = g(0.0001), o = osc('sawtooth', f); o.connect(fl); fl.connect(e); route(e);
    fl.frequency.setValueAtTime(200, t); fl.frequency.linearRampToValueAtTime(700, t + dur * 0.5); fl.frequency.linearRampToValueAtTime(200, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.03, t + dur * 0.5); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o.stop(t + dur + 0.1);
  };
  const gong = (f, t) => [1, 2.76, 5.4].forEach((m, i) => note(f * m, t, 9 - i * 2, 0.035 / (i + 1), 'sine', 0.01, 0.3)); // inharmonic partials
  const crackle = t => { const s = ctx.createBufferSource(), h = flt('highpass', 2500), e = g(0.02); s.buffer = nb; s.connect(h); h.connect(e); route(e, Math.random() * 2 - 1);
    e.gain.setValueAtTime(0.02, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.start(t, Math.random() * 2, 0.06); };
  const pulse = (t, v) => { const o = osc('sine', 90), e = g(v); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(e); route(e); o.start(t); o.stop(t + 0.6); };
  let step = 0, mood = 0, timer = 0;
  const live = [...d, wind, wl];
  const tick = t => { // one beat, 1.5 s; a chord lasts eight beats
    const beat = step % 8, n = (step >> 3) % 8, [root, iv] = ((step >> 6) & 1 ? CH2 : CH)[n];
    if (!beat) {
      const r = hz(root); d[0].frequency.exponentialRampToValueAtTime(r, t + 3); d[1].frequency.exponentialRampToValueAtTime(r * 2, t + 3); d[2].frequency.exponentialRampToValueAtTime(r * 2.006, t + 3);
      iv.forEach(i => pad(hz(root + 12 + i), t, 12));
      if (mood > 0 && !(n % 2)) horn(hz(root + 12), t + 0.5, 11);
      if (mood > 0 && n == 4) gong(hz(root + 24), t + 0.2);
      if (mood > 0 && n % 2) [0, 2, 1].forEach((k, j) => note(hz(root + 36 + iv[k]), t + 2 + j * 1.7, 5, 0.05, 'triangle', 0.03, j - 1)); // the melody: three chord tones, every other chord
    }
    if (Math.random() < [0.2, 0.3, 0.5][mood]) note(hz(root + 36 + iv[Math.random() * 3 | 0] + 12 * (Math.random() < 0.4)), t + Math.random(), 4, 0.04, 'sine', 0.02, Math.random() * 1.4 - 0.7);
    for (let k = 0, c = [1, 2, 4][mood]; k < c; k++) if (Math.random() < 0.6) crackle(t + Math.random() * 1.5);
    if (mood == 1 && beat % 4 == 0) { pulse(t, 0.1); pulse(t + 0.36, 0.06); }
    if (mood == 2 && beat % 2 == 0) { pulse(t, 0.14); pulse(t + 0.33, 0.08); }
    step++;
  };
  return {
    tick,
    start(vol = 0.4) { live.forEach(o => o.start()); bus.gain.setTargetAtTime(vol, ctx.currentTime, 1.5); if (!manual) { tick(ctx.currentTime + 0.05); timer = setInterval(() => ctx.state == 'running' && tick(ctx.currentTime + 0.05), 1500); } },
    setVolume(v) { bus.gain.setTargetAtTime(v, ctx.currentTime, 0.3); },
    setMood(m) { mood = m; },
    stop() { clearInterval(timer); bus.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(() => { live.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }); bus.disconnect(); }, 3000); },
  };
}
