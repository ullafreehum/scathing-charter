// Endings: win (the Charter seat, debt-free), the Tong's mark (debt past 6x the note), retirement.
import type { Action, GameState } from './types';
import { netWorth } from './score';
import { log } from './util';

/** Debt past this multiple of the original note: the Tong's mark, and the run ends. */
export const MARK_RATIO = 6;
/** The Tong warns you (once each) as the debt passes these multiples. */
export const MARK_WARNINGS = [4, 5] as const;
/** The Tong will not lend past this multiple of the note. */
export const LEND_RATIO = 5;

export /** Milestones open early retirement ("retire now or carry on"). */
function milestones(s: GameState) {
  const got = (s.milestones ??= []);
  const add = (id: string, title: string, text: string) => {
    if (got.includes(id)) return;
    got.push(id);
    s.inbox.push({ kind: 'result', title, text: `${text} You can retire now (Bank tab) with your fortune as it stands, or carry on.` });
  };
  if (s.note.cleared) add('debt', 'Free of debt', 'The Tong has no claim on you.');
  if (s.player.mercy >= 60) add('mercy', 'A name for mercy', 'Refugees across Morrowind know your name.');
}

function end(s: GameState, kind: 'win' | 'mark' | 'retire', reason: 'won' | 'marked' | 'retired' | 'calendar') {
  s.ending = { kind, day: s.day, worth: netWorth(s) };
  s.over = { reason, day: s.day };
}

/** Called once per day: warnings at 4x and 5x the note, the mark past 6x. */
export function checkMark(s: GameState) {
  if (s.note.cleared) return;
  const x = s.note.balance / s.note.original;
  if (x > MARK_RATIO) {
    end(s, 'mark', 'marked');
    s.inbox.push({ kind: 'result', title: 'The Tong’s mark', text: 'Drelloth’s men find you. Your debt is past six times the note: from now on you carry what the Camonna Tong tells you to.' });
    log(s, 'You take the Tong’s mark.', 'bad');
    return;
  }
  for (const w of MARK_WARNINGS) {
    if (x > w && (s.markWarned ?? 0) < w) {
      s.markWarned = w;
      s.inbox.push({ kind: 'result', title: `Debt past ${w} times the note`, text: `You owe the Tong more than ${w} times what you first borrowed. Past ${MARK_RATIO} times (${Math.round(s.note.original * MARK_RATIO).toLocaleString('en-US')} septims) they put their mark on you and the game ends.` });
    }
  }
}

/** The run is won the moment the Scathing Charter (tier 3) is bought with the Tong paid off. */
export function win(s: GameState) {
  end(s, 'win', 'won');
  log(s, 'You take your seat among the Charter-Holders. The Red Year is yours.', 'history');
}

/** The end date retires you automatically, ranked by net worth. */
export function timeUp(s: GameState) { end(s, 'retire', 'calendar'); }

export function endingAction(s: GameState, a: Action): string | void {
  if (a.t !== 'retire') return;
  if (!s.milestones?.length) return 'You have nothing to retire on yet.';
  end(s, 'retire', 'retired');
}
