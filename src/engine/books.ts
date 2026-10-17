// Books from booksellers.
import { C } from '../data';
import type { Action, GameState } from './types';
import { here, unlock } from './util';

export function bookAction(s: GameState, a: Action): string | void {
  switch (a.t) {
    case 'book': {
      const b = C.books.find(x => x.id === a.id); if (!b) return 'No such book.';
      if (!here(s).books) return 'No bookseller here.';
      if (s.player.books.includes(b.id)) return 'You own it.';
      if (b.from !== undefined && s.day < b.from) return 'Not yet written.';
      if (s.player.cash < b.price) return `It costs ${b.price}.`;
      s.player.cash -= b.price; s.player.books.push(b.id);
      unlock(s, `book:${b.id}`); for (const u of b.unlocks) unlock(s, u);
      return;
    }
  }
}
