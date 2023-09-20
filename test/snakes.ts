import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import * as CC from '../scripts/catalogConstants';
// Note: This might seem like too many constants, but makes all code and tests much more easy to follow than random numbers
import {
  ASSET_ID_COMMANDER_EGG_EARTH,
  ASSET_ID_GENERAL_EGG_EARTH,
  ASSET_ID_SOLDIER_EGG_AIR,
  ASSET_ID_SOLDIER_EGG_EARTH,
  ASSET_ID_SOLDIER_EGG_FIRE,
  ASSET_ID_SOLDIER_EGG_WATER,
  BASE_URI_EGGS,
  BASE_URI_GEMS,
  bn,
  COMMANDER_PRICE,
  COMMANDER_RANK,
  GENERAL_PRICE,
  GENERAL_RANK,
  MAX_GIFTS_PER_PHASE,
  SOLDIER_PRICE,
  SOLDIER_RANK,
} from '../scripts/constants';
import {
  ElementGem,
  FactionGem,
  RMRKEquipRenderUtils,
  SerpenTerraPassport,
  SkillGem,
  SnakeCatalog,
  SnakeSoldier,
} from '../typechain-types';
import deployContracts from '../scripts/deploy';
import addFullAssetToSnake from '../scripts/addSnakeAssets';

async function fullFixture(): Promise<{
  snakeSoldiers: SnakeSoldier;
  elementGem: ElementGem;
  factionGem: FactionGem;
  skillGem: SkillGem;
  passport: SerpenTerraPassport;
  catalog: SnakeCatalog;
  renderUtils: RMRKEquipRenderUtils;
}> {
  const { snakeSoldiers, passport, elementGem, factionGem, skillGem, catalog } =
    await deployContracts(true);
  const renderUtilsFactory = await ethers.getContractFactory('RMRKEquipRenderUtils');
  const renderUtils: RMRKEquipRenderUtils = await renderUtilsFactory.deploy();
  return { snakeSoldiers, elementGem, factionGem, skillGem, passport, catalog, renderUtils };
}

describe('SnakeSoldiers', async () => {
  // Note: I define all contracts and users I'll need here.
  let snakeSoldiers: SnakeSoldier;
  let elementGem: ElementGem;
  let factionGem: FactionGem;
  let skillGem: SkillGem;
  let passport: SerpenTerraPassport;
  let catalog: SnakeCatalog;
  let renderUtils: RMRKEquipRenderUtils;
  let issuer: SignerWithAddress;
  let buyer: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let notOwner: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    [issuer, buyer, buyer2, notOwner, ...addrs] = await ethers.getSigners();
    // Note: Fixtures are a great way to set up your tests. Using them speeds up your tests considerably.
    ({ snakeSoldiers, elementGem, factionGem, skillGem, passport, catalog, renderUtils } =
      await loadFixture(fullFixture));
  });

  // Note: Start by checking failure cases
  it('cannot update royalties recipient if not owner', async function () {
    // Note: If you don't specify the user with connect, it will use the first address. In this case the deployer.
    await expect(
      snakeSoldiers.connect(notOwner).updateRoyaltyRecipient(addrs[0].address),
    ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
  });

  // Note: Then check success cases
  it('can update royalties recipient', async function () {
    await snakeSoldiers.updateRoyaltyRecipient(addrs[0].address);
    // Note: Order of expect vs await
    expect(await snakeSoldiers.getRoyaltyRecipient()).to.equal(addrs[0].address);
  });

  it('cannot mint if phase is not open', async function () {
    await expect(
      snakeSoldiers
        .connect(buyer)
        .mint(buyer.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) }),
    ).to.be.revertedWithCustomError(snakeSoldiers, 'SaleNotOpen');
  });

  it('can migrate', async function () {
    await snakeSoldiers.migrate([addrs[0].address, addrs[1].address], 2);
    expect(await snakeSoldiers.ownerOf(1)).to.equal(addrs[0].address);
    expect(await snakeSoldiers.ownerOf(2)).to.equal(addrs[1].address);

    await snakeSoldiers.migrate([addrs[0].address, addrs[1].address], 1);
    expect(await snakeSoldiers.ownerOf(21)).to.equal(addrs[0].address);
    expect(await snakeSoldiers.ownerOf(22)).to.equal(addrs[1].address);

    await snakeSoldiers.migrate([addrs[0].address, addrs[1].address], 0);
    expect(await snakeSoldiers.ownerOf(201)).to.equal(addrs[0].address);
    expect(await snakeSoldiers.ownerOf(202)).to.equal(addrs[1].address);
  });

  // Note: You can nest describe groups so you don't have to repeat setup code and have more readable tests.
  describe('With open sale', async () => {
    beforeEach(async () => {
      await snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE);
    });

    describe('Access control', async () => {
      it('cannot enable next phase if not owner', async function () {
        await expect(
          snakeSoldiers
            .connect(notOwner)
            .enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE.div(2)),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
      });

      it('cannot lock phases if not owner', async function () {
        await expect(snakeSoldiers.connect(notOwner).lockPhases()).to.be.revertedWithCustomError(
          snakeSoldiers,
          'RMRKNotOwner',
        );
      });

      it('cannot manage assets if not owner', async function () {
        await expect(
          snakeSoldiers
            .connect(notOwner)
            .addEquippableAssetEntries(0, ethers.constants.AddressZero, ['ipfs://customAsset'], []),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');

        await expect(
          snakeSoldiers
            .connect(notOwner)
            .addEquippableAssetEntries(0, catalog.address, ['ipfs://customEquippableAsset'], []),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');

        // Let's create a valid asset and a minted token
        await snakeSoldiers
          .connect(issuer)
          .addEquippableAssetEntries(0, ethers.constants.AddressZero, ['ipfs://customAsset'], []);
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers
          .connect(issuer)
          .mint(buyer.address, 1, GENERAL_RANK, { value: GENERAL_PRICE });

        await expect(
          snakeSoldiers.connect(notOwner).addAssetsToTokens([1], [assetId], 0),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');
        await expect(
          snakeSoldiers
            .connect(notOwner)
            .setValidParentForEquippableGroup(assetId, snakeSoldiers.address, 1),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');
        await expect(
          snakeSoldiers.connect(notOwner).setAssetEnumerated(assetId, true),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
      });

      it('cannot pause if not owner', async function () {
        await expect(snakeSoldiers.connect(notOwner).setPaused(true)).to.be.revertedWithCustomError(
          snakeSoldiers,
          'RMRKNotOwner',
        );
      });

      it('cannot set auto accept collection if not owner', async function () {
        await expect(
          snakeSoldiers.connect(notOwner).setAutoAcceptCollection(elementGem.address),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
      });
    });

    it('cannot mint if paused', async function () {
      await snakeSoldiers.connect(issuer).setPaused(true);
      await expect(
        snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) }),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'SalePaused');
    });

    it('can mint if unpaused', async function () {
      await snakeSoldiers.connect(issuer).setPaused(true);
      await snakeSoldiers.connect(issuer).setPaused(false);
      await snakeSoldiers
        .connect(buyer)
        .mint(buyer.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) });
      expect(await snakeSoldiers.balanceOf(buyer.address)).to.equal(4);
    });

    it('cannot mint zero snakes', async function () {
      await expect(
        snakeSoldiers.connect(buyer).mint(buyer.address, 0, SOLDIER_RANK),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MintZero');
    });

    it('cannot mint with the wrong price', async function () {
      await expect(
        snakeSoldiers.connect(buyer).mint(buyer.address, 1, GENERAL_RANK, { value: SOLDIER_PRICE }),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MintUnderpriced');
    });

    it('cannot mint over max supply', async function () {
      // Note: When there are multiple versions of a method, you need to call it with the types of the arguments.
      // Note: Here I'm not depending on the configured maxSupply which could change, but rather on the contract's.
      const maxSupplyGenerals = await snakeSoldiers['maxSupply(uint8)'](GENERAL_RANK);
      await expect(
        snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, maxSupplyGenerals.add(1), GENERAL_RANK, { value: GENERAL_PRICE }),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MintOverMax');
    });

    it('can lock phases and no more phases can be opened', async function () {
      await snakeSoldiers.lockPhases();
      await expect(
        snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MaxPhaseReached');
    });

    it('cannot enable more than 20 phases', async function () {
      for (let i = 2; i <= 20; i++) {
        await snakeSoldiers.enableNextPhase(
          SOLDIER_PRICE.mul(i),
          COMMANDER_PRICE.mul(i),
          GENERAL_PRICE.mul(i),
        );
      }
      await expect(
        snakeSoldiers.enableNextPhase(
          SOLDIER_PRICE.mul(10),
          COMMANDER_PRICE.mul(10),
          GENERAL_PRICE.mul(10),
        ),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MaxPhaseReached');

      expect(await snakeSoldiers['maxSupply()']()).to.equal(5000);
    });

    it('cannot enable next phase with lower prices', async function () {
      // Note: Notice I check for all 3 ranks.
      await expect(
        snakeSoldiers.enableNextPhase(SOLDIER_PRICE.div(2), COMMANDER_PRICE, GENERAL_PRICE),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'NextPhasePriceMustBeEqualOrHigher');
      await expect(
        snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE.div(2), GENERAL_PRICE),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'NextPhasePriceMustBeEqualOrHigher');
      await expect(
        snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE.div(2)),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'NextPhasePriceMustBeEqualOrHigher');
    });

    // Note: Writing this tests, I realized the gift mint function was lost at some point.
    it('cannot gift mint if not owner', async function () {
      await expect(
        snakeSoldiers.connect(notOwner).giftMint(buyer.address, GENERAL_RANK),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
    });

    it('can gift mint', async function () {
      await snakeSoldiers.giftMint(buyer.address, SOLDIER_RANK);
      expect(await snakeSoldiers.balanceOf(buyer.address)).to.eql(bn(1));
    });

    it('cannot gift mint over max gifts per phase', async function () {
      // Note: Once again I'm depending directly on the config for max gifts, not some fixed value which could later change.
      for (let i = 0; i < MAX_GIFTS_PER_PHASE.toNumber(); i++) {
        await snakeSoldiers.giftMint(buyer.address, SOLDIER_RANK);
      }
      await expect(
        snakeSoldiers.giftMint(buyer2.address, SOLDIER_RANK),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MaxGiftsPerPhaseReached');
    });

    // Note: I can use .skip to skip a test or group of tests
    describe('With minted snakes', async () => {
      beforeEach(async () => {
        // Need to enable phase 2,3,4 to mint 4 generals
        await snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE);
        await snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE);
        await snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE);
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 6, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(6) });
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 5, COMMANDER_RANK, { value: COMMANDER_PRICE.mul(5) });
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 4, GENERAL_RANK, { value: GENERAL_PRICE.mul(4) });
        await snakeSoldiers
          .connect(buyer2)
          .mint(buyer2.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) });
      });

      // Note: I can use .only to run a single test or group of tests
      it('can get tokenURI (backwards compatibility)', async function () {
        expect(await snakeSoldiers.tokenURI(1)).to.eql(`${BASE_URI_EGGS}/general/earth`);
      });

      // Note: Even though these are very similar tests, I prefer to have them separated. In case something breaks we know exactly what is failing.
      it('can get max general supply', async function () {
        expect(await snakeSoldiers['maxSupply()']()).to.equal(500 * 2);
      });

      it('can get total general supply', async function () {
        expect(await snakeSoldiers['totalSupply()']()).to.equal(19);
      });

      it('can get max supply per rank', async function () {
        expect(await snakeSoldiers['maxSupply(uint8)'](SOLDIER_RANK)).to.equal(480 * 2);
        expect(await snakeSoldiers['maxSupply(uint8)'](COMMANDER_RANK)).to.equal(18 * 2);
        expect(await snakeSoldiers['maxSupply(uint8)'](GENERAL_RANK)).to.equal(2 * 2);
      });

      it('can get total supply per rank', async function () {
        expect(await snakeSoldiers['totalSupply(uint8)'](SOLDIER_RANK)).to.equal(10);
        expect(await snakeSoldiers['totalSupply(uint8)'](COMMANDER_RANK)).to.equal(5);
        expect(await snakeSoldiers['totalSupply(uint8)'](GENERAL_RANK)).to.equal(4);
      });

      it('can add regular assets', async function () {
        const snakeId = 1;
        await snakeSoldiers.addEquippableAssetEntries(
          0,
          ethers.constants.AddressZero,
          ['ipfs://someAsset'],
          [],
        );
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.addAssetsToTokens([snakeId], [assetId], 0);
        expect(await renderUtils.getPendingAssets(snakeSoldiers.address, snakeId)).to.eql([
          [assetId, bn(0), bn(0), 'ipfs://someAsset'],
        ]);
      });

      it('can add enumerated assets', async function () {
        const snakeId = 1;
        await snakeSoldiers.addEquippableAssetEntries(
          0,
          ethers.constants.AddressZero,
          ['ipfs://someEnumeratedAsset/'],
          [],
        );
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.setAssetEnumerated(assetId, true);
        await snakeSoldiers.addAssetsToTokens([snakeId], [assetId], 0);
        expect(await renderUtils.getPendingAssets(snakeSoldiers.address, snakeId)).to.eql([
          [assetId, bn(0), bn(0), 'ipfs://someEnumeratedAsset/1'],
        ]);
      });

      it('can unset assets as enumerated', async function () {
        const snakeId = 1;
        await snakeSoldiers.addEquippableAssetEntries(
          0,
          ethers.constants.AddressZero,
          ['ipfs://someEnumeratedAsset/'],
          [],
        );
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.setAssetEnumerated(assetId, true);
        await snakeSoldiers.setAssetEnumerated(assetId, false);
        await snakeSoldiers.addAssetsToTokens([snakeId], [assetId], 0);
        expect(await renderUtils.getPendingAssets(snakeSoldiers.address, snakeId)).to.eql([
          [assetId, bn(0), bn(0), 'ipfs://someEnumeratedAsset/'],
        ]);
      });

      it('can add equippable assets', async function () {
        const snakeId = 1;
        await addFullAssetToSnake(
          snakeSoldiers,
          'ipfs://equippableAsset',
          snakeId,
          catalog.address,
          [bn(15), bn(32)],
        );
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.connect(buyer).acceptAsset(snakeId, 0, assetId);
        expect(
          await renderUtils.getExtendedEquippableActiveAssets(snakeSoldiers.address, snakeId),
        ).to.eql([
          [
            assetId,
            bn(0),
            bn(0),
            catalog.address,
            'ipfs://equippableAsset',
            [
              bn(CC.SLOT_ELEMENT_GEM_ID),
              bn(CC.SLOT_SKILL_GEM_ID),
              bn(CC.SLOT_FACTION_GEM_ID),
              bn(15),
              bn(32),
            ],
          ],
        ]);
      });

      it('can set valid parent for equipable group id', async function () {
        const madeUpEquippablegroupId = 1;
        const madeUpPartId = 1;
        // For the sake of testing, we'll just set the valid parent to the contract itself
        expect(
          await snakeSoldiers.setValidParentForEquippableGroup(
            madeUpEquippablegroupId,
            snakeSoldiers.address,
            madeUpPartId,
          ),
        )
          .to.emit(snakeSoldiers, 'ValidParentEquippableGroupIdSet')
          .withArgs(madeUpEquippablegroupId, snakeSoldiers.address, madeUpPartId);
      });

      it('eggs have the expected metadata', async function () {
        // Generals
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 1)).to.eql([
          [ASSET_ID_GENERAL_EGG_EARTH, bn(0), `${BASE_URI_EGGS}/general/earth`],
        ]);

        // Commanders
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 21)).to.eql([
          [ASSET_ID_COMMANDER_EGG_EARTH, bn(0), `${BASE_URI_EGGS}/commander/earth`],
        ]);

        // Soldiers
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 201)).to.eql([
          [ASSET_ID_SOLDIER_EGG_EARTH, bn(0), `${BASE_URI_EGGS}/soldier/earth`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 202)).to.eql([
          [ASSET_ID_SOLDIER_EGG_WATER, bn(0), `${BASE_URI_EGGS}/soldier/water`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 203)).to.eql([
          [ASSET_ID_SOLDIER_EGG_AIR, bn(0), `${BASE_URI_EGGS}/soldier/air`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 204)).to.eql([
          [ASSET_ID_SOLDIER_EGG_FIRE, bn(0), `${BASE_URI_EGGS}/soldier/fire`],
        ]);
      });

      it('cannot withdraw raised funds if not owner', async function () {
        const expectedBalance = SOLDIER_PRICE.mul(4).add(COMMANDER_PRICE.mul(2)).add(GENERAL_PRICE);
        await expect(
          snakeSoldiers.connect(notOwner).withdrawRaised(notOwner.address, expectedBalance),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwner');
      });

      it('can withdraw raised funds', async function () {
        // Note: I withdraw to a different address so I don't need to account for gas costs on the signer
        const beneficiary = addrs[0];
        const beneficiaryBalance = await ethers.provider.getBalance(beneficiary.address);

        const expectedBalance = SOLDIER_PRICE.mul(10)
          .add(COMMANDER_PRICE.mul(5))
          .add(GENERAL_PRICE.mul(4));
        expect(await ethers.provider.getBalance(snakeSoldiers.address)).to.eql(expectedBalance);

        await snakeSoldiers.withdrawRaised(beneficiary.address, expectedBalance);
        const expectedBeneficiaryBalance = beneficiaryBalance.add(expectedBalance);

        expect(await ethers.provider.getBalance(snakeSoldiers.address)).to.eql(bn(0));
        expect(await ethers.provider.getBalance(beneficiary.address)).to.eql(
          expectedBeneficiaryBalance,
        );
      });

      it('reduces supply total if burned', async function () {
        await snakeSoldiers.connect(buyer)['burn(uint256)'](1);
        expect(await snakeSoldiers['totalSupply(uint8)'](2)).to.equal(3);

        await snakeSoldiers.connect(buyer)['burn(uint256)'](21);
        expect(await snakeSoldiers['totalSupply(uint8)'](1)).to.equal(4);

        await snakeSoldiers.connect(buyer)['burn(uint256)'](201);
        expect(await snakeSoldiers['totalSupply(uint8)'](0)).to.equal(9);
      });

      it('cannot mint more even after burning', async function () {
        await snakeSoldiers.connect(buyer)['burn(uint256)'](1);
        await expect(
          snakeSoldiers
            .connect(buyer)
            .mint(buyer.address, 1, GENERAL_RANK, { value: GENERAL_PRICE }),
        ).to.be.revertedWithCustomError(snakeSoldiers, 'MintOverMax');
      });

      it('does reuse ids after burn', async function () {
        await snakeSoldiers.connect(buyer)['burn(uint256)'](21);
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 2, COMMANDER_RANK, { value: COMMANDER_PRICE.mul(2) });
        expect(await snakeSoldiers.ownerOf(26)).to.equal(buyer.address);
        expect(await snakeSoldiers.ownerOf(27)).to.equal(buyer.address);
      });

      describe('Gems', function () {
        it('has support for soulbound interface on faction and element gems', async function () {
          expect(await elementGem.supportsInterface('0x91a6262f')).to.eql(true);
          expect(await factionGem.supportsInterface('0x91a6262f')).to.eql(true);
          expect(await skillGem.supportsInterface('0x91a6262f')).to.eql(false);
        });

        it('has support for all legos on gems', async function () {
          expect(await elementGem.supportsInterface('0x28bc9ae4')).to.eql(true);
          expect(await elementGem.supportsInterface('0x06b4329a')).to.eql(true);
          expect(await elementGem.supportsInterface('0x42b0e56f')).to.eql(true);

          expect(await factionGem.supportsInterface('0x28bc9ae4')).to.eql(true);
          expect(await factionGem.supportsInterface('0x06b4329a')).to.eql(true);
          expect(await factionGem.supportsInterface('0x42b0e56f')).to.eql(true);

          expect(await skillGem.supportsInterface('0x28bc9ae4')).to.eql(true);
          expect(await skillGem.supportsInterface('0x06b4329a')).to.eql(true);
          expect(await skillGem.supportsInterface('0x42b0e56f')).to.eql(true);
        });

        it('cannot claim gems if claim is not active', async function () {
          await expect(elementGem.connect(buyer).claim(1)).to.be.revertedWithCustomError(
            elementGem,
            'ClaimingNotActive',
          );
        });

        // Note: Some times, I will just test a few things at once because they all depend on the exact same setup
        it('can claim gems', async function () {
          const tokenId = 1;

          expect(await elementGem.isClaimActive()).to.eql(false);

          await elementGem.setClaimActive();
          await factionGem.setClaimActive();
          await skillGem.setClaimActive();

          expect(await elementGem.isClaimActive()).to.eql(true);

          await elementGem.connect(buyer).claim(tokenId);
          await factionGem.connect(buyer).claim(tokenId);
          await skillGem.connect(buyer).claim(tokenId);

          expect(await elementGem.claimed(tokenId)).to.eql(true);
          expect(await factionGem.claimed(tokenId)).to.eql(true);
          expect(await skillGem.claimed(tokenId)).to.eql(true);
          expect(await snakeSoldiers.childrenOf(tokenId)).to.eql([
            // It mints the same ID on the gem
            [bn(tokenId), elementGem.address],
            [bn(tokenId), factionGem.address],
            [bn(tokenId), skillGem.address],
          ]);

          expect(await elementGem.tokenURI(tokenId)).to.eql(`${BASE_URI_GEMS}/elements/earth.json`);
          expect(await factionGem.tokenURI(tokenId)).to.eql(
            `${BASE_URI_GEMS}/factions/mountain.json`,
          );
          expect(await skillGem.tokenURI(tokenId)).to.eql(`${BASE_URI_GEMS}/skills/tank.json`);
        });

        it('does not autoaccept NFTs which are not set to be auto accepted', async function () {
          await snakeSoldiers
            .connect(buyer)
            .nestTransferFrom(buyer.address, snakeSoldiers.address, 201, 1, '0x');
          expect(await snakeSoldiers.pendingChildrenOf(1)).to.eql([
            [bn(201), snakeSoldiers.address],
          ]);
        });

        it('cannot transfer faction gem if not passport holder', async function () {
          await factionGem.setClaimActive();
          await factionGem.connect(buyer).claim(1);
          expect(
            await factionGem.isTransferable(
              1,
              ethers.constants.AddressZero,
              ethers.constants.AddressZero,
            ),
          ).to.eql(false);

          await expect(
            snakeSoldiers
              .connect(buyer)
              .transferChild(1, buyer.address, 0, 0, factionGem.address, 1, false, '0x'),
          ).to.be.revertedWithCustomError(factionGem, 'RMRKCannotTransferSoulbound');
        });

        it('can transfer faction gem if it is forest even if not passport holder', async function () {
          const forestSnakeId = 24;
          await factionGem.setClaimActive();
          await factionGem.connect(buyer).claim(forestSnakeId);

          expect(
            await factionGem.isTransferable(
              forestSnakeId,
              ethers.constants.AddressZero,
              ethers.constants.AddressZero,
            ),
          ).to.eql(true);

          await snakeSoldiers
            .connect(buyer)
            .transferChild(
              forestSnakeId,
              buyer.address,
              0,
              0,
              factionGem.address,
              forestSnakeId,
              false,
              '0x',
            );
          expect(await factionGem.balanceOf(buyer.address)).to.eql(bn(1));
        });

        it('can transfer faction gem if passport holder and passport is burned', async function () {
          await factionGem.setClaimActive();
          await factionGem.connect(buyer).claim(1);
          await passport.mint(buyer.address, 1);

          await snakeSoldiers
            .connect(buyer)
            .transferChild(1, buyer.address, 0, 0, factionGem.address, 1, false, '0x');
          expect(await factionGem.balanceOf(buyer.address)).to.eql(bn(1));
          expect(await passport.balanceOf(buyer.address)).to.eql(bn(0));
        });

        describe('With claimed gems', function () {
          beforeEach(async function () {
            const tokenIds = [1, 2, 3, 4, 21, 22, 23, 24, 25, 201, 202, 203, 204, 205, 206];
            await elementGem.setClaimActive();
            await factionGem.setClaimActive();
            await skillGem.setClaimActive();

            await elementGem.connect(buyer).claimMany(tokenIds);
            await factionGem.connect(buyer).claimMany(tokenIds);
            await skillGem.connect(buyer).claimMany(tokenIds);

            expect(await elementGem.totalSupply()).to.eql(bn(15));
            expect(await elementGem.maxSupply()).to.eql(bn(5000));
          });

          it('assigns gems to generals as expected (full match)', async function () {
            expect(await elementGem.getAssetMetadata(1, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/earth.json`,
            );
            expect(await factionGem.getAssetMetadata(1, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/mountain.json`,
            );
            expect(await skillGem.getAssetMetadata(1, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/tank.json`,
            );

            expect(await elementGem.getAssetMetadata(2, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/water.json`,
            );
            expect(await factionGem.getAssetMetadata(2, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/islands.json`,
            );
            expect(await skillGem.getAssetMetadata(2, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/healer.json`,
            );

            expect(await elementGem.getAssetMetadata(3, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/air.json`,
            );
            expect(await factionGem.getAssetMetadata(3, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/valley.json`,
            );
            expect(await skillGem.getAssetMetadata(3, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/sniper.json`,
            );

            expect(await elementGem.getAssetMetadata(4, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/fire.json`,
            );
            expect(await factionGem.getAssetMetadata(4, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/desert.json`,
            );
            expect(await skillGem.getAssetMetadata(4, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/melee.json`,
            );
          });

          it('assigns gems to commanders as expected (skill matches element)', async function () {
            expect(await elementGem.getAssetMetadata(21, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/earth.json`,
            );
            expect(await factionGem.getAssetMetadata(21, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/mountain.json`,
            );
            expect(await skillGem.getAssetMetadata(21, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/tank.json`,
            );

            expect(await elementGem.getAssetMetadata(22, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/water.json`,
            );
            expect(await factionGem.getAssetMetadata(22, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/islands.json`,
            );
            expect(await skillGem.getAssetMetadata(22, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/healer.json`,
            );

            expect(await elementGem.getAssetMetadata(23, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/air.json`,
            );
            expect(await factionGem.getAssetMetadata(23, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/valley.json`,
            );
            expect(await skillGem.getAssetMetadata(23, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/sniper.json`,
            );

            expect(await elementGem.getAssetMetadata(24, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/fire.json`,
            );
            expect(await factionGem.getAssetMetadata(24, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/forest.json`,
            );
            expect(await skillGem.getAssetMetadata(24, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/melee.json`,
            );

            expect(await elementGem.getAssetMetadata(25, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/earth.json`,
            );
            expect(await factionGem.getAssetMetadata(25, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/desert.json`,
            );
            expect(await skillGem.getAssetMetadata(25, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/tank.json`,
            );
          });

          it('assigns gems to soldiers as expected', async function () {
            expect(await elementGem.getAssetMetadata(201, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/earth.json`,
            );
            expect(await factionGem.getAssetMetadata(201, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/mountain.json`,
            );
            expect(await skillGem.getAssetMetadata(201, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/melee.json`,
            );

            expect(await elementGem.getAssetMetadata(202, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/water.json`,
            );
            expect(await factionGem.getAssetMetadata(202, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/islands.json`,
            );
            expect(await skillGem.getAssetMetadata(202, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/tank.json`,
            );

            expect(await elementGem.getAssetMetadata(203, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/air.json`,
            );
            expect(await factionGem.getAssetMetadata(203, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/valley.json`,
            );
            expect(await skillGem.getAssetMetadata(203, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/tank.json`,
            );

            expect(await elementGem.getAssetMetadata(204, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/fire.json`,
            );
            expect(await factionGem.getAssetMetadata(204, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/forest.json`,
            );
            expect(await skillGem.getAssetMetadata(204, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/healer.json`,
            );

            expect(await elementGem.getAssetMetadata(205, 1)).to.eql(
              `${BASE_URI_GEMS}/elements/earth.json`,
            );
            expect(await factionGem.getAssetMetadata(205, 1)).to.eql(
              `${BASE_URI_GEMS}/factions/desert.json`,
            );
            expect(await skillGem.getAssetMetadata(205, 1)).to.eql(
              `${BASE_URI_GEMS}/skills/healer.json`,
            );
          });
        });
      });
    });
  });
});
