// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.21;

import "@rmrk-team/evm-contracts/contracts/RMRK/equippable/RMRKMinifiedEquippable.sol";
import "@rmrk-team/evm-contracts/contracts/implementations/utils/RMRKImplementationBase.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IERC20Min.sol";

error BadMigration();
error CannotUnequipElementGem();
error ElementAlreadyRevealed();
error MaxGiftsPerPhaseReached();
error MaxPhaseReached();
error MintOverMax();
error MintUnderpriced();
error MintZero();
error NextPhasePriceMustBeEqualOrHigher();
error SaleNotOpen();
error SalePaused();

contract SnakeSoldier is RMRKImplementationBase, RMRKMinifiedEquippable {
    using Strings for uint256;

    event Minted(
        Rank rank,
        address indexed buyer,
        uint256 indexed from,
        uint256 indexed to
    );

    enum Rank {
        Soldier,
        Commander,
        General
    }

    uint256 private constant _MAX_SUPPLY_PER_PHASE_SOLDIERS = 240; // A maximum possible of 240*20=4800
    uint256 private constant _MAX_SUPPLY_PER_PHASE_COMMANDERS = 9; // A maximum possible of 9*20=180
    uint256 private constant _MAX_SUPPLY_PER_PHASE_GENERALS = 1; // A maximum possible of 1*20=20
    uint256 private constant _MAX_PHASES = 20;

    uint64 private constant _LOWEST_POSSIBLE_PRIORITY = (2 ^ 64) - 1;

    uint64 private constant _ASSET_ID_SOLDIER_EGG_FIRE = 1;
    // uint64 private constant _ASSET_ID_SOLDIER_EGG_EARTH = 2;
    // uint64 private constant _ASSET_ID_SOLDIER_EGG_WATER = 3;
    // uint64 private constant _ASSET_ID_SOLDIER_EGG_AIR = 4;
    uint64 private constant _ASSET_ID_COMMANDER_EGG_FIRE = 5;
    // uint64 private constant _ASSET_ID_COMMANDER_EGG_EARTH = 6;
    // uint64 private constant _ASSET_ID_COMMANDER_EGG_WATER = 7;
    // uint64 private constant _ASSET_ID_COMMANDER_EGG_AIR = 8;
    uint64 private constant _ASSET_ID_GENERAL_EGG_FIRE = 9;
    // uint64 private constant _ASSET_ID_GENERAL_EGG_EARTH = 10;
    // uint64 private constant _ASSET_ID_GENERAL_EGG_WATER = 11;
    // uint64 private constant _ASSET_ID_GENERAL_EGG_AIR = 12;

    uint256 private constant _GENERALS_OFFSET = 0; // No offset.
    uint256 private constant _COMMANDERS_OFFSET =
        _MAX_SUPPLY_PER_PHASE_GENERALS * _MAX_PHASES; // Starts after generals.
    uint256 private constant _SOLDIERS_OFFSET =
        (_MAX_SUPPLY_PER_PHASE_COMMANDERS + _MAX_SUPPLY_PER_PHASE_GENERALS) *
            _MAX_PHASES; // After generals and Commanders.

    uint256 private _pricePerSoldier;
    uint256 private _pricePerCommander;
    uint256 private _pricePerGeneral;

    mapping(uint256 => uint256) private _elementRevealed;
    mapping(Rank => uint256) private _totalMinted;
    mapping(Rank => uint256) private _totalBurned;
    uint256 private _phase;
    uint256 private _phasesLocked;
    uint256 private _paused;
    mapping(uint64 => uint256) private _isTokenAssetEnumerated;
    mapping(address => bool) private _autoAcceptCollection;
    uint256 private _totalGifts;
    uint256 private immutable _maxGiftsPerPhase;

    uint256 private constant _MAX_MIGRATIONS = 500;
    uint256 private _total_migrations;
    uint64 private _slotForElementGem;

    constructor(
        string memory collectionMetadata,
        uint256 maxGiftsPerPhase_
    )
        RMRKImplementationBase(
            "Snake Soldiers",
            "SS",
            collectionMetadata,
            5000,
            _msgSender(),
            500
        )
    {
        _maxGiftsPerPhase = maxGiftsPerPhase_;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual returns (string memory) {
        _requireMinted(tokenId);
        // We assume this alway has at least 1 element, since we add it on mint and it can only be replaced, not removed
        uint64[] memory priorities = getActiveAssetPriorities(tokenId);
        uint256 len = priorities.length;
        uint64 maxPriority = _LOWEST_POSSIBLE_PRIORITY;
        uint64 maxPriorityIndex;
        for (uint64 i; i < len; ) {
            uint64 currentPrio = priorities[i];
            if (currentPrio < maxPriority) {
                maxPriority = currentPrio;
                maxPriorityIndex = i;
            }
            unchecked {
                ++i;
            }
        }
        uint64 maxPriorityAssetId = getActiveAssets(tokenId)[maxPriorityIndex];
        return getAssetMetadata(tokenId, maxPriorityAssetId);
    }

    function addEquippableAssetEntries(
        uint64 equippableGroupId,
        address catalogAddress,
        string[] memory metadataURI,
        uint64[] memory partIds
    ) public virtual onlyOwnerOrContributor {
        uint256 len = metadataURI.length;
        for (uint256 i; i < len; ) {
            unchecked {
                ++_totalAssets;
            }
            _addAssetEntry(
                uint64(_totalAssets),
                equippableGroupId,
                catalogAddress,
                metadataURI[i],
                partIds
            );
            unchecked {
                ++i;
            }
        }
    }

    function addAssetsToTokens(
        uint256[] memory tokenIds,
        uint64[] memory assetIds,
        uint64 replacesAssetWithId
    ) public virtual onlyOwnerOrContributor {
        uint256 len = tokenIds.length;
        for (uint256 i; i < len; ) {
            _addAssetToToken(tokenIds[i], assetIds[i], replacesAssetWithId);
            unchecked {
                ++i;
            }
        }
    }

    function setValidParentForEquippableGroup(
        uint64 equippableGroupId,
        address parentAddress,
        uint64 partId
    ) public virtual onlyOwnerOrContributor {
        _setValidParentForEquippableGroup(
            equippableGroupId,
            parentAddress,
            partId
        );
    }

    function getAssetMetadata(
        uint256 tokenId,
        uint64 assetId
    ) public view override returns (string memory) {
        string memory metaUri = super.getAssetMetadata(tokenId, assetId);
        if (_isTokenAssetEnumerated[assetId] != 0)
            metaUri = string(abi.encodePacked(metaUri, tokenId.toString()));
        return metaUri;
    }

    function setAssetEnumerated(
        uint64 assetId,
        bool enumerated
    ) external onlyOwner {
        if (enumerated) _isTokenAssetEnumerated[assetId] = 1;
        else delete _isTokenAssetEnumerated[assetId];
    }

    function totalSupply(Rank rank) public view returns (uint256) {
        return _totalMinted[rank] - _totalBurned[rank];
    }

    function totalSupply() public view override returns (uint256) {
        return
            totalSupply(Rank.Soldier) +
            totalSupply(Rank.Commander) +
            totalSupply(Rank.General);
    }

    function maxSupply(Rank rank) public view returns (uint256) {
        if (rank == Rank.Soldier)
            return _MAX_SUPPLY_PER_PHASE_SOLDIERS * _phase;
        else if (rank == Rank.Commander)
            return _MAX_SUPPLY_PER_PHASE_COMMANDERS * _phase;
        else return _MAX_SUPPLY_PER_PHASE_GENERALS * _phase;
    }

    function maxSupply() public view override returns (uint256) {
        return
            (_MAX_SUPPLY_PER_PHASE_SOLDIERS +
                _MAX_SUPPLY_PER_PHASE_COMMANDERS +
                _MAX_SUPPLY_PER_PHASE_GENERALS) * _phase;
    }

    function setPaused(bool paused) external onlyOwner {
        _paused = paused ? 1 : 0;
    }

    function enableNextPhase(
        uint256 pricePerSoldier,
        uint256 pricePerCommander,
        uint256 pricePerGeneral
    ) external onlyOwner {
        if (_phase == _MAX_PHASES || _phasesLocked == 1)
            revert MaxPhaseReached();

        if (
            _pricePerSoldier > pricePerSoldier ||
            _pricePerCommander > pricePerCommander ||
            _pricePerGeneral > pricePerGeneral
        ) revert NextPhasePriceMustBeEqualOrHigher();

        _phase += 1;
        _pricePerSoldier = pricePerSoldier;
        _pricePerCommander = pricePerCommander;
        _pricePerGeneral = pricePerGeneral;
    }

    function lockPhases() external onlyOwner {
        _phasesLocked = 1;
    }

    function _rankOffset(Rank rank) private pure returns (uint256) {
        if (rank == Rank.Soldier) return _SOLDIERS_OFFSET;
        else if (rank == Rank.Commander) return _COMMANDERS_OFFSET;
        else return _GENERALS_OFFSET;
    }

    function pricePerMint(Rank rank) public view returns (uint256) {
        if (rank == Rank.Soldier) return _pricePerSoldier;
        else if (rank == Rank.Commander) return _pricePerCommander;
        else return _pricePerGeneral;
    }

    function mint(address to, uint256 numToMint, Rank rank) external payable {
        _mintChecks(numToMint, rank);
        uint256 mintPriceRequired = numToMint * pricePerMint(rank);
        if (mintPriceRequired != msg.value) revert MintUnderpriced();

        _innerMint(to, numToMint, rank);
    }

    function giftMint(address to, Rank rank) external onlyOwner {
        _mintChecks(1, rank);

        if (_totalGifts == _maxGiftsPerPhase * _phase)
            revert MaxGiftsPerPhaseReached();
        unchecked {
            ++_totalGifts;
        }

        _innerMint(to, 1, rank);
    }

    function _mintChecks(uint256 numToMint, Rank rank) private view {
        if (_phase == 0) revert SaleNotOpen();
        if (_paused == 1) revert SalePaused();
        if (numToMint == uint256(0)) revert MintZero();
        if (numToMint + _totalMinted[rank] > maxSupply(rank))
            revert MintOverMax();
    }

    function migrate(address[] memory owners, Rank rank) public onlyOwner {
        uint256 len = owners.length;
        if (_total_migrations + len > _MAX_MIGRATIONS) revert BadMigration();
        _total_migrations += len;
        for (uint256 i; i < len; ) {
            _innerMint(owners[i], 1, rank);
            unchecked {
                ++i;
            }
        }
    }

    function _innerMint(address to, uint256 numToMint, Rank rank) private {
        uint256 nextToken = _totalMinted[rank] + 1 + _rankOffset(rank);
        unchecked {
            _totalMinted[rank] += numToMint;
        }
        uint256 totalSupplyOffset = nextToken + numToMint;
        uint64 assetId;

        for (uint256 i = nextToken; i < totalSupplyOffset; ) {
            _safeMint(to, i, "");
            // The "+ tokenId % 4" part, sets the asset for the right element
            if (i > _SOLDIERS_OFFSET) {
                assetId = _ASSET_ID_SOLDIER_EGG_FIRE;
            } else if (i > _COMMANDERS_OFFSET) {
                assetId = _ASSET_ID_COMMANDER_EGG_FIRE;
            } else {
                assetId = _ASSET_ID_GENERAL_EGG_FIRE;
            }
            assetId += uint64(i % 4);
            _addAssetToToken(i, assetId, 0);
            _acceptAsset(i, 0, assetId);
            unchecked {
                ++i;
            }
        }

        emit Minted(rank, to, nextToken, totalSupplyOffset - 1);
    }

    function withdrawRaised(address to, uint256 amount) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (to == address(0)) {
            Rank rank;
            if (tokenId > _SOLDIERS_OFFSET) rank = Rank.Soldier;
            else if (tokenId > _COMMANDERS_OFFSET) rank = Rank.Commander;
            else rank = Rank.General;

            unchecked {
                ++_totalBurned[rank];
            }
        }
    }

    function setAutoAcceptCollection(
        address collection
    ) public virtual onlyOwner {
        _autoAcceptCollection[collection] = true;
    }

    function setSlotForElementGem(uint64 slotPartId) public onlyOwner {
        _slotForElementGem = slotPartId;
    }

    function _afterAddChild(
        uint256 tokenId,
        address childAddress,
        uint256 childId,
        bytes memory
    ) internal override {
        // Auto accept children if they are from known collections
        if (_autoAcceptCollection[childAddress]) {
            _acceptChild(
                tokenId,
                _pendingChildren[tokenId].length - 1,
                childAddress,
                childId
            );
        }
    }

    function _beforeUnequip(
        uint256,
        uint64,
        uint64 slotPartId
    ) internal virtual override {
        if (slotPartId == _slotForElementGem) revert CannotUnequipElementGem();
    }
}
