// Banking and the Tong note: deposits, withdrawals, writs, paying and borrowing.
import { C } from '../data';
import type { Action, GameState } from './types';
import { branchKey } from './history';
import { log, unlock } from './util';

/** Daily interest on deposits: Hlaalu pays more, the Imperial (EEC) house is steadier. */
export const DEPOSIT_RATE = { hlaalu: 0.0008, eec: 0.0004 } as const;

export function bankAction(s: GameState, a: Action, loc: string): string | void {
  switch (a.t) {
    case 'deposit': case 'withdraw': {
      const key = branchKey(a.house, loc);
      if (s.world.branches[key] !== 'open') return 'There is no open branch here.';
      const amt = Math.floor(a.amount); if (amt <= 0) return 'Enter an amount.';
      if (a.t === 'deposit') {
        if (s.player.cash < amt) return 'Not enough cash.';
        s.player.cash -= amt; s.deposits[key] = (s.deposits[key] ?? 0) + amt; unlock(s, `topic:house-${a.house}`);
      } else {
        const fee = Math.ceil(amt * (a.house === 'hlaalu' ? 0.01 : 0.02) * C.backgrounds[s.player.backgroundId].feeMult * (s.world.flags.hlaaluFees && a.house === 'hlaalu' ? 2 : 1));
        if ((s.deposits[key] ?? 0) < amt) return 'Not that much on deposit here.';
        s.deposits[key] -= amt; s.player.cash += amt - fee;
      }
      return;
    }
    case 'writ': {
      const to = branchKey(a.house, loc), from = branchKey(a.house, a.from);
      if (s.world.branches[to] !== 'open') return 'No open branch of that house here.';
      if (s.world.branches[from] !== 'open') return 'That branch no longer honours writs.';
      const amt = Math.floor(a.amount);
      if (amt <= 0 || (s.deposits[from] ?? 0) < amt) return 'Not that much on deposit there.';
      const fee = Math.ceil(amt * (a.house === 'hlaalu' ? 0.03 : 0.04) * C.backgrounds[s.player.backgroundId].feeMult * (s.world.flags.hlaaluFees && a.house === 'hlaalu' ? 2 : 1));
      s.deposits[from] -= amt; s.deposits[to] = (s.deposits[to] ?? 0) + amt - fee;
      log(s, `A writ of coin moves ${amt} septims from ${C.locs[a.from].name} (fee ${fee}).`);
      return;
    }
    case 'pay': {
      if (s.note.cleared) return 'Your note is cleared.';
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong collector here.';
      const amt = Math.min(Math.floor(a.amount), Math.ceil(s.note.balance), s.player.cash);
      if (amt <= 0) return 'Enter an amount.';
      s.player.cash -= amt; s.note.balance -= amt; s.note.lastPaymentDay = s.day;
      if (s.note.balance < 1) { s.note.balance = 0; s.note.cleared = true; log(s, 'You paid off the Camonna Tong. You owe no one.', 'good'); s.inbox.push({ kind: 'result', title: 'Debt paid off', text: 'Gavas Drelloth counts the coin twice, then tears up your note. "Pleasure, outlander." You are free of the Tong.' }); }
      return;
    }
    case 'borrow': {
      // The Tong always lends; every advance raises the rate, and a bigger debt brings harder collectors (pressure()).
      if (loc !== s.note.seat && !s.note.agents.includes(loc)) return 'No Tong agent here.';
      const amt = Math.floor(a.amount);
      if (amt <= 0) return 'Enter an amount.';
      if (s.note.cleared) { s.note.cleared = false; s.note.balance = 0; s.note.lastPaymentDay = s.day; }
      s.note.rate = Math.min(0.02 / s.timeScale, s.note.rate + 0.0015 * amt / s.note.original / s.timeScale);
      s.note.extended += amt; s.note.balance += amt; s.player.cash += amt;
      log(s, `You borrow ${amt} more from the Tong.`, 'bad');
      return;
    }
  }
}
