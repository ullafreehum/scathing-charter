import type { Book } from '../engine/types';
import { D } from '../engine/calendar';
import { U, IL } from './src';

// Summaries only (in-game book texts are not reproduced).
export const BOOKS: Book[] = [
  { id: 'pocket-guide', title: 'Pocket Guide to the Empire, Third Edition: Morrowind', author: 'the Imperial Geographic Society', price: 60, canon: 'canon', sources: [U('Pocket_Guide_to_the_Empire,_3rd_Edition/Morrowind')], perk: 'tendencies',
    summary: 'An Imperial survey written just before the Oblivion Crisis: Vvardenfell after the Nerevarine, the destruction of Dagoth Ur, Almalexia and Sotha Sil, the abolition of slavery and its “bloody” aftermath. Reading it reveals each market’s price leanings on the trade table.',
    quote: '“destroyed in the Nerevarine’s fury”', unlocks: ['topic:slavery', 'person:nerevarine', 'person:helseth'] },
  { id: 'argonian-account', title: 'The Argonian Account', author: 'Waughin Jarth', price: 25, canon: 'canon', sources: [U('The_Argonian_Account')], perk: 'none',
    summary: 'A satire of the Imperial clerk Decumus Scotti, sent to fix the Imperial Commerce Road from Gideon into Black Marsh, where goods took two and a half months to arrive, “now thoroughly rotten”. The Imperial view of the swamp, mocking itself.',
    unlocks: ['topic:commerce-road', 'faction:anxileel'] },
  { id: 'moon-sugar-report', title: 'Moon-Sugar: A Report', author: 'an Imperial Trade Service agent', price: 30, canon: 'canon', sources: [U('Moon-Sugar:_A_Report'), U('Moon_Sugar')], perk: 'customs',
    summary: 'A biased, half-satirical official report on Elsweyr’s sugar, in which the Khajiit insist it is a “sacred, harmless cooking ingredient”. Reading it teaches you where customs men look (customs searches are less likely).',
    unlocks: ['good:moon-sugar', 'good:skooma', 'topic:bitter-coast'] },
  { id: 'progress-of-truth', title: 'Progress of Truth', author: 'the Dissident Priests', price: 20, canon: 'canon', sources: [IL('progress-truth'), U('Dissident_Priests')], perk: 'foreshadow',
    summary: 'A heretical tract arguing that the Tribunes were mortal mer who gained their power by theft, and that the Temple must change or die. Ordinators burned copies. Owning it makes omens easier to hear in taverns.',
    unlocks: ['topic:new-temple', 'faction:temple', 'person:vivec'] },
  { id: 'seasons-of-argonia', title: 'The Seasons of Argonia', author: 'unknown', price: 25, canon: 'canon', sources: [U('The_Seasons_of_Argonia')], perk: 'none',
    summary: 'The Argonian months and their moods, from Vakka (respect for elders) through Xeech, the First Mourning, to Xulomaht, the Deceased and the strongest mourning of all.',
    unlocks: ['topic:jel-calendar', 'topic:calendar'] },
  { id: 'ancestors', title: 'Ancestors and the Dunmer', author: 'unknown', price: 30, canon: 'unverified', sources: [IL('ancestors-and-dunmer')], perk: 'none',
    summary: 'On Dunmer ancestor worship, the family shrines and the honoured dead of Necrom. [Summary from memory; unverified.]',
    unlocks: ['loc:necrom', 'topic:ancestors'] },
  { id: 'red-year-1', title: 'The Red Year, Vol. I', author: 'Melis Ravel', price: 45, canon: 'canon', from: D(8, 1, 1), sources: [U('The_Red_Year,_Vol._I'), IL('red-year-vol-i')], perk: 'none',
    summary: 'First-hand accounts gathered across Morrowind: Neria Relethyl, the only known survivor of Gnisis; the Redoran relief out of Mournhold; Deros Dran’s two months rebuilding Balmora. Patriotic, devout and heartbreaking. (Its publication date is unknown; this ledger puts it on sale from 4E 8.)',
    quote: '“when I could finally stand, Gnisis was gone”', unlocks: ['event:red-year-eruption', 'person:melis-ravel'] },
  { id: 'red-year-2', title: 'The Red Year, Vol. II', author: 'Melis Ravel', price: 45, canon: 'canon', from: D(8, 1, 1), sources: [U('The_Red_Year,_Vol._II'), IL('red-year-vol-ii')], perk: 'none',
    summary: 'More testimony: a guar trader on the south road from Vivec City recalls a sudden, unnatural silence, the guar going wild, a blast from the city centre and a pillar of fire from the mountain. He fled to Narsis.',
    quote: '“a sudden, unnatural silence”', unlocks: ['loc:narsis', 'topic:scathing-bay'] },
  { id: 'history-raven-rock', title: 'History of Raven Rock', author: 'unknown', price: 35, canon: 'canon', from: D(17, 1, 1), sources: [U('History_of_Raven_Rock'), IL('history-raven-rock')], perk: 'none',
    summary: 'From the Company colony of 3E 427 through the Riekling raid, the Red Year, the Bulwark and the handover to House Redoran in 4E 16.',
    unlocks: ['loc:raven-rock', 'person:brara-morvayn'] },
];
