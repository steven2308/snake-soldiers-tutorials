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

async function main() {
  await deployContracts();
}

async function deployContracts(): Promise<void> {
  console.log('Deploying smart contracts');
  const snakeSoldierFactory = await ethers.getContractFactory('SnakeSoldier');
  const elementGemFactory = await ethers.getContractFactory('ElementGem');
  const factionGemFactory = await ethers.getContractFactory('FactionGem');
  const skillGemFactory = await ethers.getContractFactory('SkillGem');
  const serpenTerraPassportFactory = await ethers.getContractFactory('SerpenTerraPassport');
  const snakeCatalogFactory = await ethers.getContractFactory('SnakeCatalog');

  const snakeSoldier = <SnakeSoldier>(
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
      snakeSoldier.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );
  const skillGem = <SkillGem>(
    await skillGemFactory.deploy(
      C.SKILL_GEM_METADATA,
      C.SKILL_GEM_DEFAULT_URI,
      snakeSoldier.address,
      C.MAX_SUPPLY_FOR_GEMS,
    )
  );
  const factionGem = <FactionGem>(
    await factionGemFactory.deploy(
      C.FACTION_GEM_METADATA,
      C.FACTION_GEM_DEFAULT_URI,
      snakeSoldier.address,
      C.MAX_SUPPLY_FOR_GEMS,
      passport.address,
    )
  );
  const snakeCatalog = <SnakeCatalog>(
    await snakeCatalogFactory.deploy(C.CATALOG_METADATA_URI, C.CATALOG_TYPE)
  );

  await snakeSoldier.deployed();
  await passport.deployed();
  await elementGem.deployed();
  await factionGem.deployed();
  await skillGem.deployed();
  await snakeCatalog.deployed();

  await passport.setFactionGem(factionGem.address);

  console.log(`Snake Soldier deployed to ${snakeSoldier.address}.`);
  console.log(`SerpenTerra Passport deployed to ${passport.address}.`);
  console.log(`Element Gem deployed to ${elementGem.address}.`);
  console.log(`Faction Gem deployed to ${factionGem.address}.`);
  console.log(`Skill Gem deployed to ${skillGem.address}.`);
  console.log(`Snake Catalog deployed to ${snakeCatalog.address}.`);

  await run('verify:verify', {
    address: snakeSoldier.address,
    constructorArguments: [C.SNAKE_METADATA_URI, C.SNAKE_DEFAULT_URI, C.MAX_GIFTS_PER_PHASE],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
