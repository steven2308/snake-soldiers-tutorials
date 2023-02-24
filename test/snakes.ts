import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import * as CC from '../scripts/catalogConstants';
// Note: This might seem like too many constants, but makes all code and tests much more easy to follow than random numbers
import {
  ASSET_ID_COMMANDER_EGG_EARTH,
  ASSET_ID_COMMANDER_EGG,
  ASSET_ID_GENERAL_EGG_EARTH,
  ASSET_ID_GENERAL_EGG,
  ASSET_ID_SOLDIER_EGG_AIR,
  ASSET_ID_SOLDIER_EGG_EARTH,
  ASSET_ID_SOLDIER_EGG_FIRE,
  ASSET_ID_SOLDIER_EGG_WATER,
  ASSET_ID_SOLDIER_EGG,
  BASE_URI,
  bn,
  COMMANDER_PRICE,
  COMMANDER_RANK,
  GENERAL_PRICE,
  GENERAL_RANK,
  MAX_GIFTS_PER_PHASE,
  SNAKE_DEFAULT_URI,
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
  // let passport: SerpenTerraPassport;
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
    ({ snakeSoldiers, elementGem, factionGem, skillGem, catalog, renderUtils } = await loadFixture(
      fullFixture,
    ));
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

  // Note: You can nest describe groups so you don't have to repeat setup code and have more readable tests.
  describe('With open sale', async () => {
    beforeEach(async () => {
      await snakeSoldiers.enableNextPhase(SOLDIER_PRICE, COMMANDER_PRICE, GENERAL_PRICE);
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

    it('cannot enable more than 4 phases', async function () {
      await snakeSoldiers.enableNextPhase(
        SOLDIER_PRICE.mul(2),
        COMMANDER_PRICE.mul(2),
        GENERAL_PRICE.mul(2),
      ); // Phase 2
      await snakeSoldiers.enableNextPhase(
        SOLDIER_PRICE.mul(3),
        COMMANDER_PRICE.mul(3),
        GENERAL_PRICE.mul(3),
      ); // Phase 3
      await snakeSoldiers.enableNextPhase(
        SOLDIER_PRICE.mul(4),
        COMMANDER_PRICE.mul(4),
        GENERAL_PRICE.mul(4),
      ); // Phase 4
      await expect(
        snakeSoldiers.enableNextPhase(SOLDIER_PRICE.div(2), COMMANDER_PRICE, GENERAL_PRICE),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'MaxPhaseReached');
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

    // Note: I could group all this in a describe since they are all access checks.
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
        snakeSoldiers.connect(notOwner).addAssetEntry('ipfs://customAsset'),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');

      await expect(
        snakeSoldiers
          .connect(notOwner)
          .addEquippableAssetEntry(0, catalog.address, 'ipfs://customEquippableAsset', []),
      ).to.be.revertedWithCustomError(snakeSoldiers, 'RMRKNotOwnerOrContributor');

      // Let's create a valid asset and a minted token
      await snakeSoldiers.connect(issuer).addAssetEntry('ipfs://customAsset');
      const assetId = await snakeSoldiers.totalAssets();
      await snakeSoldiers
        .connect(buyer)
        .mint(buyer.address, 1, GENERAL_RANK, { value: GENERAL_PRICE });

      await expect(
        snakeSoldiers.connect(notOwner).addAssetToToken(1, assetId, 0),
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
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) });
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 2, COMMANDER_RANK, { value: COMMANDER_PRICE.mul(2) });
        await snakeSoldiers
          .connect(buyer)
          .mint(buyer.address, 1, GENERAL_RANK, { value: GENERAL_PRICE });
        await snakeSoldiers
          .connect(buyer2)
          .mint(buyer2.address, 4, SOLDIER_RANK, { value: SOLDIER_PRICE.mul(4) });
      });

      // Note: I can use .only to run a single test or group of tests
      it('can get tokenURI (backwards compatibility)', async function () {
        expect(await snakeSoldiers.tokenURI(1)).to.eql(SNAKE_DEFAULT_URI);
      });

      // Note: Even though these are very similar tests, I prefer to have them separated. In case something breaks we know exactly what is failing.
      it('can get max general supply', async function () {
        expect(await snakeSoldiers['maxSupply()']()).to.equal(1250);
      });

      it('can get total general supply', async function () {
        expect(await snakeSoldiers['totalSupply()']()).to.equal(11);
      });

      it('can get max supply per rank', async function () {
        expect(await snakeSoldiers['maxSupply(uint8)'](SOLDIER_RANK)).to.equal(1200);
        expect(await snakeSoldiers['maxSupply(uint8)'](COMMANDER_RANK)).to.equal(45);
        expect(await snakeSoldiers['maxSupply(uint8)'](GENERAL_RANK)).to.equal(5);
      });

      it('can get total supply per rank', async function () {
        expect(await snakeSoldiers['totalSupply(uint8)'](SOLDIER_RANK)).to.equal(8);
        expect(await snakeSoldiers['totalSupply(uint8)'](COMMANDER_RANK)).to.equal(2);
        expect(await snakeSoldiers['totalSupply(uint8)'](GENERAL_RANK)).to.equal(1);
      });

      it('can add regular assets', async function () {
        const snakeId = 1;
        await snakeSoldiers.addAssetEntry('ipfs://someAsset');
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.addAssetToToken(snakeId, assetId, 0);
        expect(await renderUtils.getPendingAssets(snakeSoldiers.address, snakeId)).to.eql([
          [assetId, bn(0), bn(0), 'ipfs://someAsset'],
        ]);
      });

      it('can add enumerated assets', async function () {
        const snakeId = 1;
        await snakeSoldiers.addAssetEntry('ipfs://someEnumeratedAsset/');
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.setAssetEnumerated(assetId, true);
        await snakeSoldiers.addAssetToToken(snakeId, assetId, 0);
        expect(await renderUtils.getPendingAssets(snakeSoldiers.address, snakeId)).to.eql([
          [assetId, bn(0), bn(0), 'ipfs://someEnumeratedAsset/1'],
        ]);
      });

      it('can unset assets as enumerated', async function () {
        const snakeId = 1;
        await snakeSoldiers.addAssetEntry('ipfs://someEnumeratedAsset/');
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.setAssetEnumerated(assetId, true);
        await snakeSoldiers.setAssetEnumerated(assetId, false);
        await snakeSoldiers.addAssetToToken(snakeId, assetId, 0);
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
          [
            CC.HEAD_FIRE_ID,
            CC.CHEST_FIRE_ID,
            CC.BODY_FIRE_ID,
            CC.EYES_FIRE_ID,
            CC.MOUTH_FIRE_ID,
            CC.FANGS_AIR_ID,
            CC.TAIL_FIRE_ID,
          ],
        );
        const assetId = await snakeSoldiers.totalAssets();
        await snakeSoldiers.connect(buyer).acceptAsset(snakeId, 0, assetId);
        expect(
          await renderUtils.getExtendedEquippableActiveAssets(snakeSoldiers.address, snakeId),
        ).to.eql([
          [
            assetId,
            bn(0),
            0,
            catalog.address,
            'ipfs://equippableAsset',
            [
              CC.SLOT_ELEMENT_GEM_ID,
              CC.SLOT_SKILL_GEM_ID,
              CC.SLOT_FACTION_GEM_ID,
              CC.HEAD_FIRE_ID,
              CC.CHEST_FIRE_ID,
              CC.BODY_FIRE_ID,
              CC.EYES_FIRE_ID,
              CC.MOUTH_FIRE_ID,
              CC.FANGS_AIR_ID,
              CC.TAIL_FIRE_ID,
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

      it('can reveal egg', async function () {
        // Generals
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 1)).to.eql([
          [ASSET_ID_GENERAL_EGG, 0, `${BASE_URI}/eggs/general/generic`],
        ]);
        await snakeSoldiers.connect(buyer).revealElement(1);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 1)).to.eql([
          [ASSET_ID_GENERAL_EGG_EARTH, 0, `${BASE_URI}/eggs/general/earth`],
        ]);

        // Commanders
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 21)).to.eql([
          [ASSET_ID_COMMANDER_EGG, 0, `${BASE_URI}/eggs/commander/generic`],
        ]);
        await snakeSoldiers.connect(buyer).revealElement(21);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 21)).to.eql([
          [ASSET_ID_COMMANDER_EGG_EARTH, 0, `${BASE_URI}/eggs/commander/earth`],
        ]);

        // Soldiers
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 201)).to.eql([
          [ASSET_ID_SOLDIER_EGG, 0, `${BASE_URI}/eggs/soldier/generic`],
        ]);
        await snakeSoldiers.connect(buyer).revealElement(201);
        await snakeSoldiers.connect(buyer).revealElement(202);
        await snakeSoldiers.connect(buyer).revealElement(203);
        await snakeSoldiers.connect(buyer).revealElement(204);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 201)).to.eql([
          [ASSET_ID_SOLDIER_EGG_EARTH, 0, `${BASE_URI}/eggs/soldier/earth`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 202)).to.eql([
          [ASSET_ID_SOLDIER_EGG_WATER, 0, `${BASE_URI}/eggs/soldier/water`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 203)).to.eql([
          [ASSET_ID_SOLDIER_EGG_AIR, 0, `${BASE_URI}/eggs/soldier/air`],
        ]);
        expect(await renderUtils.getExtendedActiveAssets(snakeSoldiers.address, 204)).to.eql([
          [ASSET_ID_SOLDIER_EGG_FIRE, 0, `${BASE_URI}/eggs/soldier/fire`],
        ]);
      });

      it('cannot reveal egg if not token owner', async function () {
        await expect(snakeSoldiers.connect(buyer2).revealElement(1)).to.be.revertedWithCustomError(
          snakeSoldiers,
          'RMRKNotApprovedForAssetsOrOwner',
        );
      });

      it('cannot reveal egg twice', async function () {
        await snakeSoldiers.connect(buyer).revealElement(1);
        await expect(snakeSoldiers.connect(buyer).revealElement(1)).to.be.revertedWithCustomError(
          snakeSoldiers,
          'ElementAlreadyRevealed',
        );
      });

      // Note: Some times, I will just test a few things at once because they all depend on the exact same setup
      it('can claim gems', async function () {
        const tokenId = 1;
        // All snakes use the same asset it, but the metadata varies according to type
        const gemAssetId = 1;
        await elementGem.connect(buyer).claim(tokenId);
        await factionGem.connect(buyer).claim(tokenId);
        await skillGem.connect(buyer).claim(tokenId);

        expect(await elementGem.claimed(tokenId)).to.eql(true);
        expect(await factionGem.claimed(tokenId)).to.eql(true);
        expect(await skillGem.claimed(tokenId)).to.eql(true);
        expect(await snakeSoldiers.pendingChildrenOf(tokenId)).to.eql([
          // It mints the same ID on the gem
          [bn(tokenId), elementGem.address],
          [bn(tokenId), factionGem.address],
          [bn(tokenId), skillGem.address],
        ]);

        expect(await elementGem.getAssetMetadata(tokenId, gemAssetId)).to.eql(
          `${BASE_URI}/gems/elements/earth`,
        );
        expect(await factionGem.getAssetMetadata(tokenId, gemAssetId)).to.eql(
          `${BASE_URI}/gems/factions/mountain`,
        );
        expect(await skillGem.getAssetMetadata(tokenId, gemAssetId)).to.eql(
          `${BASE_URI}/gems/skills/tank`,
        );
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

        const expectedBalance = SOLDIER_PRICE.mul(8).add(COMMANDER_PRICE.mul(2)).add(GENERAL_PRICE);
        expect(await ethers.provider.getBalance(snakeSoldiers.address)).to.eql(expectedBalance);

        await snakeSoldiers.withdrawRaised(beneficiary.address, expectedBalance);
        const expectedBeneficiaryBalance = beneficiaryBalance.add(expectedBalance);

        expect(await ethers.provider.getBalance(snakeSoldiers.address)).to.eql(bn(0));
        expect(await ethers.provider.getBalance(beneficiary.address)).to.eql(
          expectedBeneficiaryBalance,
        );
      });
    });
  });
});
