import type { Book } from '../engine/types';
import { U, IL } from './src';

// Summaries only (in-game book texts are not reproduced). Every book here has a gameplay perk;
// lore-only books were removed and their codex pages now unlock through places and history.
export const BOOKS: Book[] = [
  { id: 'pocket-guide', title: 'Pocket Guide to the Empire, Third Edition: Morrowind', author: 'the Imperial Geographic Society', price: 60, canon: 'canon', sources: [U('Pocket_Guide_to_the_Empire,_3rd_Edition/Morrowind')], perk: 'tendencies',
    summary: 'An Imperial survey written just before the Oblivion Crisis: Vvardenfell after the Nerevarine, the destruction of Dagoth Ur, Almalexia and Sotha Sil, the abolition of slavery and its “bloody” aftermath. Reading it reveals each market’s price leanings on the trade table.',
    quote: '“destroyed in the Nerevarine’s fury”', unlocks: ['topic:slavery', 'person:nerevarine', 'person:helseth'] },
  { id: 'moon-sugar-report', title: 'Moon-Sugar: A Report', author: 'an Imperial Trade Service agent', price: 30, canon: 'canon', sources: [U('Moon-Sugar:_A_Report'), U('Moon_Sugar')], perk: 'customs',
    summary: 'A biased, half-satirical official report on Elsweyr’s sugar, in which the Khajiit insist it is a “sacred, harmless cooking ingredient”. Reading it teaches you where customs men look (customs searches are less likely).',
    unlocks: ['good:moon-sugar', 'good:skooma', 'topic:bitter-coast'] },
  { id: 'progress-of-truth', title: 'Progress of Truth', author: 'the Dissident Priests', price: 20, canon: 'canon', sources: [IL('progress-truth'), U('Dissident_Priests')], perk: 'foreshadow',
    summary: 'A heretical tract arguing that the Tribunes were mortal mer who gained their power by theft, and that the Temple must change or die. Ordinators burned copies. Owning it makes omens easier to hear in taverns.',
    unlocks: ['topic:new-temple', 'faction:temple', 'person:vivec'] },
];
