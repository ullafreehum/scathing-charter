// Endings: the last-day crossroads, early retirement, milestones and Tong indenture.
import type { Action, GameState } from './types';
import { clampRep } from './history';
import { addHeat } from './encounters';
import { netWorth } from './score';
import { log } from './util';

/** Endless play after the crossroads: the calendar runs on for a century. */
export const ENDLESS_DAYS = 36500;
/** Debt at this multiple of the original note turns into indenture instead of more killers. */
export const INDENTURE_RATIO = 6;
export const TONG_CUT = 0.3;

export /** Milestones open early retirement ("retire now or carry on"). */
function milestones(s: GameState) {
  const got = (s.milestones ??= []);
  const add = (id: string, title: string, text: string) => {
    if (got.includes(id)) return;
    got.push(id);
    s.inbox.push({ kind: 'result', title, text: `${text} You can retire now (Bank tab) with your fortune as it stands, or carry on.` });
  };
  if (s.note.cleared && !s.indentured) add('debt', 'Free of debt', 'The Tong has no claim on you.');
  if (s.charter.tier >= 3) add('charter', 'Charter-Holder', 'You hold a share of the Scathing Charter.');
  if (s.player.mercy >= 60) add('mercy', 'A name for mercy', 'Refugees across Morrowind know your name.');
}

export function endingAction(s: GameState, a: Action): string | void {
  switch (a.t) {
    case 'crossroads': {
      // The last day: retire for good, or choose a way to play on without an end date (score frozen now).
      if (s.over?.reason !== 'calendar' || s.ending) return 'Not now.';
      if (a.choice === 'charter' && s.charter.tier < 2) return 'You need a charter tier of 2 or more.';
      s.ending = { kind: a.choice, day: s.day, worth: netWorth(s) };
      if (a.choice === 'retire') { log(s, 'You put away the ledger for good.', 'history'); return; }
      s.over = null; s.endDay = s.day + ENDLESS_DAYS;
      if (a.choice === 'tong') {
        s.note.cleared = true; s.note.balance = 0; s.indentured = false;
        s.player.rep.tong = clampRep(s.player.rep.tong + 30); addHeat(s, 30);
        log(s, 'You take the Tong’s mark. Your debt is gone; now you carry what they tell you to.', 'history');
      } else log(s, a.choice === 'charter' ? 'You take your seat among the Charter-Holders and keep trading.' : 'The ledger stays open. You keep trading.', 'history');
      return;
    }
    case 'retire': {
      if (!s.milestones?.length) return 'You have nothing to retire on yet.';
      if (s.indentured) return 'The Tong does not let its runners retire.';
      s.ending = { kind: 'retire', day: s.day, worth: netWorth(s) };
      s.over = { reason: 'retired', day: s.day };
      return;
    }
  }
}
