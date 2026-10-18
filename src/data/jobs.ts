// Day labour: what a broke trader can hire on for in each place. Invented flavour (see LORE_BIBLE.md),
// built on canon trades of each town. Pay is set in the engine from the cheapest fare out of town × `mult`.
import type { Job } from '../engine/types';

const j = (id: string, name: string, text: string, mult: number, hurt: number, after?: string): Job => ({ id, name, text, mult, hurt, canon: 'invented', sources: [], ...(after ? { after } : {}) });
const AFTER_ERUPTION = 'red-year-eruption';

export const JOBS: Readonly<Record<string, readonly Job[]>> = {
  balmora: [
    j('silt-strider-yard', 'Strider-port hand', 'Feed and water the silt striders, haul baggage up the tower.', 1, 1),
    j('council-copyist', 'Council copyist', 'Copy ledgers for the Hlaalu Council clerks.', 0.85, 0),
    j('odai-dredging', 'Odai dredger', 'Rake ash and silt out of the river channel.', 1.25, 2),
  ],
  vivec: [
    j('canton-porter', 'Canton porter', 'Carry goods up and down the canton stairs.', 1, 1),
    j('gondolier-hand', 'Gondolier’s hand', 'Pole a gondola through the waterways.', 0.9, 0),
    j('crater-salvage', 'Crater salvager', 'Dig through the ruins by Scathing Bay for anything worth selling.', 1.4, 2, AFTER_ERUPTION),
  ],
  aldruhn: [
    j('shell-scraper', 'Shell scraper', 'Scrape and patch the great emperor-crab shells of the town.', 1, 1),
    j('redoran-runner', 'Redoran runner', 'Carry messages between the councilors’ manors.', 0.85, 0),
    j('ash-shoveller', 'Ash shoveller', 'Clear ash from the streets after every storm.', 1.25, 2),
  ],
  'sadrith-mora': [
    j('mushroom-tender', 'Mushroom-tower tender', 'Tend the fungal growth of a Telvanni tower.', 1, 1),
    j('dockhand-sm', 'Wolverine Hall dockhand', 'Load and unload the boats at the harbour.', 1, 1),
    j('scroll-courier', 'Scroll courier', 'Run errands for a wizard who cannot be bothered to levitate.', 0.9, 0),
  ],
  ebonheart: [
    j('eec-tally', 'EEC tally clerk', 'Count crates on the East Empire Company docks.', 0.9, 0),
    j('ebonheart-docks', 'Dockhand', 'Haul cargo between ship and warehouse.', 1.05, 1),
    j('ruin-clearer', 'Ruin clearer', 'Shift rubble and scorched timber for the Company.', 1.35, 2, AFTER_ERUPTION),
  ],
  mournhold: [
    j('plaza-porter', 'Plaza porter', 'Carry purchases for shoppers in the Great Bazaar.', 1, 1),
    j('relief-kitchen', 'Relief-kitchen hand', 'Cook and serve for the refugees from Vvardenfell.', 0.9, 0),
    j('palace-builder', 'Builder’s labourer', 'Carry stone for the masons rebuilding the city walls.', 1.2, 2),
  ],
  blacklight: [
    j('caravan-loader', 'Caravan loader', 'Load the guar trains bound for Skyrim.', 1, 1),
    j('redoran-guard-drill', 'Watch auxiliary', 'Stand watch on the walls for the Redoran guard.', 1.15, 1),
    j('refugee-scribe', 'Refugee scribe', 'Write letters for refugees looking for kin.', 0.85, 0),
  ],
  necrom: [
    j('ossuary-sweeper', 'Ossuary sweeper', 'Sweep the tombs and carry offerings for pilgrims.', 0.95, 0),
    j('pilgrim-guide', 'Pilgrim guide', 'Lead pilgrims through the City of the Dead.', 1, 1),
    j('coffin-bearer', 'Coffin bearer', 'Carry the dead to the catacombs.', 1.2, 2),
  ],
  tear: [
    j('dres-plantation', 'Saltrice picker', 'Pick saltrice in the Dres paddies.', 1, 2),
    j('swamp-pole', 'Bog boatman', 'Pole skiffs through the flooded streets.', 1, 1),
    j('tear-clerk', 'Weigh-house clerk', 'Weigh and record harvests for House Dres.', 0.85, 0),
  ],
  narsis: [
    j('narsis-market', 'Market porter', 'Carry goods across the Hlaalu market.', 1, 1),
    j('camp-builder', 'Camp builder', 'Raise shelters for the refugee camps.', 1.2, 2),
    j('counting-house', 'Counting-house clerk', 'Copy figures for the Hlaalu counting-houses.', 0.9, 0),
  ],
  'raven-rock': [
    j('ebony-mine', 'Ebony miner', 'Swing a pick in the Raven Rock ebony mine.', 1.4, 2),
    j('rr-docks', 'Dockhand', 'Unload supply ships from the mainland.', 1, 1),
    j('bulwark-mason', 'Bulwark mason', 'Patch the Bulwark against the ash storms.', 1.1, 1),
  ],
  'fort-frostmoth': [
    j('legion-quartermaster', 'Quartermaster’s hand', 'Count stores for the Legion garrison.', 0.9, 0),
    j('woodcutter', 'Woodcutter', 'Fell pines for the fort’s fires.', 1.15, 1),
    j('rubble-crew', 'Rubble crew', 'Clear the collapsed walls of the fort.', 1.3, 2, AFTER_ERUPTION),
  ],
  windhelm: [
    j('windhelm-docks', 'Dockhand', 'Load ships at the Windhelm docks in the cold.', 1, 1),
    j('gray-quarter', 'Gray Quarter porter', 'Carry goods for the Dunmer refugees.', 0.9, 0),
    j('ice-cutter', 'Ice cutter', 'Cut ice from the White River.', 1.2, 2),
  ],
  solitude: [
    j('solitude-docks', 'East Empire docker', 'Haul crates at the Solitude warehouses.', 1, 1),
    j('bard-copyist', 'Copyist', 'Copy texts for the Bards’ College.', 0.85, 0),
    j('lumber-mill', 'Mill hand', 'Feed logs to the sawmill below the city.', 1.15, 2),
  ],
  'imperial-city': [
    j('market-district', 'Market District porter', 'Carry goods between the shops.', 1, 1),
    j('waterfront', 'Waterfront stevedore', 'Unload barges on the waterfront.', 1.1, 1),
    j('council-scribe', 'Council scribe', 'Copy petitions for the Elder Council’s clerks.', 0.9, 0),
  ],
  cheydinhal: [
    j('cheydinhal-mill', 'Mill hand', 'Work the water mill by the river.', 1, 1),
    j('road-mender', 'Road mender', 'Mend the road to the Morrowind border.', 1.15, 2),
    j('refugee-registry', 'Refugee registrar', 'Register Dunmer arriving from the east.', 0.9, 0),
  ],
  leyawiin: [
    j('leyawiin-docks', 'Dockhand', 'Load the barges for the Imperial City.', 1, 1),
    j('fishery', 'Fishery hand', 'Gut and salt the catch on the Niben bay.', 1, 1),
    j('county-clerk', 'County clerk', 'Keep tolls for the Count.', 0.85, 0),
  ],
  lilmoth: [
    j('lilmoth-docks', 'Dockhand', 'Load ships at Lilmoth’s busy harbour.', 1, 1),
    j('hist-sap', 'Swamp forager', 'Gather marsh herbs for the apothecaries.', 1.1, 2),
    j('lilmoth-tally', 'Tally-keeper', 'Count cargo for the An-Xileel customs house.', 0.9, 0),
  ],
  stormhold: [
    j('barge-pole', 'Barge poleman', 'Pole barges along the river to Lilmoth.', 1, 1),
    j('stormhold-builder', 'Mud-brick builder', 'Shape and stack bricks for new walls.', 1.15, 2),
    j('stormhold-runner', 'Runner', 'Carry messages through the marsh paths.', 0.9, 0),
  ],
  senchal: [
    j('senchal-docks', 'Dockhand', 'Load sugar and spice at the harbour.', 1, 1),
    j('sugar-boiler', 'Sugar boiler', 'Stir the vats in a sugar-house.', 1.15, 2),
    j('caravan-guard', 'Caravan watch', 'Stand night watch over a caravan camp.', 1.1, 1),
  ],
};
