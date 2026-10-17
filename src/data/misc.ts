import type { Background, Faction, Gear } from '../engine/types';
import { U, UG } from './src';

export const FACTIONS: Faction[] = [
  { id: 'tong', name: 'Camonna Tong', canon: 'canon', sources: [U('Camonna_Tong')], text: 'Native Dunmer crime syndicate based in Balmora and Gnaar Mok. Under Orvas Dren it controlled Hlaalu councilors outright. It holds outlanders fit only for slavery and runs smuggling, kidnapping and extortion. Whether it survives the fall of House Hlaalu is unknown.' },
  { id: 'hlaalu', name: 'House Hlaalu', canon: 'canon', sources: [U('House_Hlaalu'), U('House_Sadras')], text: 'The merchant House, friend of the Empire and its trade. Scapegoated for Dunmer suffering after the Oblivion Crisis, it is stripped of Great House rank after the Red Year and replaced on the Council by House Sadras. It blames Redoran forever after.' },
  { id: 'redoran', name: 'House Redoran', canon: 'canon', sources: [U('House_Redoran'), U('Accession_War')], text: 'The warrior House of duty and honour. It runs the Red Year relief from Mournhold, halts the Argonian invasion with a re-raised army, moves the capital to Blacklight and becomes the first House of Morrowind.' },
  { id: 'telvanni', name: 'House Telvanni', canon: 'canon', sources: [U('House_Telvanni'), U('Neloth')], text: 'The House of wizards in mushroom towers, answerable to no law but power. Its councilors were thinned by an Arch-Mage’s death order in 3E 427, and the Argonian invasion nearly destroys it. Neloth survives on Solstheim.' },
  { id: 'temple', name: 'The Temple (Tribunal → New Temple)', canon: 'canon', sources: [U('Dissident_Priests'), U('The_Reclamations'), U('Ordinators')], text: 'The Tribunal Temple collapses with its gods. Former Dissident Priests lead a New Temple that calls the Tribunes “saints” and venerates the Reclamations: Azura, Boethiah and Mephala. Ordinators are disbanded and persecuted; the Ashlanders are vindicated.' },
  { id: 'eec', name: 'East Empire Company', canon: 'canon', sources: [U('East_Empire_Company')], text: 'The Imperial chartered company, with exclusive rights to raw ebony, raw glass, stalhrim and Dwemer artefacts in Morrowind and Solstheim, and “unclear dealings with the Thalmor” later in the era. With no Emperor, whose charter it obeys is unrecorded.' },
  { id: 'legion', name: 'Imperial authorities', canon: 'canon', sources: [U('Fort_Frostmoth'), U('Elder_Council')], text: 'The Legion, the Elder Council under Potentate Ocato, and the counts and jarls who still answer to them. Your standing with “the Empire”.' },
  { id: 'anxileel', name: 'An-Xileel', canon: 'canon', sources: [U('An-Xileel'), U('Kingdom_of_Black_Marsh')], text: 'The Argonian party, formed in the Oblivion Crisis, that united most Argonians, sacked the Imperial colonies and renamed Black Marsh Argonia. Its governing body, the Organism, sits in Lilmoth. It leads the invasion of Morrowind.' },
  { id: 'skaal', name: 'The Skaal', canon: 'canon', sources: [U('Skaal'), U('All-Maker'), U('Stalhrim')], text: 'A Nord offshoot tribe of northern Solstheim who worship the All-Maker. Stalhrim is holy to them, and they are traditionally wary of outsiders (though one book calls them “impressively hospitable”).' },
];

export const GEAR: Gear[] = [
  { id: 'pack-guar', kind: 'conveyance', name: 'Pack guar', price: 0, power: 0, capacity: 60, canon: 'canon', sources: [IL_GUAR()], text: 'A placid, two-legged Dunmer beast of burden. Carries 60 stone.' },
  { id: 'guar-cart', kind: 'conveyance', name: 'Guar cart', price: 2400, power: 0, capacity: 140, canon: 'invented', sources: [], text: 'Carries 140 stone.' },
  { id: 'chartered-hold', kind: 'conveyance', name: 'Chartered hold', price: 14000, power: 0, capacity: 320, canon: 'invented', sources: [], text: 'A standing charter of ship space: 320 stone, sea legs a day shorter, 10 septims a day upkeep.' },
  { id: 'chitin-dagger', kind: 'weapon', name: 'Chitin dagger', price: 0, power: 1, canon: 'unverified', sources: [], text: 'Insect-shell blade of the poor Dunmer.' },
  { id: 'iron-longsword', kind: 'weapon', name: 'Iron longsword', price: 180, power: 3, canon: 'unverified', sources: [], text: 'Plain Imperial iron.' },
  { id: 'steel-axe', kind: 'weapon', name: 'Steel war axe', price: 450, power: 5, canon: 'unverified', sources: [], text: 'Nord steel, honestly forged.' },
  { id: 'ebony-scimitar', kind: 'weapon', name: 'Ebony-edged scimitar', price: 2600, power: 8, canon: 'unverified', sources: [], text: 'Black ebony, heavy and wickedly sharp.' },
  { id: 'netch-jerkin', kind: 'armor', name: 'Netch leather', price: 0, power: 1, canon: 'unverified', sources: [], text: 'Boiled netch hide.' },
  { id: 'chitin-cuirass', kind: 'armor', name: 'Chitin cuirass', price: 220, power: 2, canon: 'unverified', sources: [], text: 'Laminated insect shell, light and tough.' },
  { id: 'bonemold', kind: 'armor', name: 'Bonemold armour', price: 700, power: 4, canon: 'unverified', sources: [], text: 'Bone shaped and bonded with resin: the Redoran style.' },
  { id: 'imperial-steel', kind: 'armor', name: 'Imperial steel plate', price: 1100, power: 5, canon: 'unverified', sources: [], text: 'Legion plate, a little dented.' },
  { id: 'chameleon', kind: 'scroll', name: 'Scroll of Chameleon', price: 150, power: 0, canon: 'canon', sources: [U('Spells_A')], text: 'Bends light around you: slip past bandits (9 in 10) or a customs search (3 in 4).' },
  { id: 'almsivi', kind: 'scroll', name: 'Scroll of Almsivi Intervention', price: 60, power: 0, canon: 'extrapolation', sources: [U('Spells_A'), UG('Morrowind', 'Transport')], text: 'Carries you to the nearest Tribunal temple, with only what fits on your back. UESP: what became of this spell after the Temple dissolved “is unknown”. Here it grows less reliable as faith fails (extrapolation).' },
  { id: 'divine', kind: 'scroll', name: 'Scroll of Divine Intervention', price: 80, power: 0, canon: 'canon', sources: [UG('Morrowind', 'Transport')], text: 'Carries you to the nearest Imperial shrine, with only what fits on your back.' },
];
function IL_GUAR() { return U('Guar'); }

export const BACKGROUNDS: Background[] = [
  { id: 'hlaalu-bastard', name: 'Hlaalu Factor’s By-Blow', race: 'Dunmer', combat: 0, customsMod: 1, feeMult: 0.5, licence: false,
    rep: { hlaalu: 20, redoran: -10, tong: 5 }, text: 'Your father kept the Hlaalu books in Narsis; your mother kept his secret. You know how counting-houses think.',
    perk: 'Counting-house fees halved; Hlaalu +20.', burden: 'Redoran −10; Hlaalu’s fall will hurt.' },
  { id: 'lukiul', name: 'Freed under Helseth’s Decree', race: 'Argonian', combat: 1, customsMod: 1.3, feeMult: 1, licence: true,
    rep: { anxileel: 25, tong: -20, temple: -5 }, buyMods: { washtongue: 0.9 }, text: 'You were sold in Tear and freed by King Helseth’s abolition in 3E 430. You are lukiul now, Argonian by birth and Imperial by habit, and the drykillers wave you through.',
    perk: 'Lilmoth licence free; An-Xileel +25.', burden: 'The Tong hates you; Dunmer customs search you more.' },
  { id: 'deserter', name: 'Ebonheart Deserter', race: 'Imperial', combat: 2, customsMod: 1.25, feeMult: 1, licence: false, fenceBonus: 0.1,
    rep: { legion: -30, eec: -5 }, text: 'You walked out of Castle Ebonheart with a sword and the Company’s smuggling routes in your head.',
    perk: 'Combat +2; fences pay 10% more.', burden: 'The Legion wants you (−30); customs search you more.' },
  { id: 'caravaner', name: 'Senchal Caravaner', race: 'Khajiit', combat: 1, customsMod: 1.3, feeMult: 1, licence: false, fenceBonus: 0.1,
    rep: { tong: -5 }, buyMods: { 'moon-sugar': 0.85, saltrice: 0.95 }, text: 'This one knows every cove of Topal Bay and every Khajiit fence in Balmora, yes?',
    perk: 'Moon sugar −15% to buy; fences pay 10% more.', burden: 'Customs search Khajiit carts first.' },
  { id: 'sellsword', name: 'Eastmarch Sellsword', race: 'Nord', combat: 3, customsMod: 1, feeMult: 1, licence: false,
    rep: { legion: 5, hlaalu: -5 }, startItems: { weapon: 'steel-axe' }, buyMods: { 'nord-mead': 0.9 }, text: 'You came over the Dunmeth Pass guarding someone else’s caravan, and stayed for someone else’s money.',
    perk: 'Combat +3; starts with a steel axe.', burden: 'Dunmer merchants are cool to you.' },
  { id: 'telvanni-hireling', name: 'Telvanni Hireling', race: 'Breton', combat: 0, customsMod: 1, feeMult: 1, licence: false,
    rep: { telvanni: 20, temple: -10 }, startItems: { scrolls: { chameleon: 2 } }, buyMods: { 'soul-gems': 0.85 }, text: 'You fetched and carried for a Telvanni wizard until the wizard forgot your name. You kept the scrolls.',
    perk: 'Two Chameleon scrolls; soul gems −15%; Telvanni +20.', burden: 'The Temple distrusts you.' },
];

export const ACHIEVEMENTS: { id: string; name: string; text: string }[] = [
  { id: 'first-profit', name: 'First Septim', text: 'Turn a profit on a sale.' },
  { id: 'note-cleared', name: 'The Note Burns', text: 'Pay off the Camonna Tong.' },
  { id: 'unbowed', name: 'Unbowed by the Tong', text: 'Clear the note before the Red Year.' },
  { id: 'witness', name: 'Witness at Scathing Bay', text: 'Be at Vivec or Ebonheart when Baar Dau falls, and live.' },
  { id: 'hedged', name: 'The Prudent Ledger', text: 'Hold 1,000+ in deposits on 3 Sun’s Dawn 4E 5 and lose none of it.' },
  { id: 'five-provinces', name: 'Five Provinces', text: 'Trade in Morrowind, Skyrim, Cyrodiil, Black Marsh and Elsweyr.' },
  { id: 'licensed', name: 'Ojel with Papers', text: 'Buy an An-Xileel trade licence.' },
  { id: 'bookworm', name: 'Bookworm', text: 'Own all three books.' },
  { id: 'lorekeeper', name: 'Lorekeeper', text: 'Unlock 60 codex entries.' },
  { id: 'loremaster', name: 'Loremaster', text: 'Unlock 140 codex entries.' },
  { id: 'frostmoth', name: 'Last Mess at Frostmoth', text: 'Visit Fort Frostmoth before it falls.' },
  { id: 'smuggler', name: 'Smuggler of the Bitter Coast', text: 'Sell 50 units of contraband.' },
  { id: 'saint', name: 'Saint’s Ledger', text: 'Earn 60 Mercy.' },
  { id: 'profiteer', name: 'Famine-Fattened', text: 'Profit 3,000 septims selling food and medicine in stricken towns.' },
  { id: 'blade', name: 'Road-Hardened', text: 'Win five fights.' },
  { id: 'ten-thousand', name: 'Ten Thousand Drakes', text: 'Reach a net worth of 10,000.' },
  { id: 'merchant-prince', name: 'Merchant-Prince', text: 'Reach a net worth of 100,000.' },
  { id: 'relief', name: 'Redoran’s Thanks', text: 'Deliver three relief contracts.' },
  { id: 'contractor', name: 'Bonded Carrier', text: 'Complete ten contracts.' },
  { id: 'survivor', name: 'Survivor of the Red Year', text: 'Reach 31 Evening Star 4E 6 alive.' },
  { id: 'chronicler', name: 'Through the Interregnum', text: 'See Titus Mede take the Imperial City.' },
];
