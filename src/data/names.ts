import type { Race } from '../engine/types';
// Invented names built on LORE_BIBLE §8 conventions (no real NPCs intended).
const N: Record<Race, { given: string[]; family: string[]; style: 'family' | 'single' | 'byname' | 'khajiit' | 'argonian' | 'orc' }> = {
  Dunmer: { given: ['Aldyn', 'Belis', 'Dravyn', 'Eldasi', 'Fervas', 'Galsa', 'Ilvesi', 'Llevas', 'Mivali', 'Nedras', 'Rovone', 'Sevilo', 'Tirelli', 'Vadras'], family: ['Andalvi', 'Dethri', 'Gilnith', 'Indaram', 'Llethan', 'Morvel', 'Othrelas', 'Rothan', 'Salvani', 'Theran', 'Velas', 'Uvaram'], style: 'family' },
  Argonian: { given: ['Wanders-the-Reeds', 'Keeps-Her-Counsel', 'Sees-Far-Tides', 'Counts-the-Coins', 'Swims-Upriver', 'Hides-From-Rain'], family: ['Teeba', 'Haj', 'Keema', 'Mach', 'Wazei', 'Nujei', 'Ra'], style: 'argonian' },
  Imperial: { given: ['Aulus', 'Cassia', 'Decimus', 'Faustina', 'Lucan', 'Marcella', 'Octavia', 'Quintus', 'Severa', 'Tullius'], family: ['Arrenius', 'Brecca', 'Calvus', 'Fannius', 'Mercator', 'Rullus', 'Severan', 'Velatius'], style: 'family' },
  Khajiit: { given: ['Dhannar', 'Rassim', 'Zanji', 'Khirra', 'Saddo', 'Vashka', 'Ahjar', 'Marri'], family: ['J’', 'S’', 'Ra’', 'Dar', 'M’', 'Jo’'], style: 'khajiit' },
  Nord: { given: ['Brynja', 'Eirik', 'Gunnhild', 'Hrolf', 'Ingrid', 'Sven', 'Thora', 'Ulfgar', 'Yrsa'], family: ['Frost-Hand', 'Salt-Beard', 'Ice-Wake', 'Iron-Hide', 'Mead-Wise', 'Stone-Fist', 'Winter-Born'], style: 'byname' },
  Breton: { given: ['Alain', 'Celestine', 'Edouard', 'Gwenaelle', 'Lisette', 'Mathieu', 'Rosalind', 'Tristan'], family: ['Beaumont', 'Delacroix', 'Gervais', 'Lirrian', 'Marchand', 'Vessane'], style: 'family' },
  Altmer: { given: ['Aranwe', 'Calindil', 'Earaline', 'Linwenil', 'Soliras', 'Tanorian'], family: ['of Firsthold', 'of Skywatch', 'of Lillandril', 'of Cloudrest'], style: 'family' },
  Bosmer: { given: ['Aradell', 'Casnia', 'Elisgan', 'Mindra', 'Silgan', 'Tarim'], family: ['Fernwood', 'Mossbrook', 'Willowdale', 'Oakvale'], style: 'family' },
  Redguard: { given: ['Azzan', 'Iszari', 'Kemaru', 'Nadira', 'Saadun', 'Tavira'], family: ['al-Sentinel', 'at-Hunding', 'al-Rihad'], style: 'single' },
  Orc: { given: ['Bolag', 'Durza', 'Gorbash', 'Lazgara', 'Mogak', 'Shagra'], family: ['Bagol', 'Nagorm', 'Shub', 'Gharz'], style: 'orc' },
};

export function suggestName(race: Race, rand: () => number): string {
  const n = N[race];
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  switch (n.style) {
    case 'khajiit': return `${pick(n.family)}${pick(n.given)}`;
    case 'argonian': return rand() < 0.5 ? pick(n.given) : `${pick(n.family)}-${pick(['Ei', 'Jat', 'Tsoko', 'Deek', 'Wazei'])}`;
    case 'orc': return `${pick(n.given)} ${rand() < 0.5 ? 'gro' : 'gra'}-${pick(n.family)}`;
    case 'single': return rand() < 0.5 ? pick(n.given) : `${pick(n.given)} ${pick(n.family)}`;
    default: return `${pick(n.given)} ${pick(n.family)}`;
  }
}
