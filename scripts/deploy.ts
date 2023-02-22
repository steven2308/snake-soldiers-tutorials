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
    await snakeSoldierFactory.deploy(
      C.SNAKE_METADATA_URI,
      C.SNAKE_DEFAULT_URI,
      C.MAX_GIFTS_PER_PHASE,
    )
  );
  const passport = <SerpenTerraPassport>(
    await serpenTerraPassportFactory.deploy(ethers.constants.AddressZero)
  );
  const elementGem = <ElementGem>(
    await elementGemFactory.deploy(
      C.ELEMENT_GEM_METADATA,
      C.ELEMENT_GEM_DEFAULT_URI,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );
  const skillGem = <SkillGem>(
    await skillGemFactory.deploy(
      C.SKILL_GEM_METADATA,
      C.SKILL_GEM_DEFAULT_URI,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );
  const factionGem = <FactionGem>(
    await factionGemFactory.deploy(
      C.FACTION_GEM_METADATA,
      C.FACTION_GEM_DEFAULT_URI,
      snakeSoldiers.address,
      C.MAX_SUPPLY_FOR_GEMS,
      passport.address,
    )
  );
  const catalog = <SnakeCatalog>(
    await snakeCatalogFactory.deploy(C.CATALOG_METADATA_URI, C.CATALOG_TYPE)
  );

  await snakeSoldiers.deployed();
  await passport.deployed();
  await elementGem.deployed();
  await factionGem.deployed();
  await skillGem.deployed();
  await catalog.deployed();

  await passport.setFactionGem(factionGem.address);

  if (!fromTesting) {
    console.log(`Snake Soldier deployed to ${snakeSoldiers.address}.`);
    console.log(`SerpenTerra Passport deployed to ${passport.address}.`);
    console.log(`Element Gem deployed to ${elementGem.address}.`);
    console.log(`Faction Gem deployed to ${factionGem.address}.`);
    console.log(`Skill Gem deployed to ${skillGem.address}.`);
    console.log(`Snake Catalog deployed to ${catalog.address}.`);
  }

  await addMainAssets(snakeSoldiers, elementGem, factionGem, skillGem);
  await configureCatalog(catalog, elementGem.address, skillGem.address, factionGem.address);

  if (!fromTesting) {
    await run('verify:verify', {
      address: snakeSoldiers.address,
      constructorArguments: [C.SNAKE_METADATA_URI, C.SNAKE_DEFAULT_URI, C.MAX_GIFTS_PER_PHASE],
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
