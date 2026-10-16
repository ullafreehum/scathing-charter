// The Tamrielic calendar (LORE_BIBLE §6). Day 0 = 1 Morning Star 4E 4.
export const MONTHS = [
  { name: 'Morning Star', days: 31, jel: 'Vakka' },
  { name: "Sun's Dawn", days: 28, jel: 'Xeech' },
  { name: 'First Seed', days: 31, jel: 'Sisei' },
  { name: "Rain's Hand", days: 30, jel: 'Hist-Deek' },
  { name: 'Second Seed', days: 31, jel: 'Hist-Dooka' },
  { name: 'Midyear', days: 30, jel: 'Hist-Tsoko' },
  { name: "Sun's Height", days: 31, jel: 'Thtithil-Gah' },
  { name: 'Last Seed', days: 31, jel: 'Thtithil' },
  { name: 'Hearthfire', days: 30, jel: 'Nushmeeko' },
  { name: 'Frostfall', days: 31, jel: 'Shaja-Nushmeeko' },
  { name: "Sun's Dusk", days: 30, jel: 'Saxhleel' },
  { name: 'Evening Star', days: 31, jel: 'Xulomaht' },
] as const;
export const WEEKDAYS = ['Morndas', 'Tirdas', 'Middas', 'Turdas', 'Fredas', 'Loredas', 'Sundas'] as const;
export const YEAR_DAYS = 365;
export const START_YEAR = 4;
/** 1 Morning Star 4E 4 is a Tirdas, counted back from Sundas 17 Last Seed 4E 201 (extrapolation, LORE_BIBLE §6.2). */
export const START_WEEKDAY = 1;

export interface TamrielDate { year: number; month: number; monthName: string; dom: number; weekday: string; doy: number }

export function dateOf(day: number): TamrielDate {
  const year = START_YEAR + Math.floor(day / YEAR_DAYS);
  let doy = day - (year - START_YEAR) * YEAR_DAYS;
  const dayOfYear = doy;
  let month = 0;
  while (doy >= MONTHS[month].days) { doy -= MONTHS[month].days; month++; }
  return { year, month, monthName: MONTHS[month].name, dom: doy + 1, weekday: WEEKDAYS[(START_WEEKDAY + day) % 7], doy: dayOfYear };
}

/** Absolute day index for (4E year, month 1–12, day-of-month). */
export function D(year: number, month: number, dom: number): number {
  let d = (year - START_YEAR) * YEAR_DAYS;
  for (let m = 0; m < month - 1; m++) d += MONTHS[m].days;
  return d + dom - 1;
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
}

export function formatDate(day: number, withWeekday = true): string {
  const d = dateOf(day);
  return `${withWeekday ? d.weekday + ', ' : ''}${ordinal(d.dom)} of ${d.monthName}, 4E ${d.year}`;
}
export function shortDate(day: number): string {
  const d = dateOf(day);
  return `${d.dom} ${d.monthName} 4E ${d.year}`;
}

export const PHASES = ['New', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full', 'Waning Gibbous', 'Third Quarter', 'Waning Crescent'] as const;
/** Masser 24-day and Secunda 28-day cycles — an extrapolation between disputed figures (D-22). */
export const MASSER_CYCLE = 24, SECUNDA_CYCLE = 28;
export function moonPhase(day: number, cycle: number, offset: number): number {
  return Math.floor((((day + offset) % cycle) * 8) / cycle);
}
export function moons(day: number) {
  return { masser: moonPhase(day, MASSER_CYCLE, 10), secunda: moonPhase(day, SECUNDA_CYCLE, 3) };
}
