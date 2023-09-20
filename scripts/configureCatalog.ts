import * as CC from './catalogConstants';
import { SnakeCatalog } from '../typechain-types';
import allParts from '../data/all_parts.json';

interface PartData {
  file: string;
  id: number;
}

async function configureCatalog(
  catalog: SnakeCatalog,
  elementGemAddress: string,
  skillGemAddress: string,
  factionGemAddress: string,
): Promise<void> {
  console.log('Configuring catalog.');

  let tx = await catalog.addPartList([
    {
      partId: CC.SLOT_ELEMENT_GEM_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_ELEMENT_GEM_SLOT,
        equippable: [elementGemAddress],
        metadataURI: CC.SLOT_ELEMENT_GEM_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_SKILL_GEM_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_SKILL_GEM_SLOT,
        equippable: [skillGemAddress],
        metadataURI: CC.SLOT_SKILL_GEM_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_FACTION_GEM_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_FACTION_GEM_SLOT,
        equippable: [factionGemAddress],
        metadataURI: CC.SLOT_FACTION_GEM_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BACKGROUND_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BACKGROUND_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BACKGROUND_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_HEAD_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_FACTION_GEM_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_HEAD_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_CHEST_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_CHEST_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_CHEST_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BODY_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BODY_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BODY_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_LEFT_HAND_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_LEFT_HAND_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_LEFT_HAND_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_RIGHT_HAND_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_RIGHT_HAND_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_RIGHT_HAND_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BADGE_1_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BADGE_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BADGE_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BADGE_2_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BADGE_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BADGE_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BADGE_3_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BADGE_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BADGE_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BADGE_4_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BADGE_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BADGE_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_BADGE_5_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_BADGE_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_BADGE_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_EXTRA_1_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_EXTRA_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_EXTRA_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_EXTRA_2_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_EXTRA_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_EXTRA_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_EXTRA_3_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_EXTRA_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_EXTRA_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_EXTRA_4_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_EXTRA_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_EXTRA_METADATA_URI,
      },
    },
    {
      partId: CC.SLOT_EXTRA_5_ID,
      part: {
        itemType: 1,
        z: CC.Z_INDEX_EXTRA_SLOT,
        equippable: [], // Will be set later
        metadataURI: CC.SLOT_EXTRA_METADATA_URI,
      },
    },
  ]);
  await tx.wait();
  console.log(`Slots configured.`);

  const allFixedParts = [];
  for (const [key, value] of Object.entries(allParts)) {
    if (key.startsWith('gem')) continue; // Skip gems
    const data = value as PartData;
    const part = {
      partId: data['id'],
      part: {
        itemType: 2, // Fixed
        z: get_z_index_from_name(key),
        equippable: [],
        metadataURI: `${CC.BASE_URI_CATALOG}/${data['file'].replace('.png', '.json')}`,
      },
    };
    allFixedParts.push(part);
  }
  // Split into chunks of 20
  const chunkedFixedParts = [];
  const chunkSize = 20;
  for (let i = 0; i < allFixedParts.length; i += chunkSize) {
    chunkedFixedParts.push(allFixedParts.slice(i, i + chunkSize));
  }
  for (const chunk of chunkedFixedParts) {
    tx = await catalog.addPartList(chunk);
    await tx.wait();
    console.log(`Added ${chunk.length} fixed parts.`);
  }
}

function get_z_index_from_name(name: string): number {
  if (name.includes('frame')) return CC.Z_INDEX_FRAME_FIXED;
  if (name.includes('head')) return CC.Z_INDEX_HEAD_FIXED;
  if (name.includes('body')) return CC.Z_INDEX_BODY_FIXED;
  if (name.includes('rib')) return CC.Z_INDEX_RIB_FIXED;
  if (name.includes('chest')) return CC.Z_INDEX_CHEST_FIXED;
  if (name.includes('cheek')) return CC.Z_INDEX_CHEEK_FIXED;
  if (name.includes('jaw')) return CC.Z_INDEX_JAW_FIXED;
  if (name.includes('eye')) return CC.Z_INDEX_EYE_FIXED;
  if (name.includes('fangs')) return CC.Z_INDEX_FANGS_FIXED;
  if (name.includes('rattle')) return CC.Z_INDEX_RATTLE_FIXED;
  if (name.includes('tongue')) return CC.Z_INDEX_TONGUE_FIXED;
  if (name.includes('fingers')) return CC.Z_INDEX_FINGERS_FIXED;

  throw new Error(`Unknown part name: ${name}`);
}

export default configureCatalog;
