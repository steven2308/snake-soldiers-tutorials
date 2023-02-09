import { BASE_URI } from './constants';
import { SnakeSoldier, ElementGem, FactionGem, SkillGem } from '../typechain-types';

async function addMainAssets(
  snakeSoldier: SnakeSoldier,
  elementGem: ElementGem,
  factionGem: FactionGem,
  skillGem: SkillGem,
): Promise<void> {
  console.log('Adding assets to snakes.');

  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/soldier/generic`); // SOLDIER_EGG = 1;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/commander/generic`); // COMMANDER_EGG = 2;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/general/generic`); // GENERAL_EGG = 3;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/soldier/fire`); // SOLDIER_EGG_FIRE = 4;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/soldier/earth`); // SOLDIER_EGG_EARTH = 5;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/soldier/water`); // SOLDIER_EGG_WATER = 6;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/soldier/air`); // SOLDIER_EGG_AIR = 7;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/commander/fire`); // COMMANDER_EGG_FIRE = 8;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/commander/earth`); // COMMANDER_EGG_EARTH = 9;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/commander/water`); // COMMANDER_EGG_WATER = 10;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/commander/air`); // COMMANDER_EGG_AIR = 11;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/general/fire`); // GENERAL_EGG_FIRE = 12;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/general/earth`); // GENERAL_EGG_EARTH = 13;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/general/water`); // GENERAL_EGG_WATER = 14;
  await snakeSoldier.addAssetEntry(`${BASE_URI}/eggs/general/air`); // GENERAL_EGG_AIR = 15;

  console.log('Adding assets to gems.');

  await elementGem.addAssetEntry(`${BASE_URI}/gems/elements/`);
  await factionGem.addAssetEntry(`${BASE_URI}/gems/factions/`);
  await skillGem.addAssetEntry(`${BASE_URI}/gems/skills/`);

  console.log('Base assets added.');
}

export default addMainAssets;
