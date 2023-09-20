import * as CC from './catalogConstants';
import { SnakeSoldier } from '../typechain-types';
import { BigNumber } from 'ethers';

const SLOT_PARTS = [CC.SLOT_ELEMENT_GEM_ID, CC.SLOT_SKILL_GEM_ID, CC.SLOT_FACTION_GEM_ID];

async function addFullAssetToSnake(
  snakes: SnakeSoldier,
  metadataURI: string,
  snakeId: number | BigNumber,
  catalogAddress: string,
  fixed_parts: BigNumber[],
): Promise<void> {
  console.log('Configuring catalog.');

  const all_parts = SLOT_PARTS.concat(fixed_parts.map((part) => part.toNumber()));

  const tx = await snakes.addEquippableAssetEntries(0, catalogAddress, [metadataURI], all_parts);
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
    await snakes.addAssetsToTokens([snakeId], [assetId], activeAssets[0]);
  }
  console.log(`Added asset for snake with ID ${snakeId}.`);
}

export default addFullAssetToSnake;
