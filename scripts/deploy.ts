import { ethers, run } from 'hardhat';
import {
  ElementGem,
  FactionGem,
  SerpenTerraPassport,
  SkillGem,
  SnakeCatalog,
  SnakeSoldier,
} from '../typechain-types';
import * as C from './constants';
import * as CC from './catalogConstants';
import addMainAssets from './addMainAssets';
import configureCatalog from './configureCatalog';

async function deployContracts(fromTesting: boolean): Promise<{
  snakeSoldiers: SnakeSoldier;
  elementGem: ElementGem;
  factionGem: FactionGem;
  skillGem: SkillGem;
  passport: SerpenTerraPassport;
  catalog: SnakeCatalog;
}> {
  if (!fromTesting) {
    console.log('Deploying smart contracts');
  }
  const snakeSoldierFactory = await ethers.getContractFactory('SnakeSoldier');
  const elementGemFactory = await ethers.getContractFactory('ElementGem');
  const factionGemFactory = await ethers.getContractFactory('FactionGem');
  const skillGemFactory = await ethers.getContractFactory('SkillGem');
  const serpenTerraPassportFactory = await ethers.getContractFactory('SerpenTerraPassport');
  const snakeCatalogFactory = await ethers.getContractFactory('SnakeCatalog');

  const snakeSoldiers = <SnakeSoldier>(
    await snakeSoldierFactory.deploy(C.SNAKE_SOLDIER_COLLECTION_METADATA, C.MAX_GIFTS_PER_PHASE)
  );

  const passport = <SerpenTerraPassport>(
    await serpenTerraPassportFactory.deploy(ethers.constants.AddressZero)
  );

  const elementGem = <ElementGem>(
    await elementGemFactory.deploy(
      C.ELEMENT_GEM_COLLECTION_METADATA,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );

  const skillGem = <SkillGem>(
    await skillGemFactory.deploy(
      C.SKILL_GEM_COLLECTION_METADATA,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );

  const factionGem = <FactionGem>(
    await factionGemFactory.deploy(
      C.FACTION_GEM_COLLECTION_METADATA,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
      passport.address,
    )
  );

  const catalog = <SnakeCatalog>(
    await snakeCatalogFactory.deploy(CC.CATALOG_METADATA_URI, CC.CATALOG_TYPE)
  );

  await snakeSoldiers.deployed();
  if (!fromTesting) {
    console.log(`Snake Soldier deployed to ${snakeSoldiers.address}`);
  }
  await passport.deployed();
  if (!fromTesting) {
    console.log(`SerpenTerra Passport deployed to ${passport.address}`);
  }
  await elementGem.deployed();
  if (!fromTesting) {
    console.log(`Element Gem deployed to ${elementGem.address}`);
  }
  await skillGem.deployed();
  if (!fromTesting) {
    console.log(`Skill Gem deployed to ${skillGem.address}`);
  }
  await factionGem.deployed();
  if (!fromTesting) {
    console.log(`Faction Gem deployed to ${factionGem.address}`);
  }
  await catalog.deployed();
  if (!fromTesting) {
    console.log(`Snake Catalog deployed to ${catalog.address}`);
  }

  await snakeSoldiers.setAutoAcceptCollection(elementGem.address);
  await snakeSoldiers.setAutoAcceptCollection(skillGem.address);
  await snakeSoldiers.setAutoAcceptCollection(factionGem.address);

  await passport.setFactionGem(factionGem.address);

  await addMainAssets(snakeSoldiers, elementGem, factionGem, skillGem);
  await configureCatalog(catalog, elementGem.address, skillGem.address, factionGem.address);

  if (!fromTesting) {
    await run('verify:verify', {
      address: snakeSoldiers.address,
      constructorArguments: [C.SNAKE_SOLDIER_COLLECTION_METADATA, C.MAX_GIFTS_PER_PHASE],
    });
    await run('verify:verify', {
      address: passport.address,
      constructorArguments: [ethers.constants.AddressZero],
    });
    await run('verify:verify', {
      address: elementGem.address,
      constructorArguments: [
        C.ELEMENT_GEM_COLLECTION_METADATA,
        snakeSoldiers.address,
        C.MAX_SUPPLY_FOR_GEMS,
      ],
    });
    await run('verify:verify', {
      address: factionGem.address,
      constructorArguments: [
        C.FACTION_GEM_COLLECTION_METADATA,
        snakeSoldiers.address,
        C.MAX_SUPPLY_FOR_GEMS,
        passport.address,
      ],
    });
    await run('verify:verify', {
      address: skillGem.address,
      constructorArguments: [
        C.SKILL_GEM_COLLECTION_METADATA,
        snakeSoldiers.address,
        C.MAX_SUPPLY_FOR_GEMS,
      ],
    });
    await run('verify:verify', {
      address: catalog.address,
      constructorArguments: [CC.CATALOG_METADATA_URI, CC.CATALOG_TYPE],
    });
  }

  return {
    snakeSoldiers,
    passport,
    elementGem,
    factionGem,
    skillGem,
    catalog,
  };
}

export default deployContracts;
