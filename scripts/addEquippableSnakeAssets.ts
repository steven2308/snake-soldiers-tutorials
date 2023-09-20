import { ethers } from 'hardhat';
import { SnakeSoldier, SnakeCatalog } from '../typechain-types';
import fixedParts from '../data/fixed_parts';
import allParts from '../data/all_parts';
import * as CC from './catalogConstants';
import { BigNumber } from 'ethers';

const BASE_URI = 'ipfs://QmViB6rJTEeJeypDJ9WCS6Q6nPyQ8mfyJmVXqEH2jgxAbq/full';

interface Asset {
  snakeId: number;
  metadataURI: string;
  partIds: number[];
}

interface SnakeAndAsset {
  snakeId: number;
  assetId: BigNumber;
  oldAsset?: number;
}

const slot_parts = [
  CC.SLOT_ELEMENT_GEM_ID,
  CC.SLOT_SKILL_GEM_ID,
  CC.SLOT_FACTION_GEM_ID,
  CC.SLOT_BACKGROUND_ID,
  CC.SLOT_HEAD_ID,
  CC.SLOT_CHEST_ID,
  CC.SLOT_BODY_ID,
  CC.SLOT_LEFT_HAND_ID,
  CC.SLOT_RIGHT_HAND_ID,
  CC.SLOT_BADGE_1_ID,
  CC.SLOT_BADGE_2_ID,
  CC.SLOT_BADGE_3_ID,
  CC.SLOT_BADGE_4_ID,
  CC.SLOT_BADGE_5_ID,
  CC.SLOT_EXTRA_1_ID,
  CC.SLOT_EXTRA_2_ID,
  CC.SLOT_EXTRA_3_ID,
  CC.SLOT_EXTRA_4_ID,
  CC.SLOT_EXTRA_5_ID,
];

async function addEquippableSnakeAssets(
  snakes: SnakeSoldier,
  catalog: SnakeCatalog,
): Promise<void> {
  console.log('Adding equippable snake assets');

  const allAssets: Asset[] = [];
  for (const [key, value] of Object.entries(fixedParts)) {
    const snakeId = Number(key);
    if (snakeId <= 2) continue; // Skip the 2 generals
    // Remove first one and last one since it is the background and gem, and we will use the default image from their slots
    const part_names = (value as string[]).slice(1, -1);
    const part_ids = part_names.map((part_name) => allParts[part_name].id).concat(slot_parts);
    const metadataURI = `${BASE_URI}/${snakeId}.json`;
    allAssets.push({ snakeId: snakeId, metadataURI, partIds: part_ids });
  }

  const snakesAndAssets: SnakeAndAsset[] = [];
  for (const asset of allAssets) {
    const { snakeId, metadataURI, partIds } = asset;
    const tx = await snakes.addEquippableAssetEntries(
      snakeId,
      catalog.address,
      [metadataURI],
      partIds,
    );
    const receipt = await tx.wait();
    // Get the event from the receipt
    const event = receipt.events?.find((event) => event.event === 'AssetSet');
    const assetId = event?.args?.assetId;
    const oldAsset = getAssetToReplaceFromSnakeId(snakeId);
    snakesAndAssets.push({ snakeId, assetId, oldAsset });
    console.log(`Added equippable snake asset for snakeId ${snakeId} with assetId ${assetId}`);
  }

  // Group per old asset Id
  const groupedSnakeAndAssets: { [key: number]: SnakeAndAsset[] } = {};
  for (const snakeAndAsset of snakesAndAssets) {
    const oldAsset = snakeAndAsset.oldAsset ?? 0;
    if (!groupedSnakeAndAssets[oldAsset]) groupedSnakeAndAssets[oldAsset] = [];
    groupedSnakeAndAssets[oldAsset].push(snakeAndAsset);
  }

  // For each group of old asset Ids create chunks of 20 and call addAssetToTokens
  const chunkSize = 20;
  let i = 0;
  for (const [oldAsset, snakeAndAssets] of Object.entries(groupedSnakeAndAssets)) {
    const assetToReplace = oldAsset;
    // Create chunks of 20
    const chunks = [];
    while (snakeAndAssets.length > 0) {
      chunks.push(snakeAndAssets.splice(0, chunkSize));
    }
    for (const chunk of chunks) {
      i++;
      if (i < 16) continue;
      const snakeIds = chunk.map((snakeAndAsset) => snakeAndAsset.snakeId);
      const assetIds = chunk.map((snakeAndAsset) => snakeAndAsset.assetId);
      const tx = await snakes.addAssetsToTokens(snakeIds, assetIds, assetToReplace);
      await tx.wait();
      console.log(`Added equippable snake assets for \nsnakeIds: ${snakeIds}`);
    }
  }
}

function getAssetToReplaceFromSnakeId(snakeId: number): number {
  let assetId: number;
  if (snakeId <= 20) {
    assetId = 9;
  } else if (snakeId <= 200) {
    assetId = 5;
  } else {
    assetId = 1;
  }
  return assetId + (snakeId % 4);
}

export default addEquippableSnakeAssets;
