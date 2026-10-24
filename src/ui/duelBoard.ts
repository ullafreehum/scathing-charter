// The magistrate's hearing as a Pixi board (Sorcerer's "Oblivion Wager" v10 design, ported from
// /mnt/project-files/duel-prototype). Playback only: the engine's duelTurn() decides every move and records
// it in DuelState.events; this board animates those events. Loaded lazily by Duel.tsx, which falls back to
// its plain board if this fails. Colours are the duel art's own fixed palette (one dark look in every theme).
// Particles use Math.random: they are decoration, never game state.
import * as PIXI from 'pixi.js';
import { DUEL, DUEL_CARD, DUEL_SHORT, RES_NAME, canPlay, type DuelEvent, type DuelSide, type DuelState, type Res } from '../engine';
import { duelSfx, sfx } from '../audio/sfx';
import { buzz } from './phone';
import { DUR, ease } from './motion';

const ART = {
  ...import.meta.glob<string>('../assets/duel/*.svg', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../assets/duel/*.png', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../assets/duel/cards/*.svg', { eager: true, query: '?url', import: 'default' }),
  ...import.meta.glob<string>('../assets/duel/cards-painted/*.jpg', { eager: true, query: '?url', import: 'default' }),
};
const keyOf = (path: string) => (path.includes('/cards-painted/') ? 'paint-' : path.includes('/cards/') ? 'art-' : '') + path.split('/').pop()!.replace(/\.(svg|jpg|png)$/, '');

// The duel's beat in ms at Normal speed (Sorcerer's 0.11 duel plan, handoff/0.11-motion.md section 5). Fast halves it,
// Skip makes it instant. Under Reduce motion every move is instant but the reading pauses stay.
const BEAT = {
  think: 600,           // the rival's card back waits beside their panel (never under 300 ms)
  backIn: 220,          // the card back slides in
  flip: 110,            // each half of the flip
  arc: 320,             // a card arcs to the centre stage
  settle: 80,           // and lands
  readYou: 260,         // your card holds there before its effect travels
  readFoe: 400,         // the rival's holds longer: you didn't choose it
  streak: 140,          // the ember streak from the card to the target
  wallFirst: 80,        // damage through the wall reaches the tower this much later
  flash: 220, sink: 140, rim: 220,
  tower: DUR.slow * 1000, // a tower or wall grows or shrinks to its new height (its number counts with it)
  count: DUR.slow * 1000, // resource numbers count to their new value
  glow: 220,            // the resource row glows behind a change
  out: DUR.fast * 1000, // the card leaves
  hand: 220,            // the hand closes the gap, then opens it for the new card
  lift: DUR.fast * 1000, // a card lifts or settles
  income: 420,
  end: 400, dim: DUR.slow * 1000,
} as const;
const W = 1280, H = 720, GROUND = 462, TRAY = 500, CARD_W = 240, CARD_H = 340;
/** The picture window in card-frame.svg (the paintings are twice this size). */
const ART_WIN = { x: 12, y: 44, w: 216, h: 176 } as const;
const C = { text: 0xf3ebdb, muted: 0xd6c8b4, gold: 0xefc86f, good: 0xa6d884, bad: 0xff8576 };
const RES: readonly Res[] = ['stone', 'steel', 'magicka'];
const GEN = { stone: 'masons', steel: 'soldiers', magicka: 'mages' } as const;
const GEN_NAME: Record<string, string> = { masons: 'Stone income', soldiers: 'Troop income', mages: 'Magic income' };
const ICON: Record<Res, string> = { stone: 'cost-ebony', steel: 'cost-bindings', magicka: 'cost-magicka' };
/** The panels' and banner's frame: a 2 px bronze line, a faint light on the top half, a thin inner line in `inner`. */
function frame(g: PIXI.Graphics, x: number, y: number, w: number, h: number, r: number, inner: number, alpha = 0.35) {
  g.beginFill(0x0f0c0b, 0.8).lineStyle(2, 0x6b5636, 1).drawRoundedRect(x, y, w, h, r).endFill();
  g.lineStyle(0).beginFill(0xffffff, 0.045).drawRoundedRect(x + 3, y + 3, w - 6, h * 0.45, Math.max(2, r - 3)).endFill();
  g.lineStyle(1, inner, alpha).drawRoundedRect(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3));
}
/** A vertical gradient as a sprite (Pixi 7 has no gradient fills). */
function vgrad(w: number, h: number, stops: [number, string][]) {
  const c = document.createElement('canvas'); c.width = 2; c.height = Math.max(2, Math.round(h));
  const x = c.getContext('2d'); if (x) { const g = x.createLinearGradient(0, 0, 0, c.height); for (const [o, col] of stops) g.addColorStop(o, col); x.fillStyle = g; x.fillRect(0, 0, 2, c.height); }
  const s = new PIXI.Sprite(PIXI.Texture.from(c)); s.width = w; s.height = h; return s;
}
const BODY = "'Atkinson Hyperlegible', 'Segoe UI', Verdana, sans-serif", DISPLAY = 'Cinzel, Georgia, serif';
type Who = 'you' | 'foe';
type Field = 'tower' | 'wall';
type Move = Extract<DuelEvent, { type: 'move' }>;

// Textures are made once and kept for later hearings: SVG icons rasterised at twice their size (sharp at 4K); the paintings
// and the tower and wall PNGs are already at display size and load as they are.
const TEX: Record<string, PIXI.Texture> = {};
let loading: Promise<void> | null = null;
function loadTextures(): Promise<void> {
  return (loading ??= Promise.all(Object.entries(ART).map(([path, url]) => new Promise<void>(res => {
    if (/\/(spire|ward)\.svg$/.test(path)) { res(); return; } // the board draws the PNGs
    const img = new Image();
    img.onload = () => {
      if (!path.endsWith('.svg')) { TEX[keyOf(path)] = PIXI.Texture.from(img); res(); return; }
      const x = 2, cv = document.createElement('canvas'); cv.width = img.width * x; cv.height = img.height * x;
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height); TEX[keyOf(path)] = PIXI.Texture.from(cv); res();
    };
    img.onerror = () => res(); img.src = url;
  }))).then(() => undefined));
}
// A card's painting if it has one, else its own icon, else the art it shares.
const artKey = (id: string) => (TEX['paint-' + id] ? 'paint-' + id : TEX['art-' + id] ? 'art-' + id : 'art-' + DUEL_CARD[id].art);
const sprite = (k: string, w: number, h: number) => { const s = new PIXI.Sprite(TEX[k] ?? PIXI.Texture.WHITE); s.width = w; s.height = h; return s; };
const txt = (s: string, o: Partial<PIXI.ITextStyle>) => new PIXI.Text(s, { fontFamily: BODY, fontSize: 19, fill: C.text, ...o });
const clone = (x: DuelSide): DuelSide => ({ ...x, hand: [...x.hand] });

interface Tower { box: PIXI.Container; body: PIXI.Container; label: PIXI.Text; cracks: PIXI.Graphics; flash: PIXI.Graphics; tw: number; th: number; shown: number; crackList: number[][][]; name: string; hFor(v: number): number; render(): void }
interface Panel { node: PIXI.Container; update(s: DuelSide, instant?: boolean): void; rowPos(r: Res): { x: number; y: number } }
interface Tween { o: Record<string, number>; from: Record<string, number>; to: Record<string, number>; dur: number; t: number; e: (t: number) => number; res: () => void }
interface Particle { g: PIXI.Graphics; vx: number; vy: number; grav: number; life: number; max: number; spin: number }

export interface BoardOptions {
  /** Plays hand[i] (or discards it) through the game; returns the hearing after the turn, or null if refused. */
  pick(i: number, discard: boolean): DuelState | null;
  /** The board finished playing a turn back. */
  settled(d: DuelState): void;
  /** Discard mode was switched off by playing a card. */
  discardOff(): void;
  /** False with the Animations setting off or reduced motion: everything happens at once and nothing drifts. */
  motion: boolean;
  /** The phone: a tap selects a card and shows it big, a second tap (or the page's Play button) plays it; bigger type, short names
   *  in the hand, and the canvas renders at screen size. */
  touch?: boolean;
  /** The phone: the selected card and whether a turn is playing, for the page's Play and Discard buttons. */
  state?(sel: number | null, busy: boolean): void;
}

export class DuelBoard {
  private app: PIXI.Application;
  private root = new PIXI.Container();
  private fx = new PIXI.Container();
  private floats = new PIXI.Container();
  private ambient = new PIXI.Container();
  private tweens = new Set<Tween>();
  private parts: Particle[] = [];
  private live: { t: PIXI.Text; x: number; y0: number }[] = [];
  private history: string[] = [];
  private duel!: DuelState;
  private busy = false; private rush = false; private discard = false;
  private speed = 1; private still: boolean; // still = Reduce motion: moves are instant, reading pauses stay
  private shadowTex!: PIXI.Texture; private turnShown = '';
  private lift: ((on: boolean) => void)[] = [];
  private picked: number | null = null; private pickedAt = 0;
  private ro: ResizeObserver;
  private v!: { yS: Tower; yW: Tower; fS: Tower; fW: Tower; yP: Panel; fP: Panel; circle: PIXI.Container; hand: PIXI.Container; preview: PIXI.Container; stageCard: PIXI.Container; banner: PIXI.Container; bannerGlow: PIXI.Graphics; bannerBg: PIXI.Graphics; bannerText: PIXI.Text; log: PIXI.Text; logBg: PIXI.Graphics };

  private constructor(host: HTMLElement, private opts: BoardOptions) {
    this.still = !opts.motion;
    this.app = new PIXI.Application({ width: W, height: H, backgroundColor: 0x0f0c0b, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
    const view = this.app.view as HTMLCanvasElement;
    view.style.width = '100%'; view.style.height = '100%'; view.style.display = 'block';
    host.appendChild(view);
    view.addEventListener('pointerdown', () => { if (this.busy) this.rush = true; });
    this.ro = new ResizeObserver(([e]) => {
      const f = e.contentRect.width / W, r = Math.min(opts.touch ? 2 : 3, (window.devicePixelRatio || 1) * (opts.touch ? f : Math.max(1, f))); // the phone: screen pixels, at most 2x
      if (Math.abs(r - this.app.renderer.resolution) > 0.05) { this.app.renderer.resolution = r; this.app.renderer.resize(W, H); view.style.width = '100%'; view.style.height = '100%'; } // autoDensity resets the size to 1280×720 px
    });
    this.ro.observe(host);
    this.app.stage.addChild(this.root);
    if (opts.touch) { // a tap off the cards puts the shown card back
      this.app.stage.eventMode = 'static'; this.app.stage.hitArea = new PIXI.Rectangle(0, 0, W, H);
      this.app.stage.on('pointertap', () => this.highlight(null));
    }
    this.app.ticker.add(() => this.stepTweens());
    this.app.ticker.add(d => this.stepParticles(d));
  }

  static async create(host: HTMLElement, d: DuelState, opts: BoardOptions): Promise<DuelBoard> {
    try { await Promise.race([Promise.all([document.fonts.load(`700 20px Cinzel`), document.fonts.load(`20px "Atkinson Hyperlegible"`), document.fonts.load(`700 20px "Atkinson Hyperlegible"`)]), new Promise(r => setTimeout(r, 2500))]); } catch { /* fonts are optional */ }
    await loadTextures();
    const b = new DuelBoard(host, opts);
    b.startAmbient(); b.start(d);
    return b;
  }

  destroy() { this.ro.disconnect(); this.app.destroy(true, { children: true }); }
  setSpeed(x: number) { this.speed = x; }
  setDiscard(on: boolean) { this.discard = on; if (!this.busy) this.layoutHand(); }
  /** Keyboard and screen-reader players pick through buttons outside the canvas. */
  play(i: number) { const c = this.v.hand.children[i]; if (c) void this.onCard(i, c as PIXI.Container); }
  /** Lifts the card whose button has keyboard focus (null: none). */
  highlight(i: number | null) {
    this.picked = i; this.lift.forEach((f, k) => { if (k !== i) f(false); }); if (i !== null) this.lift[i]?.(true); // lift last: putting a card down clears the preview
    this.opts.state?.(i, this.busy);
  }
  /** The phone's Discard button: throws the selected card away. */
  discardAt(i: number) { const c = this.v.hand.children[i]; if (c && !this.busy) { this.discard = true; void this.onCard(i, c as PIXI.Container); } }

  // ---------------------------------------------------------------- tweens and particles
  private stepTweens() {
    const dt = this.app.ticker.deltaMS;
    for (const tw of this.tweens) {
      tw.t += this.rush ? 1e9 : dt; const p = Math.min(1, tw.t / tw.dur), k = tw.e(p);
      for (const key in tw.to) tw.o[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * k;
      if (p >= 1) { this.tweens.delete(tw); tw.res(); }
    }
  }
  /** A move (instant under Reduce motion) or, with `pause`, reading time (kept under Reduce motion). Both follow Speed. */
  private tween(o: object, to: Record<string, number>, ms: number, e: (t: number) => number = ease, pause = false): Promise<void> {
    const obj = o as Record<string, number>;
    return new Promise(res => {
      const from: Record<string, number> = {}; for (const k in to) from[k] = obj[k];
      const dur = this.rush || (this.still && !pause) ? 0 : ms * this.speed; if (dur <= 0) { Object.assign(obj, to); return res(); }
      this.tweens.add({ o: obj, from, to, dur, t: 0, e, res });
    });
  }
  private wait(ms: number) { return this.tween({ v: 0 }, { v: 1 }, ms, ease, true); }
  /** The rival's think pause: 600 ms at Normal, never under 300 (300 under Reduce motion), none at Skip. */
  private think() { const ms = this.speed === 0 ? 0 : this.still ? 300 : Math.max(300, BEAT.think * this.speed); return this.wait(this.speed ? ms / this.speed : 0); }
  /** Stops the tweens moving these keys of `o` where they are (a new one takes over). */
  private stop(o: object, keys: string[]) { for (const tw of this.tweens) if (tw.o === o && keys.some(k => k in tw.to)) { this.tweens.delete(tw); tw.res(); } }
  /** A card travels on a shallow arc (60 units above the straight line), scaling and straightening as it goes. */
  private arc(o: PIXI.Container, x1: number, y1: number, s1: number, ms: number) {
    const x0 = o.x, y0 = o.y, s0 = o.scale.x, r0 = o.rotation, p = { v: 0 };
    const tick = () => { const t = p.v; o.position.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 240 * t * (1 - t)); o.scale.set(s0 + (s1 - s0) * t); o.rotation = r0 * (1 - t); };
    this.app.ticker.add(tick);
    return this.tween(p, { v: 1 }, ms).then(() => { this.app.ticker.remove(tick); p.v = 1; tick(); });
  }
  /** Damage on its way: a short line of embers from the card to the target. */
  private streak(x0: number, y0: number, x1: number, y1: number, ms: number) {
    const p = { v: 0 }; let last = 0;
    const tick = () => { if (p.v - last < 0.12) return; last = p.v; this.burst(x0 + (x1 - x0) * p.v, y0 + (y1 - y0) * p.v, 3, 'spark'); };
    this.app.ticker.add(tick);
    return this.tween(p, { v: 1 }, ms).then(() => { this.app.ticker.remove(tick); });
  }
  private burst(x: number, y: number, n: number, kind: 'spark' | 'debris' | 'ash') {
    if (!this.opts.motion) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const g = new PIXI.Graphics();
      const col = kind === 'spark' ? [0xffd27a, 0xff9a57, 0xff6a1a][i % 3] : kind === 'debris' ? [0x2a1f1a, 0x4a3a31, 0x1b1411][i % 3] : 0x8a8078;
      const r = kind === 'debris' ? 3 + Math.random() * 5 : kind === 'ash' ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2;
      if (kind === 'debris') g.beginFill(col).drawRect(-r, -r, r * 2, r * 1.4).endFill(); else g.beginFill(col).drawCircle(0, 0, r).endFill();
      g.x = x; g.y = y; g.alpha = kind === 'ash' ? 0.7 : 1;
      const a = Math.random() * Math.PI * 2, v = kind === 'spark' ? 2 + Math.random() * 6 : kind === 'debris' ? 1 + Math.random() * 4 : 0.3 + Math.random();
      const life = kind === 'ash' ? 120 : 50 + Math.random() * 30;
      this.parts.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'ash' ? 1 : 2), grav: kind === 'ash' ? -0.01 : kind === 'debris' ? 0.35 : 0.15, life, max: life, spin: (Math.random() - 0.5) * 0.3 });
      this.fx.addChild(g);
    }
  }
  private stepParticles(d: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.g.x += p.vx * d; p.g.y += p.vy * d; p.vy += p.grav * d; p.g.rotation += p.spin * d; p.life -= d;
      p.g.alpha = Math.max(0, p.life / p.max);
      if (p.g.y > GROUND + 4 && p.grav > 0.2) { p.vy *= -0.3; p.vx *= 0.6; p.g.y = GROUND + 4; }
      if (p.life <= 0) { p.g.destroy(); this.parts.splice(i, 1); }
    }
  }
  private startAmbient() {
    if (!this.opts.motion) return;
    const drift: { g: PIXI.Graphics; v: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const g = new PIXI.Graphics(), ember = i % 5 === 0;
      g.beginFill(ember ? 0xff9a4a : 0x9a9088).drawCircle(0, 0, ember ? 1.6 : 1.2 + Math.random() * 1.6).endFill();
      g.x = Math.random() * W; g.y = Math.random() * GROUND; g.alpha = ember ? 0.8 : 0.35; this.ambient.addChild(g); drift.push({ g, v: 0.2 + Math.random() * 0.5 });
    }
    this.app.ticker.add(d => { for (const { g, v } of drift) { g.y += v * d; g.x += Math.sin((g.y + v * 999) / 60) * 0.3 * d; if (g.y > GROUND) { g.y = -5; g.x = Math.random() * W; } } });
  }
  // Floating change labels ("Tower −6"); labels on the same spot stack downwards.
  private floatText(x: number, y: number, label: string, good: boolean) {
    this.live = this.live.filter(f => !f.t.destroyed);
    // Floats that would overlap stack downwards; on the phone (rows closer, buttons below) a float on the same row goes beside the last one, towards the middle.
    const touch = !!this.opts.touch, near = this.live.filter(f => Math.abs(f.x - x) < 70 && Math.abs(f.y0 - y) < (touch ? 13 : 60));
    const x0 = x; if (!touch) y += 30 * near.length;
    const t = txt(label, { fontSize: 27, fontWeight: '700', fill: good ? C.good : C.bad, stroke: 0x0f0c0b, strokeThickness: 7, dropShadow: true, dropShadowColor: 0x000000, dropShadowBlur: 4, dropShadowDistance: 2, dropShadowAlpha: 0.9 });
    const last = touch ? near.at(-1) : undefined;
    if (last) x = last.t.x + (x0 < W / 2 ? 1 : -1) * (last.t.width / 2 + 12 + t.width / 2);
    t.anchor.set(0.5); t.x = x; t.y = y; this.floats.addChild(t); this.live.push({ t, x: x0, y0: y });
    // The number pops (1.3 to 1 in 140 ms), then rises 30 and fades over 700 ms.
    const start = performance.now(), move = this.opts.motion; if (move) t.scale.set(1.3);
    const tick = () => {
      const e = performance.now() - start, q = Math.max(0, (e - 140) / 700);
      if (move) t.scale.set(1.3 - 0.3 * ease(Math.min(1, e / 140)));
      t.y = y - (move ? 30 * ease(Math.min(1, q)) : 0); t.alpha = q < 0.5 ? 1 : Math.max(0, 1 - (q - 0.5) / 0.5);
      if (q >= 1) { this.app.ticker.remove(tick); t.destroy(); }
    };
    this.app.ticker.add(tick);
  }

  // ---------------------------------------------------------------- towers
  private makeTower(kind: 'spire' | 'ward', x: number, side: Who): Tower {
    const hue = side === 'you' ? C.gold : 0xd8452f; // gold for you, Imperial red for the rival
    const isSpire = kind === 'spire', tw = isSpire ? 104 : 64, th = isSpire ? 410 : 240, crown = isSpire ? 100 : 24;
    const box = new PIXI.Container(); box.x = x;
    const body = new PIXI.Container();
    if (TEX[kind]) { const spr = sprite(kind, tw, th); spr.x = -tw / 2; body.addChild(spr); }
    else body.addChild(new PIXI.Graphics().beginFill(0x4d3d34).drawRect(-tw / 2, 0, tw, th).endFill().lineStyle(3, C.gold).moveTo(-tw / 2, 2).lineTo(tw / 2, 2)); // no texture: plain stone, never a blank box
    const cracks = new PIXI.Graphics(); body.addChild(cracks);
    const flash = new PIXI.Graphics(); flash.beginFill(0xff6040).drawRect(-tw / 2, 0, tw, th).endFill(); flash.alpha = 0; body.addChild(flash);
    const mask = new PIXI.Graphics(); mask.beginFill(0xffffff).drawRect(-tw, GROUND - th - 60, tw * 2, th + 60).endFill();
    body.mask = mask; box.addChild(body, mask);
    const plaque = new PIXI.Graphics(); plaque.beginFill(0x0f0c0b, 0.88).lineStyle(2, hue).drawRoundedRect(-56, GROUND + 5, 112, 30, 6).endFill(); box.addChild(plaque);
    const label = txt('', { fontSize: this.opts.touch ? 22 : 19, fontWeight: '700' }); label.anchor.set(0.5, 0.5); label.y = GROUND + 20; box.addChild(label);
    const hFor = (v: number) => (v <= 0 ? 0 : Math.min(th, crown + v * 3)); // the same 3px a point on both sides
    if (isSpire) {
      // The goal line where the crown's tip sits at 100, labelled at the inner end; a banner says whose tower it is.
      const gy = GROUND - hFor(DUEL.win), half = tw / 2 + 10, out = side === 'you' ? -1 : 1, goal = new PIXI.Graphics(); goal.lineStyle(2, hue, 0.9);
      for (let gx = -half; gx < half; gx += 12) goal.moveTo(gx, gy).lineTo(Math.min(gx + 7, half), gy);
      const gl = txt(String(DUEL.win), { fontSize: 17, fontWeight: '700', fill: hue, stroke: 0x0f0c0b, strokeThickness: 4 }); gl.anchor.set(out < 0 ? 0 : 1, 0.5); gl.position.set(-out * (half + 6), gy);
      box.addChildAt(goal, 0); box.addChildAt(gl, 1);
      const flag = new PIXI.Graphics(); flag.lineStyle(3, 0x1a1210).moveTo(0, -4).lineTo(0, -46);
      flag.lineStyle(1.5, 0x1a0705).beginFill(hue).moveTo(0, -46).lineTo(-out * 34, -40).lineTo(-out * 26, -33).lineTo(-out * 34, -26).lineTo(0, -24).closePath().endFill();
      body.addChildAt(flag, 0);
    }
    const t: Tower = { box, body, label, cracks, flash, tw, th, shown: 0, crackList: [], name: isSpire ? 'Tower' : 'Wall', hFor, render: () => { body.y = GROUND - hFor(t.shown); label.text = `${t.name} ${Math.round(t.shown)}`; } };
    return t;
  }
  private async towerTo(t: Tower, v: number) {
    const o = { v: t.shown }, p = this.tween(o, { v }, BEAT.tower);
    const tick = () => { t.shown = o.v; t.render(); };
    this.app.ticker.add(tick); await p; this.app.ticker.remove(tick); t.shown = v; t.render();
  }
  private addCracks(t: Tower, dmg: number) {
    const n = Math.min(6, 1 + Math.floor(dmg / 4));
    for (let i = 0; i < n && t.crackList.length < 14; i++) {
      let x = (Math.random() - 0.5) * t.tw * 0.6, y = t.th * (0.08 + Math.random() * 0.25);
      const pts = [[x, y]]; for (let k = 0; k < 4; k++) { x += (Math.random() - 0.5) * 18; y += 8 + Math.random() * 14; pts.push([x, y]); }
      t.crackList.push(pts);
    }
    this.drawCracks(t);
  }
  private drawCracks(t: Tower) {
    t.cracks.clear();
    for (const pts of t.crackList) {
      t.cracks.lineStyle(2.4, 0x050303, 0.95).moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) t.cracks.lineTo(p[0], p[1]);
      t.cracks.lineStyle(1, 0xff6a1a, 0.7).moveTo(pts[0][0] + 1, pts[0][1]); for (const p of pts.slice(1)) t.cracks.lineTo(p[0] + 1, p[1]);
    }
  }
  /** A hit: the tower sinks 6 units and settles back (no shake: the only shake in the game is the eruption's). */
  private async sink(t: Tower) { await this.tween(t.box, { y: 6 }, BEAT.sink / 2); await this.tween(t.box, { y: 0 }, BEAT.sink / 2); }
  /** A build: a gold glow on the top edge that fades. */
  private rim(t: Tower) {
    const g = new PIXI.Graphics(); g.beginFill(C.gold, 1).drawEllipse(0, t.name === 'Tower' ? 14 : 4, t.tw / 2 + 6, 9).endFill(); g.blendMode = PIXI.BLEND_MODES.ADD; g.alpha = 0.6;
    t.body.addChild(g); return this.tween(g, { alpha: 0 }, BEAT.rim).then(() => g.destroy());
  }
  private async collapse(t: Tower) {
    this.burst(t.box.x, GROUND - 80, 40, 'debris'); this.burst(t.box.x, GROUND - 40, 30, 'ash'); this.burst(t.box.x, GROUND - 120, 24, 'spark');
    await Promise.all([this.tween(t.body, { rotation: (t.box.x < W / 2 ? -1 : 1) * 0.25 }, 900), this.towerTo(t, 0)]);
    this.burst(t.box.x, GROUND - 10, 30, 'ash');
  }

  // ---------------------------------------------------------------- cards
  private makeCard(id: string, compact = false) {
    const k = DUEL_CARD[id], g = new PIXI.Container(), ph = !!this.opts.touch, sh = ph && compact ? DUEL_SHORT[id] : undefined;
    const art = sprite(artKey(id), ART_WIN.w, ART_WIN.h); art.position.set(ART_WIN.x, ART_WIN.y); g.addChild(art);
    g.addChild(sprite('card-frame', CARD_W, CARD_H));
    // The name: one line in the title band (y 10–40), shrunk to fit beside the cost badge.
    const name = txt(sh?.short ?? k.name, { fontFamily: compact ? DISPLAY : BODY, fontSize: ph ? (compact ? 32 : 24) : compact ? 24 : 22, fontWeight: '700', fill: 0xfbe7b0, stroke: 0x1a0705, strokeThickness: 4 });
    name.anchor.set(0.5, 0.5); name.position.set(140, 25);
    if (name.width > 168) name.scale.set(168 / name.width); g.addChild(name);
    const icon = sprite(ICON[k.res], 64, 64); icon.position.set(-10, -10); g.addChild(icon);
    const cost = txt(String(k.cost), { fontSize: ph && compact ? 44 : 32, fontWeight: '700', fill: 0xffffff, stroke: 0x000000, strokeThickness: 7 }); cost.anchor.set(0.5); cost.position.set(22, 22); g.addChild(cost);
    // Rule text: dark ink on the parchment plate (y 226–316), up to three lines.
    const eff = txt(sh?.brief ?? k.text, { fontSize: ph ? (compact ? 34 : 28) : compact ? 26 : 22, fontWeight: '700', fill: 0x1a0f08, align: 'center', wordWrap: true, wordWrapWidth: ph && compact ? 216 : 196, lineHeight: ph ? (compact ? 37 : 31) : compact ? 28 : 24 });
    eff.anchor.set(0.5, 0.5); eff.position.set(120, 271);
    if (eff.height > 88) eff.scale.set(88 / eff.height); g.addChild(eff);
    if (!compact) {
      // The big card's flavour sits on the foot of the picture, over a dark fade.
      const fade = new PIXI.Graphics();
      for (let i = 0; i < 20; i++) fade.beginFill(0x0f0c0b, 0.85 * (i + 1) / 20).drawRect(ART_WIN.x, 180 + i * 2, ART_WIN.w, 2).endFill();
      const fl = txt(k.flavour, { fontSize: ph ? 17 : 16, fontStyle: 'italic', fill: 0xf0e2c0, align: 'center', wordWrap: true, wordWrapWidth: 200, lineHeight: ph ? 19 : 18 });
      fl.anchor.set(0.5, 0.5); fl.position.set(120, 200); if (fl.height > 36) fl.scale.set(36 / fl.height);
      g.addChildAt(fade, 1); g.addChildAt(fl, 2);
    }
    return g;
  }
  // Unaffordable: the art goes grey and dark, and a strip at its foot says what is missing.
  private needBadge(id: string) {
    const k = DUEL_CARD[id], g = new PIXI.Container(), short = k.cost - this.duel.you[k.res];
    const x0 = ART_WIN.x, x1 = ART_WIN.x + ART_WIN.w, y0 = ART_WIN.y + ART_WIN.h - 42;
    const strip = new PIXI.Graphics(); strip.beginFill(0x3a0c07, 0.92).drawRect(x0, y0, ART_WIN.w, 42).endFill().lineStyle(2, 0xff8576, 0.95).moveTo(x0, y0).lineTo(x1, y0); g.addChild(strip);
    const ic = sprite(ICON[k.res], 34, 34); ic.anchor.set(0.5); g.addChild(ic);
    const t = txt(`Need ${short} more`, { fontSize: this.opts.touch ? 34 : 29, fontWeight: '700', fill: 0xffe1d9 }); t.anchor.set(0, 0.5); t.position.set(120 - (t.width - 40) / 2, y0 + 21); ic.position.set(t.x - 22, y0 + 21);
    if (t.width > 184) t.scale.set(184 / t.width); g.addChild(t); return g;
  }

  // ---------------------------------------------------------------- scene
  private resPanel(x: number, who: Who): Panel {
    const p = new PIXI.Container(); p.x = x; p.y = 16;
    const bg = new PIXI.Graphics(); frame(bg, 0, 0, 250, 132, 8, C.gold); p.addChild(bg);
    const title = txt(who === 'you' ? 'You' : 'Rival', { fontFamily: DISPLAY, fontSize: 18, fontWeight: '700', fill: who === 'you' ? C.gold : 0xe8644c }); title.position.set(14, 7); p.addChild(title);
    const rule = new PIXI.Graphics(); rule.lineStyle(1, 0x6b5636).moveTo(14, 33).lineTo(236, 33); p.addChild(rule);
    const rows = {} as Record<Res, { n: PIXI.Text; lbl: PIXI.Text }>;
    const shown = {} as Record<Res, number>, run = { stone: 0, steel: 0, magicka: 0 } as Record<Res, number>, glows = {} as Record<Res, { g: PIXI.Graphics; y: number }>;
    const setN = (r: Res, v: number) => { shown[r] = v; rows[r].n.text = String(Math.round(v)); };
    const countTo = (r: Res, v: number, instant?: boolean) => { // the number counts to its new value; a newer count takes over
      const id = ++run[r];
      if (instant || shown[r] === undefined || !this.opts.motion || shown[r] === v) { setN(r, v); return; }
      const gl = glows[r]; gl.g.clear().beginFill(v > shown[r] ? C.good : C.bad, 1).drawRoundedRect(8, gl.y - 3, 234, 30, 5).endFill(); gl.g.alpha = 0.25;
      this.stop(gl.g, ['alpha']); void this.tween(gl.g, { alpha: 0 }, BEAT.glow);
      const o = { v: shown[r] }, tick = () => { if (run[r] === id) setN(r, o.v); };
      this.app.ticker.add(tick);
      void this.tween(o, { v }, BEAT.count).then(() => { this.app.ticker.remove(tick); if (run[r] === id) setN(r, v); });
    };
    RES.forEach((r, i) => {
      const y = 41 + i * 29; const glow = new PIXI.Graphics(); glow.alpha = 0; p.addChild(glow); glows[r] = { g: glow, y };
      const ic = sprite(ICON[r], 24, 24); ic.position.set(14, y); p.addChild(ic);
      const n = txt('', { fontSize: this.opts.touch ? 26 : 22, fontWeight: '700' }); n.anchor.set(1, 0); n.position.set(76, y - (this.opts.touch ? 3 : 1)); p.addChild(n);
      const lbl = txt('', { fontSize: this.opts.touch ? 20 : 17, fill: C.muted }); lbl.position.set(88, y + (this.opts.touch ? 1 : 2)); p.addChild(lbl);
      rows[r] = { n, lbl };
    });
    return {
      node: p,
      update: (s, instant) => RES.forEach(r => { countTo(r, s[r], instant); rows[r].lbl.text = `${RES_NAME[r]}   +${s[GEN[r]]} a turn`; rows[r].lbl.scale.set(Math.min(1, 150 / (rows[r].lbl.width / rows[r].lbl.scale.x))); }),
      rowPos: r => ({ x: x + 125, y: this.opts.touch ? p.y + 146 + RES.indexOf(r) * 26 : p.y + 176 + RES.indexOf(r) * 28 }), // labels float under the panel (on the phone, clear of the buttons)
    };
  }
  private buildScene() {
    const root = this.root; root.removeChildren();
    const bg = sprite('background', W, H); bg.y = -62; root.addChild(bg); // lift the horizon to the towers' ground line
    root.addChild(this.ambient);
    const ground = new PIXI.Graphics(); ground.beginFill(0x0a0706, 0.55).drawRect(0, GROUND, W, TRAY - GROUND).endFill();
    const tray = vgrad(W, H - TRAY, [[0, '#1d1511'], [1, '#0a0706']]); tray.y = TRAY;
    const lines = new PIXI.Graphics(); lines.lineStyle(2, 0x8f704a, 0.9).moveTo(0, TRAY).lineTo(W, TRAY).lineStyle(1, 0x6b5636, 0.5).moveTo(0, TRAY + 4).lineTo(W, TRAY + 4);
    const inset = vgrad(W, 10, [[0, 'rgba(0,0,0,0.6)'], [1, 'rgba(0,0,0,0)']]); inset.y = TRAY + 5;
    root.addChild(ground, tray, inset, lines);
    if (!this.shadowTex) { // one soft card shadow, drawn once and shared by every card in the hand
      const sh = new PIXI.Graphics(); sh.beginFill(0x000000, 1).drawRoundedRect(0, 0, CARD_W, CARD_H, 18).endFill(); sh.filters = [new PIXI.BlurFilter(13)];
      this.shadowTex = this.app.renderer.generateTexture(sh, { region: new PIXI.Rectangle(-40, -40, CARD_W + 80, CARD_H + 80) }); sh.destroy();
    }
    const circle = new PIXI.Container(); circle.position.set(W / 2, 330); circle.alpha = 0;
    const cg = new PIXI.Graphics(); cg.lineStyle(3, 0xff7a2a, 0.9).drawEllipse(0, 70, 120, 30).lineStyle(1.5, 0xf0d68a, 0.8).drawEllipse(0, 70, 96, 22);
    cg.beginFill(0xff5a14, 0.25).drawEllipse(0, 70, 120, 30).endFill(); circle.addChild(cg);
    const banner = new PIXI.Container(); banner.position.set(W / 2, 22);
    const bannerGlow = new PIXI.Graphics(); bannerGlow.alpha = 0; const bannerBg = new PIXI.Graphics(); banner.addChild(bannerGlow, bannerBg);
    const bannerText = txt('', { fontFamily: DISPLAY, fontSize: 23, fontWeight: '700' }); bannerText.anchor.set(0.5, 0.5); bannerText.y = 20; banner.addChild(bannerText);
    const log = txt('', { fontSize: this.opts.touch ? 22 : 19, align: 'center', wordWrap: true, wordWrapWidth: 520, lineHeight: this.opts.touch ? 27 : 24, stroke: 0x0f0c0b, strokeThickness: 4 }); log.anchor.set(0.5, 0); log.y = 50;
    const logBg = new PIXI.Graphics(); banner.addChild(logBg, log);
    this.v = {
      yS: this.makeTower('spire', 340, 'you'), yW: this.makeTower('ward', 462, 'you'), fS: this.makeTower('spire', W - 340, 'foe'), fW: this.makeTower('ward', W - 462, 'foe'),
      yP: this.resPanel(16, 'you'), fP: this.resPanel(W - 266, 'foe'), circle, hand: new PIXI.Container(), preview: Object.assign(new PIXI.Container(), { eventMode: this.opts.touch ? 'passive' as const : 'none' as const }), stageCard: new PIXI.Container(), banner, bannerGlow, bannerBg, bannerText, log, logBg,
    };
    for (const t of [this.v.yS, this.v.yW, this.v.fS, this.v.fW]) root.addChild(t.box);
    root.addChild(circle, this.v.yP.node, this.v.fP.node, banner, this.v.stageCard, this.v.hand, this.v.preview, this.fx, this.floats);
  }
  private setTurn(who: Who | 'end', line?: string) {
    const t = this.v.bannerText, col = who === 'end' ? (this.duel.winner === 'foe' ? C.bad : C.gold) : who === 'you' ? C.good : C.bad;
    const label = who === 'end' ? line ?? '' : who === 'you' ? 'Your turn' : 'Rival’s turn';
    t.text = label; t.style.fill = col;
    const bw = t.width + 40; frame(this.v.bannerBg.clear(), -bw / 2, 0, bw, 40, 20, col, 0.6);
    if (label !== this.turnShown) { // a new turn: the label fades in and the border glows in its colour
      this.turnShown = label; t.alpha = 0; this.stop(t, ['alpha']); void this.tween(t, { alpha: 1 }, BEAT.lift);
      const g = this.v.bannerGlow; g.clear().lineStyle(5, col, 1).drawRoundedRect(-bw / 2 - 2, -2, bw + 4, 44, 22); g.alpha = 0.8; this.stop(g, ['alpha']); void this.tween(g, { alpha: 0 }, BEAT.glow);
    }
    if (line !== undefined && who !== 'end') { this.history.unshift(line); this.history.length = Math.min(this.history.length, 3); }
    this.setLog();
  }
  // The log keeps the last three moves, newest on top; a hint takes the top line until the next move.
  private setLog(hint?: string) {
    const s = (hint ? [hint, ...this.history.slice(0, 2)] : this.history).join('\n'), log = this.v.log;
    log.text = s; this.v.logBg.clear();
    if (s) this.v.logBg.beginFill(0x0f0c0b, 0.62).drawRoundedRect(-log.width / 2 - 14, 46, log.width + 28, log.height + 8, 8).endFill();
  }
  private syncAll(s: { you: DuelSide; foe: DuelSide }) {
    for (const [t, side, f] of [[this.v.yS, 'you', 'tower'], [this.v.yW, 'you', 'wall'], [this.v.fS, 'foe', 'tower'], [this.v.fW, 'foe', 'wall']] as [Tower, Who, Field][]) { t.shown = s[side][f]; t.render(); }
    this.v.yP.update(s.you, true); this.v.fP.update(s.foe, true);
  }
  private clearPreview() { for (const c of this.v.preview.removeChildren()) c.destroy({ children: true }); this.v.log.visible = this.v.logBg.visible = true; }
  /** Card k of n in the fan: the foot centre of its slot, on a shallow curve (edge cards 8 lower), tilted -3° to +3°. */
  private slot(k: number, n: number) {
    const sc = 0.6, gap = 7, w = CARD_W * sc, x0 = (W - (n * w + (n - 1) * gap)) / 2, u = n > 1 ? (k / (n - 1)) * 2 - 1 : 0;
    return { x: x0 + k * (w + gap) + w / 2, y: H - 12 + 8 * u * u, r: (u * 3 * Math.PI) / 180 };
  }
  /** A card left the hand: the others slide together. */
  private closeHand(gone: number) {
    const cards = this.v.hand.children as PIXI.Container[], n = cards.length - 1;
    cards.forEach((c, j) => { if (j === gone) return; const s = this.slot(j < gone ? j : j - 1, n); this.stop(c, ['x', 'y', 'rotation']); void this.tween(c, { x: s.x, y: s.y, rotation: s.r }, BEAT.hand); });
  }
  /** Lays out the hand as a fan. `enter`: the slot of a newly drawn card, which rises in while the others open the gap. */
  private layoutHand(enter?: number) {
    const hand = this.v.hand; hand.removeChildren(); this.lift = []; this.picked = null; this.clearPreview();
    const touch = !!this.opts.touch, n = this.duel.you.hand.length, sc = 0.6;
    this.duel.you.hand.forEach((id, i) => {
      const card = this.makeCard(id, true), at = this.slot(i, n);
      card.scale.set(sc); card.pivot.set(CARD_W / 2, CARD_H); card.position.set(at.x, at.y); card.rotation = at.r;
      card.eventMode = 'static'; card.cursor = 'pointer';
      const ok = !!this.duel.winner || this.discard || canPlay(this.duel.you, id);
      const glow = new PIXI.Graphics(); glow.lineStyle(6, C.gold, 0.9).drawRoundedRect(-2, -2, CARD_W + 4, CARD_H + 4, 14); glow.visible = false; card.addChild(glow);
      // A soft shadow under each card (offset 6, alpha 0.35); the lifted card's grows (offset 16, alpha 0.5).
      const shadow = new PIXI.Sprite(this.shadowTex); shadow.anchor.set(0.5); shadow.position.set(CARD_W / 2, CARD_H / 2 + 6 / sc); shadow.alpha = 0.35;
      const lift = (on: boolean) => {
        on = on && !this.busy; glow.visible = on;
        const up = on ? (ok ? 22 : 10) : 0; // an unaffordable card lifts only a little
        this.stop(card, ['y', 'rotation']); this.stop(shadow, ['y', 'alpha']); this.stop(shadow.scale, ['x', 'y']);
        void this.tween(card, { y: at.y - up, rotation: on ? 0 : at.r }, BEAT.lift);
        void this.tween(shadow, { y: CARD_H / 2 + (on ? 16 : 6) / sc, alpha: on ? 0.5 : 0.35 }, BEAT.lift);
        void this.tween(shadow.scale, { x: on ? 1.06 : 1, y: on ? 1.06 : 1 }, BEAT.lift);
        // The card big, where a played card shows (between the towers, so both sides stay in view); on the phone bigger, over the log.
        const pv = this.v.preview; this.clearPreview();
        if (!on) return;
        const big = this.makeCard(id), s = touch ? 1.15 : 0.9; big.scale.set(s);
        big.x = W / 2 - (CARD_W * s) / 2; big.y = touch ? 78 : 262 - (CARD_H * s) / 2;
        if (touch) { big.eventMode = 'static'; big.on('pointertap', e => e.stopPropagation()); this.v.log.visible = this.v.logBg.visible = false; }
        pv.addChild(big);
      };
      this.lift.push(lift);
      if (touch) card.on('pointertap', e => { // select, then a second tap plays; a double-tap (under 350 ms) plays nothing
        e.stopPropagation(); if (this.busy || this.duel.winner) return;
        if (this.picked !== i) { this.pickedAt = performance.now(); this.highlight(i); }
        else if (performance.now() - this.pickedAt >= 350) void this.onCard(i, card);
      });
      else {
        card.on('pointerover', () => lift(true));
        card.on('pointerout', () => lift(false));
        card.on('pointertap', () => { void this.onCard(i, card); });
      }
      if (!ok) {
        const dim = new PIXI.ColorMatrixFilter(); dim.desaturate(); dim.brightness(0.55, true);
        card.children[0].filters = [dim]; (card.children[1] as PIXI.Sprite).tint = 0x9a9a9a; card.addChild(this.needBadge(id));
      }
      card.addChildAt(shadow, 0);
      if (enter !== undefined) {
        if (i === enter) { card.y = at.y + 230; card.alpha = 0; void this.tween(card, { y: at.y, alpha: 1 }, BEAT.hand); duelSfx.draw(); }
        else { const c = this.slot(i < enter ? i : i - 1, n - 1); card.position.set(c.x, c.y); card.rotation = c.r; void this.tween(card, { x: at.x, y: at.y, rotation: at.r }, BEAT.hand); }
      }
      hand.addChild(card);
    });
  }

  // ---------------------------------------------------------------- playback
  private tower(who: Who, f: Field) { return this.v[`${who === 'you' ? 'y' : 'f'}${f === 'tower' ? 'S' : 'W'}` as 'yS']; }
  private panel(who: Who) { return who === 'you' ? this.v.yP : this.v.fP; }
  /** The rival's turn: their card back slides in beside their panel and waits (the think), then flips to show the card. */
  private async rivalCard(ev: Move): Promise<PIXI.Container> {
    this.setTurn('foe');
    const card = new PIXI.Container(), back = sprite('card-back', CARD_W, CARD_H); card.addChild(back);
    card.pivot.set(CARD_W / 2, CARD_H / 2); card.scale.set(0.45); card.position.set(W + 90, 300);
    this.v.stageCard.addChild(card);
    await Promise.all([this.tween(card, { x: 1140 }, BEAT.backIn), this.think()]);
    await this.tween(card.scale, { x: 0 }, BEAT.flip);
    back.destroy(); card.addChild(this.makeCard(ev.id));
    await this.tween(card.scale, { x: 0.45 }, BEAT.flip);
    return card;
  }
  /** A played card arcs to the centre stage and lands; `ready` is the rival's card, already turned over. */
  private async showCard(ev: Move, from: PIXI.Container | null, ready?: PIXI.Container) {
    let card = ready;
    if (!card) {
      card = this.makeCard(ev.id); card.pivot.set(CARD_W / 2, CARD_H / 2);
      if (from) { const c = from.toGlobal(new PIXI.Point(CARD_W / 2, CARD_H / 2)); card.position.set(c.x, c.y); card.scale.set(0.6); card.rotation = from.rotation; }
      else { card.position.set(W - 140, 250); card.scale.set(0.3); }
      this.v.stageCard.addChild(card);
    }
    duelSfx.play(DUEL_CARD[ev.id].res);
    await this.arc(card, W / 2, 262, 0.71, BEAT.arc);
    await this.tween(card.scale, { x: 0.68, y: 0.68 }, BEAT.settle);
    if (ev.discard) { card.alpha = 0.6; const t = txt('Discarded', { fontSize: 44, fontWeight: '700', fill: C.muted, stroke: 0, strokeThickness: 6 }); t.anchor.set(0.5); t.position.set(CARD_W / 2, CARD_H / 2); t.rotation = -0.3; card.addChild(t); }
    return card;
  }
  private async playEvent(ev: DuelEvent, from: PIXI.Container | null, ready?: PIXI.Container) {
    if (ev.type === 'income') { // every row counts together, in one beat, with no sound
      for (const [k, v] of Object.entries(ev.changes[ev.who])) { const p = this.panel(ev.who).rowPos(k as Res); this.floatText(p.x, p.y, `+${v} ${RES_NAME[k as Res]}`, true); }
      this.panel(ev.who).update(ev.after[ev.who]); await this.wait(BEAT.income); return;
    }
    const k = DUEL_CARD[ev.id], other: Who = ev.who === 'you' ? 'foe' : 'you';
    this.panel(ev.who).update(ev.after[ev.who]);
    const card = await this.showCard(ev, from, ready);
    this.setTurn(ev.who, `${ev.who === 'you' ? 'You' : 'Rival'} ${ev.discard ? 'discarded' : 'played'} ${k.name}${ev.discard ? '' : `: ${k.text}`}.`);
    await this.wait(ev.who === 'foe' ? BEAT.readFoe : BEAT.readYou);
    if (!ev.discard) {
      const hurt = ev.changes[other];
      if (k.kind === 'summon') {
        // The Daedra rises from the circle and strikes the other side.
        const circle = this.v.circle; circle.alpha = 0; await this.tween(circle, { alpha: 1 }, 200);
        const d = sprite(artKey(ev.id), ART_WIN.w, ART_WIN.h); d.anchor.set(0.5); d.position.set(W / 2, 400); d.scale.set(0.1); this.root.addChildAt(d, this.root.getChildIndex(this.v.stageCard));
        const oval = new PIXI.Graphics(); oval.beginFill(0xffffff).drawEllipse(0, 0, d.texture.width * 0.4, d.texture.height * 0.48).endFill(); d.addChild(oval); d.mask = oval; // an oval portrait
        this.burst(W / 2, 400, 18, 'spark');
        await this.tween(d.scale, { x: 0.9, y: 0.9 }, 320);
        if (hurt.tower || hurt.wall) await this.tween(d, { x: this.tower(other, hurt.wall ? 'wall' : 'tower').box.x, y: GROUND - 120 }, 360, t => t * t);
        else await this.tween(d, { x: other === 'you' ? 170 : W - 170, y: 90 }, 360, t => t * t);
        void this.tween(circle, { alpha: 0 }, 300); d.destroy();
      } else if ((hurt.wall ?? 0) < 0 || (hurt.tower ?? 0) < 0) { // damage travels from the card and lands a beat after it
        const t = this.tower(other, (hurt.wall ?? 0) < 0 ? 'wall' : 'tower');
        await this.streak(card.x, card.y, t.box.x, GROUND - t.hFor(Math.max(t.shown, 4)), BEAT.streak);
      }
      const jobs: Promise<void>[] = [];
      for (const who of [ev.who, other]) {
        const ch = ev.changes[who];
        // the wall takes a hit first; damage that gets through reaches the tower 80 ms later
        for (const [f, v] of (Object.entries(ch) as [keyof DuelSide, number][]).sort(([a], [b]) => Number(b === 'wall') - Number(a === 'wall'))) {
          if (f === 'tower' || f === 'wall') {
            const t = this.tower(who, f), after = ev.after[who][f], falls = f === 'tower' && after <= 0, late = f === 'tower' && v < 0 && (ch.wall ?? 0) < 0;
            jobs.push((async () => {
              if (late) await this.wait(BEAT.wallFirst);
              const top = GROUND - t.hFor(Math.max(t.shown, 4)) - 20;
              this.floatText(t.box.x, top, `${t.name} ${v > 0 ? '+' : '−'}${Math.abs(v)}`, v > 0);
              if (v < 0) {
                duelSfx.hit(falls ? 20 : -v);
                this.burst(t.box.x, top + 30, 22, 'spark'); this.burst(t.box.x, top + 30, 10, 'debris'); this.addCracks(t, -v);
                t.flash.alpha = 0.55; void this.tween(t.flash, { alpha: 0 }, BEAT.flash); void this.sink(t);
              } else { duelSfx.build(); this.burst(t.box.x, top + 20, 10, 'ash'); t.crackList.splice(0, Math.ceil(v / 4)); this.drawCracks(t); void this.rim(t); }
              await (falls ? this.collapse(t) : this.towerTo(t, after));
            })());
          } else {
            const r = (RES as readonly string[]).includes(f) ? f as Res : RES.find(x => GEN[x] === f)!;
            const p = this.panel(who).rowPos(r); this.floatText(p.x, p.y, `${RES_NAME[f as Res] ?? GEN_NAME[f]} ${v > 0 ? '+' : '−'}${Math.abs(v)}`, v > 0);
          }
        }
        this.panel(who).update(ev.after[who]);
      }
      await Promise.all(jobs);
    }
    // the card fades and rises; a discard drops away
    await this.tween(card, { alpha: 0, y: card.y + (ev.discard ? 50 : -30) }, BEAT.out); card.destroy();
  }
  private async onCard(i: number, node: PIXI.Container) {
    if (this.busy || this.duel.winner) return;
    const id = this.duel.you.hand[i];
    if (!this.discard && !canPlay(this.duel.you, id)) {
      const k = DUEL_CARD[id]; this.setLog(`${k.name} costs ${k.cost} ${RES_NAME[k.res]}; you have ${this.duel.you[k.res]}.`);
      sfx.deny(); if (this.opts.touch) buzz([15, 30, 15]);
      return;
    }
    this.busy = true; this.clearPreview(); this.opts.state?.(null, true);
    const discard = this.discard;
    if (discard) { this.discard = false; this.opts.discardOff(); }
    const next = this.opts.pick(i, discard); // the engine decides; the board only plays it back
    if (!next) { this.busy = false; this.layoutHand(); this.opts.state?.(null, false); return; }
    node.visible = false; this.closeHand(i);
    for (const ev of next.events ?? []) {
      const ready = ev.type === 'move' && ev.who === 'foe' ? await this.rivalCard(ev) : undefined;
      await this.playEvent(ev, ev.type === 'move' && ev.who === 'you' ? node : null, ready);
      if (ev.winner) break;
    }
    this.duel = { ...next, you: clone(next.you), foe: clone(next.foe) };
    this.syncAll(this.duel);
    if (this.duel.winner) await this.ending(this.duel.winner, true); else this.setTurn('you');
    this.layoutHand(this.duel.winner ? undefined : i); this.busy = false; this.rush = false; this.opts.state?.(null, false);
    this.opts.settled(this.duel);
  }
  /** The end: a held breath, the verdict on the banner with its bells, and the board dims around the winner's tower. */
  private async ending(w: Who, live: boolean) {
    if (live) await this.wait(BEAT.end);
    this.setTurn('end', w === 'you' ? 'You win the duel' : 'Your rival wins the duel');
    if (live) { (w === 'you' ? duelSfx.win : duelSfx.lose)(); if (this.opts.touch) buzz(w === 'you' ? [30, 40, 30] : 120); }
    const root = this.root, dim = new PIXI.Graphics(); dim.beginFill(0x000000, 1).drawRect(0, 0, W, H).endFill(); dim.alpha = 0;
    root.addChildAt(dim, root.getChildIndex(this.fx));
    for (const n of [this.tower(w, 'tower').box, this.v.banner]) { root.removeChild(n); root.addChildAt(n, root.getChildIndex(this.fx)); }
    if (live) void this.tween(dim, { alpha: 0.4 }, BEAT.dim); else dim.alpha = 0.4;
  }
  private start(d: DuelState) {
    this.duel = { ...d, you: clone(d.you), foe: clone(d.foe) };
    this.buildScene(); this.history = []; this.syncAll(this.duel);
    if (this.duel.winner) void this.ending(this.duel.winner, false);
    else { this.setTurn('you'); this.setLog('Build your tower to 100, or knock your rival’s down to 0.'); }
    this.layoutHand();
  }
}
