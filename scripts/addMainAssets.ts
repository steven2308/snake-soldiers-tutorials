import { BASE_URI_EGGS, BASE_URI_GEMS } from './constants';
import { SnakeSoldier, ElementGem, FactionGem, SkillGem } from '../typechain-types';
import { ethers } from 'hardhat';

async function addMainAssets(
  snakeSoldier: SnakeSoldier,
  elementGem: ElementGem,
  factionGem: FactionGem,
  skillGem: SkillGem,
): Promise<void> {
  console.log('Adding assets to snakes.');

  await snakeSoldier.addEquippableAssetEntries(
    0,
    ethers.constants.AddressZero,
    [
      `${BASE_URI_EGGS}/soldier/fire`, // SOLDIER_EGG_FIRE = 1;
      `${BASE_URI_EGGS}/soldier/earth`, // SOLDIER_EGG_EARTH = 2;
      `${BASE_URI_EGGS}/soldier/water`, // SOLDIER_EGG_WATER = 3;
      `${BASE_URI_EGGS}/soldier/air`, // SOLDIER_EGG_AIR = 4;
      `${BASE_URI_EGGS}/commander/fire`, // COMMANDER_EGG_FIRE = 5;
      `${BASE_URI_EGGS}/commander/earth`, // COMMANDER_EGG_EARTH = 6;
      `${BASE_URI_EGGS}/commander/water`, // COMMANDER_EGG_WATER = 7;
      `${BASE_URI_EGGS}/commander/air`, // COMMANDER_EGG_AIR = 8;
      `${BASE_URI_EGGS}/general/fire`, // GENERAL_EGG_FIRE = 9;
      `${BASE_URI_EGGS}/general/earth`, // GENERAL_EGG_EARTH = 10;
      `${BASE_URI_EGGS}/general/water`, // GENERAL_EGG_WATER = 11;
      `${BASE_URI_EGGS}/general/air`, // GENERAL_EGG_AIR = 12;
    ],
    [],
  );
  console.log('Adding assets to gems.');

  await elementGem.addAssetEntry(`${BASE_URI_GEMS}/elements/`);
  await factionGem.addAssetEntry(`${BASE_URI_GEMS}/factions/`);
  await skillGem.addAssetEntry(`${BASE_URI_GEMS}/skills/`);

  console.log('Base assets added.');
}

export default addMainAssets;
