import {
  SLOT_ELEMENT_GEM_ID,
  SLOT_SKILL_GEM_ID,
  SLOT_FACTION_GEM_ID,
  SLOT_ELEMENT_GEM_METADATA_URI,
  SLOT_SKILL_GEM_METADATA_URI,
  SLOT_FACTION_GEM_METADATA_URI,
} from './catalogConstants';
import { SnakeCatalog } from '../typechain-types';

async function configureCatalog(
  catalog: SnakeCatalog,
  elementGemAddress: string,
  skillGemAddress: string,
  factionGemAddress: string,
): Promise<void> {
  console.log('Configuring catalog.');

  await catalog.addPartList([
    {
      partId: SLOT_ELEMENT_GEM_ID,
      part: {
        itemType: 1,
        z: 10,
        equippable: [elementGemAddress],
        metadataURI: SLOT_ELEMENT_GEM_METADATA_URI,
      },
    },
    {
      partId: SLOT_SKILL_GEM_ID,
      part: {
        itemType: 1,
        z: 10,
        equippable: [skillGemAddress],
        metadataURI: SLOT_SKILL_GEM_METADATA_URI,
      },
    },
    {
      partId: SLOT_FACTION_GEM_ID,
      part: {
        itemType: 1,
        z: 10,
        equippable: [factionGemAddress],
        metadataURI: SLOT_FACTION_GEM_METADATA_URI,
      },
    },
  ]);
  console.log(`Catalog configured.`);
}

export default configureCatalog;
