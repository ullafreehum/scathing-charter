import type { Holiday } from '../engine/types';
import { U, UG } from './src';

const H = U('Holidays'), DF = UG('Daggerfall', 'Holidays');
// Customs are attested for 3E 389–417 sources; observance in 4E 4–6 is an extrapolation.
export const HOLIDAYS: Holiday[] = [
  { id: 'new-life', name: 'New Life Festival', month: 1, day: 1, scope: 'all', freeRumor: true, canon: 'canon', sources: [U('New_Life_Festival'), DF], text: 'The new year. Taverns pour free ale “despite financial difficulties”. Rumours cost nothing tonight.' },
  { id: 'scour-day', name: 'Scour Day', month: 1, day: 2, scope: ['cyrodiil'], canon: 'canon', sources: [U('Breton_Holidays')], text: 'Once the clean-up after New Life, now a party of its own (mostly in High Rock).' },
  { id: 'south-winds-prayer', name: 'South Wind’s Prayer', month: 1, day: 15, scope: 'all', freeHeal: true, canon: 'disputed', sources: [DF, H], text: 'A prayer for a good planting season. Temples heal for free, though “only a few will be judged worthy”. (Dated the 14th or 15th.)' },
  { id: 'feast-of-the-dead', name: 'Feast of the Dead', month: 2, day: 13, scope: ['skyrim'], canon: 'canon', sources: [U('Nord')], text: 'Windhelm remembers its dead.' },
  { id: 'hearts-day', name: 'Heart’s Day', month: 2, day: 16, scope: 'all', freeRest: true, canon: 'canon', sources: [U("Heart's_Day"), U('Legend_of_the_Lovers')], text: 'In honour of the lovers Polydor and Eloisa, inns give free rooms. Rest costs nothing today.' },
  { id: 'first-planting', name: 'First Planting', month: 3, day: 7, scope: 'all', freeHeal: true, canon: 'canon', sources: [H], text: 'Seeds are sown symbolically; neighbours settle disputes and temple clerics run free clinics all day.' },
  { id: 'hogithum', name: 'Hogithum', month: 3, day: 21, scope: ['vvardenfell', 'mainland'], canon: 'canon', sources: [H, UG('Daggerfall', 'Invocation_of_Azura')], text: 'Azura’s summoning day. Dunmeri priests hold a yearly ritual in the forests.' },
  { id: 'jesters-day', name: 'Jester’s Day', month: 4, day: 28, scope: 'all', canon: 'canon', sources: [H, U("Jester's_Festival")], text: 'Performers mock the powerful; pranks everywhere. The Thieves Guild picks pockets in the crowds.' },
  { id: 'second-planting', name: 'Second Planting', month: 5, day: 7, scope: 'all', freeHeal: true, canon: 'canon', sources: [H], text: 'The second and last free temple clinic of the year (battle wounds healed only at full price).' },
  { id: 'mid-year', name: 'Mid Year Celebration', month: 6, day: 16, scope: 'all', templeHalf: true, canon: 'canon', sources: [H], text: 'Temple blessings at half the usual donation, perhaps to soften the news of the Emperor’s yearly tax increase. There is no Emperor this year.' },
  { id: 'merchants-festival', name: 'Merchants’ Festival', month: 7, day: 10, scope: 'all', buyMult: 0.5, categories: ['food', 'drink', 'material', 'luxury', 'medicine'], canon: 'canon', sources: [DF], text: 'Every marketplace drops its prices to at least half. The Mages Guild does not take part (magic goods are excluded).' },
  { id: 'suns-rest', name: 'Sun’s Rest', month: 7, day: 20, scope: 'all', marketClosed: true, canon: 'disputed', sources: [H], text: 'Stores close; temples and taverns stay open. Most people rest rather than trade.' },
  { id: 'harvests-end', name: 'Harvest’s End', month: 8, day: 27, scope: 'all', freeRumor: true, buyMult: 0.85, categories: ['food'], canon: 'canon', sources: [DF, H], text: 'The farming year ends with free drinks in every tavern. Food is cheap.' },
  { id: 'tales-and-tallows', name: 'Tales and Tallows', month: 9, day: 3, scope: 'all', buyMult: 0.5, categories: ['magic'], canon: 'canon', sources: [U('Tales_and_Tallows'), DF], text: 'A day of the dead and spirits. Magic goods sell at half price, “in celebration of the oldest magical science, necromancy.”' },
  { id: 'witches-festival', name: 'Witches’ Festival', month: 10, day: 13, scope: 'all', canon: 'canon', sources: [H], text: 'Costumes and occult games mock ghosts and evil spirits; youths vandalise.' },
  { id: 'emperors-day', name: 'Emperor’s Day', month: 10, day: 30, scope: 'all', canon: 'canon', sources: [DF], text: 'The Emperor’s birthday, once the most popular holiday of the year and now neglected. In these years there is no Emperor to toast.' },
  { id: 'warriors-festival', name: 'Warriors Festival', month: 11, day: 20, scope: 'all', canon: 'canon', sources: [DF], text: 'Weapons at half price from smiths (and Mehrunes Dagon’s summoning day).' },
  { id: 'north-winds-prayer', name: 'North Wind’s Prayer', month: 12, day: 15, scope: 'all', templeHalf: true, canon: 'canon', sources: [H, DF], text: 'Thanks for the harvest and winter; every temple service at half the usual donation.' },
  { id: 'saturalia', name: 'Saturalia', month: 12, day: 25, scope: 'all', buyMult: 1.15, categories: ['luxury', 'drink'], canon: 'canon', sources: [U('Saturalia')], text: 'Once for a forgotten god of debauchery, now gifts, parties and parades. Luxuries and drink sell dear.' },
  { id: 'old-life', name: 'Old Life Festival', month: 12, day: 31, scope: 'all', canon: 'disputed', sources: [U('Old_Life_Festival'), DF], text: 'Remembrance of the dead. Rumour says priests perform free resurrections as the year’s last act. (Daggerfall dates it the 30th.)' },
];
