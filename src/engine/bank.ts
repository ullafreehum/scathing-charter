// Strongboxes and the Tong note: deposits, withdrawals, paying and borrowing.
import { LEND_RATIO } from './endings';
import { C } from '../data';
import type { Action, GameState } from './types';
import { vaultHouse } from './history';
import { log, unlock } from './util';

/** Daily interest on each city's strongbox (the eruption gamble: the game never says which cities are doomed),
 *  and the fee for taking money out. */
export const DEPOSIT_RATES: Readonly<Record<string, number>> = {
  vivec: 0.0012, ebonheart: 0.0012, balmora: 0.0012, mournhold: 0.0008,
  narsis: 0.0003, 'raven-rock': 0.0003, solitude: 0.0003, 'imperial-city': 0.0003,
};
export const depositRate = (loc: string): number => DEPOSIT_RATES[loc] ?? 0.0003;
export const WITHDRAW_FEE = 0.01;
/** How much each borrowed note's worth raises the daily rate. */
export const BORROW_RATE_RISE = 0.0008;

export function bankAction(s: GameState, a: Action, loc: string): string | void {
  switch (a.t) {
    case 'deposit': case 'withdraw': {
      // One strongbox per city: money stays where you leave it, earns a flat rate, and costs 1% to take out.
      if (s.world.branches[loc] !== 'open') return 'There is no strongbox here.';
      const amt = Math.floor(a.amount); if (amt <= 0) return 'Enter an amount.';
      if (a.t === 'deposit') {
        if (s.player.cash < amt) return 'Not enough cash.';
        s.player.cash -= amt; s.deposits[loc] = (s.deposits[loc] ?? 0) + amt; unlock(s, `topic:house-${vaultHouse(C.branches, loc)}`);
      } else {
        const fee = Math.ceil(amt * WITHDRAW_FEE * C.backgrounds[s.player.backgroundId].feeMult);
        if ((s.deposits[loc] ?? 0) < amt) return 'Not that much in the strongbox here.';
        s.deposits[loc] -= amt; s.player.cash += amt - fee;
      }
      return;
    }
    case 'pay': {
      if (s.note.cleared) return 'Your note is cleared.';
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong collector here.';
      const amt = Math.min(Math.floor(a.amount), Math.ceil(s.note.balance), s.player.cash);
      if (amt <= 0) return 'Enter an amount.';
      payNote(s, amt);
      return;
    }
    case 'borrow': {
      // The Tong always lends; every advance raises the rate, and a bigger debt brings harder collectors (pressure()).
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong agent here.';
      const amt = Math.floor(a.amount);
      if (amt <= 0) return 'Enter an amount.';
      const room = Math.floor(s.note.original * LEND_RATIO - (s.note.cleared ? 0 : s.note.balance));
      if (amt > room) return room > 0 ? `Drelloth will lend you at most ${room} more.` : 'Drelloth will not lend you more. Pay something first.';
      if (s.note.cleared) { s.note.cleared = false; s.note.balance = 0; s.note.lastPaymentDay = s.day; }
      s.note.rate = borrowRate(s, amt);
      s.note.extended += amt; s.note.balance += amt; s.player.cash += amt;
      log(s, `You borrow ${amt} more from the Tong.`, 'bad');
      return;
    }
  }
}

/** The daily rate after borrowing `amt` more. */
export function borrowRate(s: GameState, amt: number): number {
  return Math.min(0.02 / s.timeScale, s.note.rate + BORROW_RATE_RISE * amt / s.note.original / s.timeScale);
}

/** Days until a debt of `balance` at `rate` a day (of game time) passes `limit`, if nothing is paid; null beyond ten years. */
export function daysUntil(balance: number, rate: number, limit: number, timeScale = 1): number | null {
  let b = balance;
  for (let d = 0; d <= 3650; d++) { if (b > limit) return d; for (let i = 0; i < timeScale; i++) b *= 1 + rate; }
  return null;
}

/** Pays `amt` off the Tong note (at a counter or to collectors on the road) and clears it when nothing is left.
 *  Only a payment worth at least 30 days of interest resets the "late" clock that sends collectors. */
export function payNote(s: GameState, amt: number): void {
  if (amt >= s.note.balance * s.note.rate * 30 * s.timeScale || amt >= s.note.balance - 1) s.note.lastPaymentDay = s.day;
  s.player.cash -= amt; s.note.balance -= amt;
  if (s.note.balance < 1) { s.note.balance = 0; s.note.cleared = true; log(s, 'You paid off the Camonna Tong. You owe no one.', 'good'); s.inbox.push({ kind: 'result', title: 'Debt paid off', text: 'Gavas Drelloth counts the coin twice, then tears up your note. "Pleasure, outlander." You are free of the Tong.' }); }
}
