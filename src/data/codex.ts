import type { CodexEntry } from '../engine/types';
import { U, UG, IL } from './src';

type C = CodexEntry;
const d = (id: string, title: string, body: string, claims: C['claims'], defaultReading: string, sources: string[]): C =>
  ({ id: `dispute:${id}`, category: 'dispute', title: `${id}: ${title}`, body, claims, defaultReading, canon: 'disputed', sources });

export const DISPUTES: C[] = [
  d('D-01', 'The day the sky fell', 'Only one source names the day of the eruption.', [
    { voice: 'UESP, Lore:Red_Year', text: '3 Sun’s Dawn 4E 5.', source: U('Red_Year') },
    { voice: 'UESP, Lore:Red_Mountain and others', text: 'Only “4E 5”.', source: U('Red_Mountain') }], 'This ledger uses 3 Sun’s Dawn 4E 5.', [U('Red_Year')]),
  d('D-02', 'Was Mournhold sacked?', 'Sources split on whether the capital fell to the Argonians.', [
    { voice: 'UESP and Adril Arano (Redoran, 3rd c. 4E)', text: 'Mournhold “fell to the Argonians” in 4E 6.', source: U('Mournhold') },
    { voice: 'The Red Year (as flagged by the Imperial Library)', text: 'Mournhold stayed safe (in the context of the eruption).', source: IL('topic-morrowind-in-the-4th-era') }], 'Sacked, 18 First Seed 4E 6 (day ours).', [U('Mournhold')]),
  d('D-03', 'When did Blacklight become capital?', '', [
    { voice: 'UESP, Lore:Blacklight', text: 'After Mournhold’s sack in the Accession War (4E 6).', source: U('Blacklight') },
    { voice: 'UESP, Lore:House_Redoran', text: 'After the Red Year (4E 5).', source: U('House_Redoran') }], 'After the sack.', [U('Blacklight')]),
  d('D-04', 'What became of Vivec?', 'The last Tribune vanished before the Red Year; how is unknown.', [
    { voice: 'UESP, Lore:Vivec', text: 'Stripped of divinity, slipped into unrecorded planes, “steals from them for amusement”.', source: U('Vivec') },
    { voice: 'Mask of Vivec (Skyrim)', text: 'Tried at Hogithum Hall in the Imperial City, where he tricked the council into summoning Azura; or taken by Daedra.', source: UG('Skyrim', 'Mask_of_Vivec') }], 'Unknown; voiced only as rumour.', [U('Vivec')]),
  d('D-05', 'How long was the Accession War?', '', [
    { voice: 'UESP, Lore:Accession_War; Imperial Library', text: '4E 5 to c. 4E 6, with the advance stopping “between 4E 6 and 4E 28”.', source: U('Accession_War') },
    { voice: 'UESP, Lore:Wars', text: '4E 6 to c. 4E 28.', source: U('Wars') }], 'Begins late 4E 5, halted 1 Hearthfire 4E 6 (days ours); skirmishes after.', [U('Accession_War')]),
  d('D-06', 'When did Black Marsh leave the Empire?', '', [
    { voice: 'UESP, Lore:An-Xileel', text: 'Right after the Oblivion Crisis.', source: U('An-Xileel') },
    { voice: 'UESP, Lore:Fourth_Era', text: '4E 5–10, after Red Mountain exploded.', source: U('Fourth_Era') },
    { voice: 'UESP, Lore:Kingdom_of_Black_Marsh', text: 'After the Thalmor incited an Argonian uprising.', source: U('Kingdom_of_Black_Marsh') }], 'Already independent in 4E 4.', [U('An-Xileel')]),
  d('D-07', 'Did House Telvanni fall?', '', [
    { voice: 'UESP, Lore:House_Telvanni', text: 'Its last stronghold was sacked c. 4E 6.', source: U('House_Telvanni') },
    { voice: 'UESP, Lore:Accession_War; talk page', text: '“Almost” destroyed; the House survived (Neloth).', source: U('Accession_War') }], 'Telvanni lands overrun mid-4E 6; the House survives.', [U('House_Telvanni')]),
  d('D-08', 'When did the Mages Guild end?', '', [
    { voice: 'UESP, Lore:Synod', text: 'At the start of the Fourth Era.', source: U('Synod') },
    { voice: 'UESP, Lore:Mages_Guild', text: 'Some time before 4E 48.', source: U('Mages_Guild') },
    { voice: 'UESP, Lore:Travelers_League', text: 'Presumably dissolved after the Oblivion Crisis.', source: U('Travelers_League') }], 'Guild Guides stop in Frostfall 4E 4 (ours).', [U('Mages_Guild')]),
  d('D-09', 'When was Ocato killed?', '', [
    { voice: 'UESP, Lore:Ocato_of_Firsthold & Stormcrown Interregnum', text: 'c. 4E 15, counted back seven years from c. 4E 22.', source: U('Stormcrown_Interregnum') },
    { voice: 'UESP Fourth Era timeline; Imperial Library timeline', text: '4E 10.', source: IL('fourth-era') }], 'c. 4E 15.', [U('Ocato_of_Firsthold')]),
  d('D-10', 'When did Titus Mede take the throne?', '', [
    { voice: 'UESP, Lore:Titus_Mede_I & Mede_Dynasty', text: 'c. 4E 22.', source: U('Titus_Mede_I') },
    { voice: 'Imperial Library timeline (citing Rising Threat)', text: '4E 17; UESP talk calls it uncorroborated.', source: IL('fourth-era') }], 'c. 4E 22 (we crown him on Emperor’s Day).', [U('Titus_Mede_I')]),
  d('D-11', 'Why did Helseth free the slaves?', '', [
    { voice: 'UESP, Lore:Accession_War', text: 'Abolition (3E 430) sparked the civil war.', source: U('Accession_War') },
    { voice: 'UESP, Lore:Slavery & Hlaalu_Helseth', text: 'Indoril and Redoran rose over his Dres marriage; abolition came six months later, to incite slave revolts.', source: U('Slavery') },
    { voice: 'UESP, Lore:House_Dres', text: 'Dates the renunciation to 3E 433.', source: U('House_Dres') }], 'Abolished; the motive is disputed.', [U('Slavery')]),
  d('D-12', 'Why did the Argonians invade?', '', [
    { voice: 'UESP, Lore:Accession_War', text: 'Revenge for millennia of slavery.', source: U('Accession_War') },
    { voice: 'Imperial Library timeline', text: '“Urged on by the Hist”.', source: IL('fourth-era') },
    { voice: 'UESP, Lore:Thalmor (from the biased Rising Threat IV)', text: 'Thalmor incitement.', source: U('Rising_Threat,_Vol._IV') },
    { voice: 'Adril Arano', text: '“Nobody seems certain why.”', source: UG('Skyrim', 'Adril_Arano') }], 'Unknown.', [U('Accession_War')]),
  d('D-13', 'Who closed the gates in Black Marsh?', '', [
    { voice: 'UESP, Lore:Argonian', text: 'The Hist recalled and changed the Argonians, who stormed the gates.', source: U('Argonian') },
    { voice: 'An-Xileel claim (UESP, Lore:Oblivion_Crisis)', text: 'The An-Xileel organised the defence.', source: U('Oblivion_Crisis') }], 'Both voiced.', [U('Argonian')]),
  d('D-14', 'Who killed Ocato?', '', [
    { voice: 'Rising Threat IV (Lathenil, anti-Thalmor exile)', text: 'Thalmor agents.', source: U('Rising_Threat,_Vol._IV') },
    { voice: 'UESP talk page', text: 'The claim rests on one biased book.', source: UG('Lore_talk', 'Fourth_Era') }], 'Unknown.', [U('Ocato_of_Firsthold')]),
  d('D-15', 'Did the Legions abandon Morrowind?', '', [
    { voice: 'Adril Arano (Redoran)', text: 'The Legion was withdrawn during the Crisis.', source: U("Ald'ruhn") },
    { voice: 'Ocato (Oblivion)', text: 'Provincial forces were “fully committed”; none came home.', source: U('Oblivion_Crisis') }], 'Both voiced.', [U('Oblivion_Crisis')]),
  d('D-16', 'When did the Company leave Solstheim?', '', [
    { voice: 'History of Raven Rock', text: 'Forced to relinquish Raven Rock in 4E 16.', source: IL('history-raven-rock') },
    { voice: 'UESP, Lore:Raven_Rock', text: 'Had withdrawn earlier, the mine being unprofitable.', source: U('Raven_Rock') }], '4E 16.', [U('Raven_Rock')]),
  d('D-17', 'When did the Redoran reach Raven Rock?', '', [
    { voice: 'UESP, Lore:Solstheim', text: '4E 1.', source: U('Solstheim') },
    { voice: 'History of Raven Rock', text: 'After Ald’ruhn fell; date unstated.', source: IL('history-raven-rock') }], 'Before 4E 4.', [U('Solstheim')]),
  d('D-18', 'Why did the Dunmer flee?', '', [
    { voice: 'UESP, Lore:Skyrim', text: 'The Red Year’s disasters.', source: U('Skyrim') },
    { voice: 'UESP, Lore:Dunmer & Accession_War', text: 'The Argonian invasion.', source: U('Dunmer') }], 'Both: two waves.', [U('Skyrim')]),
  d('D-19', 'What does “Gray Quarter” mean?', 'Two partisan books, written much later.', [
    { voice: 'Athal Sarys, The Dunmer of Skyrim', text: 'A victory: “the reality of the Dunmer occupation”.', source: IL('dunmer-skyrim') },
    { voice: 'Frilgeth Horse-Breaker, Scourge of the Gray Quarter', text: 'Squalor and crime.', source: IL('scourge-gray-quarter') }], 'Neither; both are quoted.', [U('Windhelm')]),
  d('D-20', 'Why did Baar Dau fall?', '', [
    { voice: 'UESP, Lore:Red_Year', text: 'With Vivec gone, nothing held it.', source: U('Red_Year') },
    { voice: 'UESP, Lore:Ingenium', text: 'Vuhon’s soul-engine held it until Sul’s rescue of Ilzheven broke it.', source: U('Ingenium') }], 'A chain: absence, then engine, then failure.', [U('Ingenium')]),
  d('D-21', 'Who rules Necrom?', '', [
    { voice: 'UESP, Lore:House_Dres', text: 'House Dres.', source: U('House_Dres') },
    { voice: 'UESP, Lore:Necrom', text: 'House Indoril, after absorbing the Temple and Dead Keepers.', source: U('Necrom') }], 'Indoril and the Temple.', [U('Necrom')]),
  d('D-22', 'How fast do the moons turn?', '', [
    { voice: 'Oblivion orrery', text: '24 days, phase-locked.', source: UG('Oblivion', 'Repairing_the_Orrery') },
    { voice: 'Calcinator Treatise (talk page)', text: '28 days.', source: UG('Lore_talk', 'Moons') }], 'Masser 24, Secunda 28 (extrapolation).', [U('Moons')]),
  d('D-23', 'What day of the week is it?', '', [
    { voice: 'Skyrim calendar', text: '17 Last Seed 4E 201 is a Sundas.', source: UG('Skyrim', 'Calendar') },
    { voice: 'Skyrim statistics page', text: 'The game starts on a Morndas.', source: UG('Skyrim', 'Statistics') }], 'Sundas, so 1 Morning Star 4E 4 is a Tirdas.', [U('Calendar')]),
  d('D-24', 'Did the Thalmor save Summerset?', '', [
    { voice: 'Thalmor claim (UESP, Lore:Altmer)', text: '“Deep and subtle magicks” saved the isles.', source: U('Altmer') },
    { voice: 'The Great War (Imperial legate)', text: 'The Crystal Tower fell anyway.', source: U('The_Great_War_(book)') }], 'Both voiced.', [U('Thalmor')]),
];

const t = (id: string, category: C['category'], title: string, body: string, canon: C['canon'], sources: string[]): C => ({ id, category, title, body, canon, sources });

export const EXTRA_CODEX: C[] = [
  ...DISPUTES,
  t('topic:scathing-charter', 'invented', 'The Scathing Charter', 'After the Red Year the Grand Council sells rights to supply and rebuild the ruined Vivec region, named for Scathing Bay, the crater where Vivec City stood (invented for this game). Three tiers are sold in Mournhold, Narsis and Balmora to traders who owe the Camonna Tong nothing: a relief supplier licence, a warehouse at Narsis, and the full charter, which pays a share of the rebuilding every 30 days. When House Hlaalu loses its seat, the new council makes holders renew.', 'invented', [U('Scathing_Bay'), U('Red_Year')]),
  t('topic:the-note', 'invented', 'The Note', 'Your debt to Gavas Drelloth, a Camonna Tong usurer at the Council Club in Balmora (invented). It compounds daily. Pay at his seat or to Tong agents. The longer you avoid him, the more his collectors find you on the road.', 'invented', [U('Camonna_Tong')]),
  t('topic:writ-of-coin', 'travel', 'Writs of coin', 'Banks can issue loans or letters of credit in gold, sometimes called a “writ of coin”. In this ledger, money left in a strongbox stays in that city: there are no transfers.', 'canon', [U('Currency')]),
  t('topic:house-hlaalu', 'invented', 'Hlaalu Council Counting-House', 'An invented Hlaalu-chartered bank with branches in Balmora, Vivec City, Narsis and Mournhold. In this ledger its vaults are city strongboxes. Its branches stand where history will strike.', 'invented', [U('House_Hlaalu')]),
  t('topic:house-eec', 'invented', 'East Empire Company strongrooms', 'An invented banking role for a canon company: deposits held at Ebonheart, Raven Rock, Solitude and the Imperial City. In this ledger its vaults are city strongboxes.', 'invented', [U('East_Empire_Company')]),
  t('topic:calendar', 'calendar', 'The Tamrielic calendar', 'Twelve months, 365 days: Morning Star, Sun’s Dawn (28 days), First Seed, Rain’s Hand, Second Seed, Midyear, Sun’s Height, Last Seed, Hearthfire, Frostfall, Sun’s Dusk, Evening Star. Weeks run Morndas to Sundas. Counting back from a Sundas in 4E 201 makes 1 Morning Star 4E 4 a Tirdas: “Imperial reckoning”, our extrapolation.', 'canon', [U('Calendar'), UG('Skyrim', 'Calendar')]),
  t('topic:jel-calendar', 'calendar', 'The Argonian months', 'Vakka, Xeech, Sisei, Hist-Deek, Hist-Dooka, Hist-Tsoko, Thtithil-Gah, Thtithil, Nushmeeko, Shaja-Nushmeeko, Saxhleel, Xulomaht. The year holds three Mournings: in Xeech, Hist-Tsoko and Xulomaht, “the Deceased”.', 'canon', [U('Calendar'), U('The_Seasons_of_Argonia')]),
  t('topic:moons', 'calendar', 'Masser and Secunda', 'Two moons, Jone and Jode to the Khajiit, Masser “well over twice” Secunda’s size. Their motion builds the Lunar Lattice (ja-Kha’jay), and a Khajiit’s form depends on their phases at birth. Cycle lengths are disputed (D-22).', 'canon', [U('Moons'), U('Khajiit')]),
  t('topic:almsivi', 'travel', 'Almsivi Intervention', 'A spell carrying the caster to the nearest Tribunal temple. “What became of this spell after the Temple’s dissolution in the early Fourth Era is unknown.” This ledger makes it fail more often as faith collapses: an extrapolation.', 'extrapolation', [U('Spells_A')]),
  t('topic:ingenium', 'event', 'The Ingenium', 'A soul-consuming device built by the Dunmer mage Vuhon, with Sul, to hold Baar Dau aloft after Vivec vanished. It drew souls through a rift. When Sul tried to rescue his lover Ilzheven from it, it failed and the moonlet fell.', 'canon', [U('Ingenium'), U('Baar_Dau')]),
  t('topic:red-mountain', 'place', 'Red Mountain', 'The volcano at the heart of Vvardenfell. Under it lay the Heart of Lorkhan and Dagoth Ur’s citadel, and the Tribunal’s Ghostfence ringed its crater for centuries.\n\nIn 4E 5, the year the Ministry of Truth (Baar Dau) fell on Vivec City, Red Mountain erupted. Ash and fire buried much of the island: the Red Year.', 'canon', [U('Red_Mountain'), U('Red_Year')]),
  t('topic:scathing-bay', 'place', 'Scathing Bay', 'The boiling crater where Vivec City stood: “an island ruin of shattered stone and ash”. By 4E 48 Argonians hold the area around it.', 'canon', [U('Vivec_City')]),
  t('topic:new-temple', 'faction', 'The New Temple', 'Led by former Dissident Priests, it calls Tribune worship “the product of misguided teaching”, makes Almalexia, Sotha Sil and Vivec saints, and venerates Azura, Boethiah and Mephala as “the true way”.', 'canon', [U('The_Reclamations'), U('Dissident_Priests')]),
  t('topic:slavery', 'event', 'Slavery in Morrowind', 'Slavery was illegal elsewhere in the Empire but protected in Morrowind by the Armistice. King Helseth abolished it in 3E 430, “apparently successful”, though enforced unevenly. In this ledger people are never cargo.', 'canon', [U('Slavery')]),
  t('topic:gray-quarter', 'place', 'The Snow Quarter, later the Gray Quarter', 'Windhelm put its Dunmer refugees in the run-down Snow Quarter, later renamed the Gray Quarter after them, under “constant suspicion from the xenophobic local Nords”.', 'canon', [U('Windhelm')]),
  t('topic:lilmoth-licence', 'invented', 'The Lilmoth licence', 'The An-Xileel let only licensed foreigners into Lilmoth. In this ledger the licence is a permit you buy at the gate or from an Argonian factor in Leyawiin.', 'extrapolation', [IL('infernal-city-lore-notes-black-marsh')]),
  t('topic:commerce-road', 'travel', 'The Imperial Commerce Road', 'Decades of Imperial road-building out of Gideon. Goods still took two and a half months, “now thoroughly rotten”: satire written from the Imperial side.', 'canon', [U('The_Argonian_Account')]),
  t('topic:bitter-coast', 'place', 'The Bitter Coast', 'The swampy south-west shore of Vvardenfell, whose caves are the classic landing for smuggled moon sugar.', 'canon', [U('Moon_Sugar')]),
  t('topic:ancestors', 'faction', 'Ancestor worship', 'The Dunmer honour their dead, and Necrom is the centre of that worship. Even the fallen Tribunes become “saints”, the traditional honour of the most revered ancestors.', 'canon', [U('Necrom'), U('The_Reclamations')]),
  t('topic:fan-exclusions', 'invented', 'What this ledger leaves out', 'Fan projects (Tamriel Rebuilt, Tamriel Data, Beyond Skyrim, Project Tamriel, the Uutak Mythos calendar) are not canon and are not used.', 'invented', []),
  t('person:ocato', 'person', 'Ocato of Firsthold', 'Altmer battlemage, Imperial Battlemage and High Chancellor from 3E 399, Potentate from 4E 1. He took the Thalmor more seriously than most. Assassinated c. 4E 15 (or 4E 10).', 'canon', [U('Ocato_of_Firsthold')]),
  t('person:helseth', 'person', 'Hlaalu Helseth', 'King of Morrowind from 3E 427. He married Lady Vendama of Bodrum Mora, binding Hlaalu to Dres, and abolished slavery in 3E 430. His fate after the catastrophes is unknown.', 'canon', [U('Hlaalu_Helseth')]),
  t('person:brara-morvayn', 'person', 'Brara Morvayn', 'Redoran councilor who led Ald’ruhn’s refugees to Raven Rock, became the Company’s Factor after the 4E 4 Riekling raid, designed the Bulwark, and in 4E 16 became Raven Rock’s first Councilor. She died of old age in 4E 65.', 'canon', [U('Brara_Morvayn')]),
  t('person:carius', 'person', 'General Falx Carius', 'Commander of Fort Frostmoth, killed by debris when the Red Year all but destroyed his fort. A necromancer will raise him two centuries later.', 'canon', [U('Falx_Carius')]),
  t('person:indarys', 'person', 'Count Andel Indarys', 'An ex-Hlaalu Dunmer trader who became Count of Cheydinhal, the only non-Imperial count in 3E 433, rumoured to owe his rise to Helseth and Barenziah.', 'canon', [U('Andel_Indarys')]),
  t('person:alessia-caro', 'person', 'Countess Alessia Caro', 'Countess of Leyawiin, hostile to Argonians, Khajiit and Dunmer; rumours of a torture chamber in the castle.', 'canon', [U('Alessia_Caro')]),
  t('person:neloth', 'person', 'Neloth', 'Telvanni master-wizard who survived the 3E 427 purge of councilors and grew Tel Mithryn on Solstheim. Whether before or after 4E 5 is disputed.', 'canon', [U('Neloth'), U('Tel_Mithryn')]),
  t('person:vuhon-sul', 'person', 'Vuhon, Sul and Ilzheven', 'The Dunmer mages and the woman at the heart of the Ingenium. Vuhon later became the being called Umbriel.', 'canon', [U('Ingenium')]),
  t('person:melis-ravel', 'person', 'Melis Ravel', 'Dunmer compiler of The Red Year, oral history gathered across Morrowind: patriotic and devout.', 'canon', [U('The_Red_Year,_Vol._I')]),
  t('person:titus-mede', 'person', 'Titus Mede I', 'Soldier in an outlaw army, Colovian warlord, “king in Cyrodiil”, then Emperor. He took the Imperial City with “less than a thousand men” and founded the Mede Dynasty.', 'canon', [U('Titus_Mede_I')]),
  t('person:thules', 'person', 'Thules the Gibbering', 'Nibenese witch-warrior who held the weakened Empire during the Interregnum until Titus Mede deposed him.', 'canon', [U('Thules_the_Gibbering')]),
  t('person:vivec', 'person', 'Vivec', 'Last of the Tribunal, warrior-poet god-king of Vivec City, gone before the Red Year (D-04).', 'canon', [U('Vivec')]),
  t('person:nerevarine', 'person', 'The Nerevarine', 'Destroyer of Dagoth Ur in 3E 427, who refused power and is rumoured to have sailed for Akavir.', 'canon', [U('Nerevarine')]),
  t('person:lymdrenn', 'person', 'Lymdrenn Tenvanni', 'Telvanni noble whose journal of 4E 6, Second Seed, Middas records the Argonians closing in. His son Brandyl became Brand-Shei.', 'canon', [UG('Skyrim', "Lymdrenn_Tenvanni's_Journal")]),
  t('travel:strider', 'travel', 'Silt striders', 'Giant arthropods that carry passengers between Vvardenfell’s towns. The Red Year ends the network.', 'canon', [UG('Morrowind', 'Transport')]),
  t('travel:guide', 'travel', 'Guild Guides', 'Mages Guild teleportation between guildhalls, for a fee.', 'canon', [UG('Morrowind', 'Transport')]),
  t('travel:boat', 'travel', 'Coastal boats', 'Small craft that work Vvardenfell’s shores.', 'unverified', [UG('Morrowind', 'Transport')]),
  t('travel:inner-sea', 'travel', 'The Inner Sea', 'The water between Vvardenfell and the mainland; tsunamis cross it in the Red Year.', 'canon', [U('Baar_Dau')]),
  t('travel:sea-of-ghosts', 'travel', 'The Sea of Ghosts', 'Misty northern waters full of glaciers and icebergs, named for Ysgramor’s drowned son Yngol. Winter crossings are longer and worse.', 'canon', [U('Sea_of_Ghosts')]),
  t('travel:coastal', 'travel', 'Coastal shipping', 'Ships along the Padomaic coasts and Topal Bay, prey to pirates out of Senchal.', 'canon', [U('Senchal')]),
  t('travel:caravan', 'travel', 'Guar caravans', 'Pack-guar trains on the mainland roads. Traders like Saldus Llervu worked the south road from Vivec to Narsis.', 'canon', [IL('red-year-vol-ii')]),
  t('travel:road', 'travel', 'Imperial roads', 'The Red Ring Road circles Lake Rumare; the Green Road runs south to Leyawiin; the Gold Road west to Anvil.', 'canon', [U('Red_Ring_Road'), U('Green_Road')]),
  t('travel:barge', 'travel', 'River barges', 'Barges on the Niben and the rivers of Black Marsh.', 'canon', [U('Heartlands')]),
];
