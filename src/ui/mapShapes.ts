// Map geography in map units (1000 × 760), traced to follow the in-game maps of Tamriel and Morrowind:
// Vvardenfell in a ring of Inner Sea with Zafirbel Bay cutting into its east side, the mainland wrapped
// around it from Blacklight to Necrom, Solstheim to the north-west, Topal Bay reaching up to Leyawiin.
// Towns keep their coordinates from src/data/locations.ts; the coasts are drawn around them.

type Pt = [number, number];
const pts = (s: string): Pt[] => s.trim().split(/\s+/).map(p => p.split(',').map(Number) as Pt);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A smooth closed outline through the points (Catmull-Rom as cubic Béziers). */
function smooth(p: Pt[]): string {
  const n = p.length, at = (i: number) => p[(i + n) % n];
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1), [x1, y1] = at(i), [x2, y2] = at(i + 1), [x3, y3] = at(i + 2);
    d += ` C${r1(x1 + (x2 - x0) / 6)},${r1(y1 + (y2 - y0) / 6)} ${r1(x2 - (x3 - x1) / 6)},${r1(y2 - (y3 - y1) / 6)} ${x2},${y2}`;
  }
  return `${d} Z`;
}
const blob = (cx: number, cy: number, rx: number, ry: number, tilt = 0): string => smooth(
  [0, 1, 2, 3, 4, 5].map(k => { const a = (k / 6) * 2 * Math.PI + tilt, w = k % 2 ? 0.82 : 1; return [r1(cx + Math.cos(a) * rx * w), r1(cy + Math.sin(a) * ry * w)] as Pt; }));

/** Skyrim, Cyrodiil, mainland Morrowind, Black Marsh and Elsweyr as one coastline. */
export const MAINLAND = smooth(pts(`
  -30,110 20,104 55,112 80,121 96,116 118,107 150,100 185,106 215,98 250,104 280,113 305,119 330,127 352,121 375,125 392,136
  402,156 410,184 418,206 432,213 446,211 457,222 458,240 452,262 457,285 455,305 462,325 474,340
  492,350 512,354 532,351 548,357 566,355 586,360 604,355 622,359 642,353 662,349 680,343 696,333 706,317
  710,299 705,280 712,258 707,236 714,212 709,190 716,168 724,150 735,137 750,131 766,137
  779,152 774,172 786,193 780,214 790,236 782,258 772,276 763,292 756,306 753,320 760,334 755,351 744,368 738,388
  726,408 716,428 700,448 684,465 668,480 652,491 636,500 624,512 634,524 656,532 684,544 708,560 728,584 742,612
  744,640 734,664 714,684 690,699 662,708 640,714 612,721 584,726 556,722 528,728 500,722 474,712 452,700 436,684
  428,664 420,644 414,628 406,620 396,628 386,646 374,664 360,684 347,702 340,722 320,731 290,736 260,732 230,740
  195,738 160,744 120,740 80,746 40,742 -30,748
`));

/** Vvardenfell, Red Mountain's island, with Zafirbel Bay between the Ascadian side and Azura's Coast. */
export const VVARDENFELL = smooth(pts(`
  478,186 486,170 500,160 516,154 534,148 552,150 570,144 588,148 606,146 624,150 642,148 660,154 676,164 688,178
  692,196 686,214 692,232 690,252 682,270 672,286 660,296 648,300 642,290 644,272 640,256 636,241 630,236 625,248
  628,266 624,284 618,300 608,312 598,322 586,328 574,330 562,334 550,332 538,328 524,326 510,320 498,310 490,296
  486,280 482,262 480,244 476,226 474,206
`));

export const SOLSTHEIM = smooth(pts(`
  470,60 476,40 490,26 508,18 528,20 546,28 556,42 552,56 546,70 540,84 524,94 508,100 494,104 478,100 466,88 464,74
`));

/** Sheogorad, the Ascadian and Azura's Coast isles, and the Telvanni isles off the north-east. */
export const ISLES = [
  blob(530, 136, 7, 4), blob(556, 131, 5, 3.5, 0.4), blob(583, 135, 8, 4.5), blob(610, 134, 4.5, 3), blob(490, 150, 4, 3),
  blob(701, 200, 4, 3, 0.3), blob(699, 264, 3.5, 3), blob(672, 307, 4.5, 3), blob(612, 341, 5, 3), blob(530, 342, 3.5, 2.5),
  blob(806, 118, 11, 6, 0.3), blob(828, 150, 7, 5), blob(797, 92, 6, 4), blob(818, 205, 5, 4),
];

/** Mainland Morrowind beyond its borders (the land is clipped to the coast), for a province tint. */
export const MORROWIND_REGION = 'M390,60 L394,170 L402,250 L412,292 L428,320 L442,342 L444,380 L446,420 L450,460 L455,500 L500,512 L550,518 L600,516 L628,512 L700,500 L900,480 L900,60 Z';

/** Province borders (drawn dashed). */
export const BORDERS = [
  'M392,136 C396,190 400,250 410,290 C420,315 440,335 442,360 C446,420 450,460 455,500', // Skyrim / Cyrodiil | Morrowind
  'M0,336 C120,342 300,338 436,330', // Skyrim | Cyrodiil
  'M455,500 C520,515 580,520 628,514', // Morrowind | Black Marsh
  'M455,500 C462,560 448,610 426,654', // Cyrodiil | Black Marsh
  'M0,560 C150,575 280,600 392,632', // Cyrodiil | Elsweyr
];

/** Lake Rumare round the Imperial City, and the Niben running down to Topal Bay. */
export const LAKES = [blob(300, 470, 30, 19, 0.2), blob(452, 382, 9, 6)]; // + Lake Amaya
export const RIVERS = ['M316,484 C330,520 352,546 372,568 S400,602 406,622'];

const ridge = (line: string, step: number): Pt[] => {
  const p = pts(line), out: Pt[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1], len = Math.hypot(bx - ax, by - ay);
    for (let t = 0; t < len; t += step) out.push([r1(ax + ((bx - ax) * t) / len + ((out.length % 2) * 3 - 1.5)), r1(ay + ((by - ay) * t) / len)]);
  }
  return out;
};
const peak = ([x, y]: Pt, s = 1) => `M${x - 5 * s},${y + 2 * s} L${x},${y - 5 * s} L${x + 5 * s},${y + 2 * s} M${x + s},${y - 3.5 * s} L${x + 2.5 * s},${y + 1.5 * s}`;

/** Velothi, Jerall and Valus mountains, the Ashlands round Red Mountain, and hills in Skyrim and Deshaan. */
export const MOUNTAINS = [
  ...ridge('392,150 397,200 402,245 410,285 426,318 440,336', 15),
  ...ridge('40,328 140,336 240,338 330,334 425,326', 22),
  ...ridge('446,356 447,400 450,446', 18),
  ...ridge('160,214 230,204 290,214', 24), ...ridge('110,170 160,160', 25),
  ...ridge('520,412 566,418', 22), ...ridge('660,430 690,410', 20),
  [544, 196], [590, 196], [600, 238], [540, 240], [524, 186],
].map(p => peak(p as Pt)).join(' ');
export const RED_MOUNTAIN = { x: 567, y: 216, d: 'M547,228 L567,204 L587,228 M561,206 L567,212 L573,206 M570,209 L576,224' };

/** Reed tufts across Black Marsh and the Bitter Coast. */
export const MARSH = (['494,598', '548,626', '604,646', '664,598', '540,686', '476,650', '696,640', '626,574', '700,690', '492,296'] as const)
  .map(s => { const [x, y] = s.split(',').map(Number); return `M${x - 4},${y} h3 M${x + 1},${y} h3 M${x - 2},${y + 3} h4 M${x},${y} v-4 M${x - 2},${y} l-1,-3 M${x + 2},${y} l1,-3`; }).join(' ');
