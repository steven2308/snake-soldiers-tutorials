import * as CC from './catalogConstants';
import { SnakeSoldier } from '../typechain-types';

const SLOT_PARTS = [CC.SLOT_ELEMENT_GEM_ID, CC.SLOT_SKILL_GEM_ID, CC.SLOT_FACTION_GEM_ID];

async function addFullAssetToSnake(
  snakes: SnakeSoldier,
  metadataURI: string,
  snakeId: number,
  catalogAddress: string,
  fixed_parts: number[],
): Promise<void> {
  console.log('Configuring catalog.');

  const all_parts = SLOT_PARTS.concat(fixed_parts);

  const tx = await snakes.addEquippableAssetEntry(0, catalogAddress, metadataURI, all_parts);
  // Wait for it to be mined
  await tx.wait();

  const assetId = await snakes.totalAssets();
  const activeAssets = await snakes.getActiveAssets(snakeId);
  if (activeAssets.length != 1) {
    console.log(
      `Snake with Id: ${activeAssets.length} does not have exactly 1 active asset. Will skip`,
    );
  } else {
    // Replace the egg asset with the revealed snake
    await snakes.addAssetToToken(snakeId, assetId, activeAssets[0]);
  }
  console.log(`Added asset for snake with ID ${snakeId}.`);
}

async function addFullAssetToAllSnakes(
  snakes: SnakeSoldier,
  baseMetadataUri: string,
  catalogAddress: string,
) {
  await addFullAssetToSnake(snakes, `${baseMetadataUri}/1`, 1, catalogAddress, [
    CC.HEAD_FIRE_ID,
    CC.CHEST_FIRE_ID,
    CC.BODY_FIRE_ID,
    CC.EYES_FIRE_ID,
    CC.MOUTH_FIRE_ID,
    CC.FANGS_AIR_ID,
    CC.TAIL_FIRE_ID,
  ]);

  await addFullAssetToSnake(snakes, `${baseMetadataUri}/2`, 2, catalogAddress, [
    CC.HEAD_WATER_ID,
    CC.CHEST_ICE_ID,
    CC.BODY_SKELETTON_ID,
    CC.EYES_WATER_ID,
    CC.MOUTH_WATER_ID,
    CC.FANGS_EARTH_ID,
    CC.TAIL_WATER_ID,
  ]);
}

export default addFullAssetToAllSnakes;
