import { ethers } from 'hardhat';
import {
  ElementGem,
  FactionGem,
  SerpenTerraPassport,
  SkillGem,
  SnakeCatalog,
  SnakeSoldier,
} from '../typechain-types';

const MOONBASE_SNAKE_SOLDIER_ADDRESS = '0xCFA1c7999d3D17B332F9b6a88579B137e1E4df77';
const MOONBASE_SERPENTERRA_PASSPORT_ADDRESS = '0x81cD176528E056582A5b75c1898de32eb9d5d711';
const MOONBASE_ELEMENT_GEM_ADDRESS = '0x4C0A319F96930032AD7A463066774095DA3B1960';
const MOONBASE_SKILLGEM_ADDRESS = '0x89e8C928F103E68CcA32FD648556eA67D65e5a35';
const MOONBASE_FACTION_GEM_ADDRESS = '0xe1d34986BA5FAe54AF7dAdF0ee0997C18a51D6B4';
const MOONBASE_SNAKE_CATALOG_ADDRESS = '0x4109d478b94cd930aac85ca34ef1d79aef72635b';

const MOONBEAM_SERPENTERRA_PASSPORT_ADDRESS = '0x9093829A21bDC234fD42b9dd427A572a11687F55';
const MOONBEAM_SNAKE_SOLDIER_ADDRESS = '0x8F64Ce931f0D36430B971548b81264EeF3bD9B97';
const MOONBEAM_ELEMENT_GEM_ADDRESS = '0xa5B355125A2b7Fd4c7A451C37B87e81B965a96B1';
const MOONBEAM_SKILLGEM_ADDRESS = '0x9E5bABfad9a1A980b58Db60585408735562B721E';
const MOONBEAM_FACTION_GEM_ADDRESS = '0x3f563D6d8E62405d01dc8A4e1dFB269f23aAB162';
const MOONBEAM_SNAKE_CATALOG_ADDRESS = '0x65d19327394691CD08045E98A7CB09E8ea54B0DE';
const MOONBEAM_BATCH_ACCEPTER_ADDRESS = '0x4F4581C0849E236a63A3fDEf9205Ac49Bf030823';

let PHASE_1_2_IDS: number[] = [1, 2];
//Add Ids from 21 to 38 and from 201 to 680
for (let i = 21; i <= 38; i++) {
  PHASE_1_2_IDS.push(i);
}
for (let i = 201; i <= 680; i++) {
  PHASE_1_2_IDS.push(i);
}

async function getDeployedContracts(): Promise<{
  snakeSoldiers: SnakeSoldier;
  serpenTerraPassport: SerpenTerraPassport;
  elementGem: ElementGem;
  factionGem: FactionGem;
  skillGem: SkillGem;
  catalog: SnakeCatalog;
}> {
  const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

  const snakeSoldierFactory = await ethers.getContractFactory('SnakeSoldier');
  const serpenTerraPassportFactory = await ethers.getContractFactory('SerpenTerraPassport');
  const elementGemFactory = await ethers.getContractFactory('ElementGem');
  const factionGemFactory = await ethers.getContractFactory('FactionGem');
  const skillGemFactory = await ethers.getContractFactory('SkillGem');
  const catalogFactory = await ethers.getContractFactory('SnakeCatalog');

  let snakesAddress: string;
  let serpenTerraPassportAddress: string;
  let elementGemAddress: string;
  let factionGemAddress: string;
  let skillGemAddress: string;
  let catalogAddress: string;

  if (chainId == 1287) {
    // Moonbase
    snakesAddress = MOONBASE_SNAKE_SOLDIER_ADDRESS;
    serpenTerraPassportAddress = MOONBASE_SERPENTERRA_PASSPORT_ADDRESS;
    elementGemAddress = MOONBASE_ELEMENT_GEM_ADDRESS;
    factionGemAddress = MOONBASE_FACTION_GEM_ADDRESS;
    skillGemAddress = MOONBASE_SKILLGEM_ADDRESS;
    catalogAddress = MOONBASE_SNAKE_CATALOG_ADDRESS;
  } else if (chainId == 1284) {
    // Moonbeam
    snakesAddress = MOONBEAM_SNAKE_SOLDIER_ADDRESS;
    serpenTerraPassportAddress = MOONBEAM_SERPENTERRA_PASSPORT_ADDRESS;
    elementGemAddress = MOONBEAM_ELEMENT_GEM_ADDRESS;
    factionGemAddress = MOONBEAM_FACTION_GEM_ADDRESS;
    skillGemAddress = MOONBEAM_SKILLGEM_ADDRESS;
    catalogAddress = MOONBEAM_SNAKE_CATALOG_ADDRESS;
  } else {
    throw new Error('Unexpected network!');
  }

  const snakeSoldiers = <SnakeSoldier>snakeSoldierFactory.attach(snakesAddress);
  const serpenTerraPassport = <SerpenTerraPassport>(
    serpenTerraPassportFactory.attach(serpenTerraPassportAddress)
  );
  const elementGem = <ElementGem>elementGemFactory.attach(elementGemAddress);
  const factionGem = <FactionGem>factionGemFactory.attach(factionGemAddress);
  const skillGem = <SkillGem>skillGemFactory.attach(skillGemAddress);
  const catalog = <SnakeCatalog>catalogFactory.attach(catalogAddress);

  return { snakeSoldiers, serpenTerraPassport, elementGem, factionGem, skillGem, catalog };
}

export {
  PHASE_1_2_IDS,
  getDeployedContracts,
  MOONBASE_SNAKE_SOLDIER_ADDRESS,
  MOONBASE_ELEMENT_GEM_ADDRESS,
  MOONBASE_FACTION_GEM_ADDRESS,
  MOONBASE_SERPENTERRA_PASSPORT_ADDRESS,
  MOONBASE_SKILLGEM_ADDRESS,
  MOONBASE_SNAKE_CATALOG_ADDRESS,
  MOONBEAM_SNAKE_SOLDIER_ADDRESS,
  MOONBEAM_ELEMENT_GEM_ADDRESS,
  MOONBEAM_FACTION_GEM_ADDRESS,
  MOONBEAM_SERPENTERRA_PASSPORT_ADDRESS,
  MOONBEAM_SKILLGEM_ADDRESS,
  MOONBEAM_SNAKE_CATALOG_ADDRESS,
  MOONBEAM_BATCH_ACCEPTER_ADDRESS,
};
