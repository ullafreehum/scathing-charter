// Books: since 0.10 their perks are always on, and the books themselves are Codex entries you find
// by visiting towns with bookshops.
import { C } from '../data';
import type { GameState } from './types';
import { here, logV, unlock } from './util';

export function findBooks(s: GameState) {
  if (!here(s)?.books) return;
  for (const b of C.books) {
    if (s.player.books.includes(b.id) || (b.from !== undefined && s.day < b.from)) continue;
    s.player.books.push(b.id);
    unlock(s, `book:${b.id}`); for (const u of b.unlocks) unlock(s, u);
    logV(s, 'book', 'neutral', b.title);
  }
}
