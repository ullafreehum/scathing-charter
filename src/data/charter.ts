// The Scathing Charter: an invented late-game goal (see LORE_BIBLE.md "Invented for this game").
// After the Red Year the Grand Council sells rights to supply and rebuild the ruined Vivec region.
import type { CharterTier } from '../engine/types';

export const CHARTER = {
  /** where charters are sold and renewed (relief and council seats after the eruption) */
  offices: ['mournhold', 'narsis', 'balmora'] as readonly string[],
  /** tier 2's warehouse; Ebonheart, the obvious port, is destroyed in the eruption */
  warehouse: 'narsis',
  tiers: [
    { tier: 1, name: 'Relief supplier licence', price: 15000, text: 'Relief contracts pay 25% more, and towns offer you more of them.' },
    { tier: 2, name: 'Warehouse at Narsis', price: 40000, text: 'Store any amount of cargo in Narsis, where it does not spoil: wait out a flooded market instead of dumping.' },
    { tier: 3, name: 'The Scathing Charter', price: 130000, text: 'Wins the game if you owe the Tong nothing. A share in rebuilding the Vivec region: a dividend every 30 days (halved while the war lasts) and the title Charter-Holder.' },
  ] as readonly CharterTier[],
  /** days each tier must be held before the council sells you the next one (the council vets you): the earliest win is day 517 */
  holdDays: [0, 30, 60],
  dividend: 4000,
  dividendEvery: 30,
  renewalFee: 0.2,
  renewalDays: 60,
  /** share of the price paid that counts toward net worth (what the rights would fetch if sold) */
  bookValue: 0.7,
  reliefPayBonus: 1.25,
} as const;
