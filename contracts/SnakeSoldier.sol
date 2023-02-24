// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.16;

import "@rmrk-team/evm-contracts/contracts/RMRK/access/Ownable.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/equippable/RMRKEquippable.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/extension/RMRKRoyalties.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/utils/RMRKCollectionMetadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

error ElementAlreadyRevealed();
error MaxGiftsPerPhaseReached();
error MintOverMax();
error MintUnderpriced();
error MintZero();
error SaleNotOpen();
error MaxPhaseReached();
error NextPhasePriceMustBeEqualOrHigher();

contract SnakeSoldier is
    Ownable,
    RMRKCollectionMetadata,
    RMRKRoyalties,
    RMRKEquippable
{
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

    uint256 private constant _MAX_SUPPLY_PER_PHASE_SOLDIERS = 1200; // A maximum possible of 1200*4=4800
    uint256 private constant _MAX_SUPPLY_PER_PHASE_COMMANDERS = 45; // A maximum possible of 45*4=180
    uint256 private constant _MAX_SUPPLY_PER_PHASE_GENERALS = 5; // A maximum possible of 5*4=20
    uint256 private constant _MAX_PHASES = 4;

    uint64 private constant _ASSET_ID_SOLDIER_EGG = 1;
    uint64 private constant _ASSET_ID_COMMANDER_EGG = 2;
    uint64 private constant _ASSET_ID_GENERAL_EGG = 3;
    uint64 private constant _ASSET_ID_SOLDIER_EGG_FIRE = 4;
    uint64 private constant _ASSET_ID_SOLDIER_EGG_EARTH = 5;
    uint64 private constant _ASSET_ID_SOLDIER_EGG_WATER = 6;
    uint64 private constant _ASSET_ID_SOLDIER_EGG_AIR = 7;
    uint64 private constant _ASSET_ID_COMMANDER_EGG_FIRE = 8;
    uint64 private constant _ASSET_ID_COMMANDER_EGG_EARTH = 9;
    uint64 private constant _ASSET_ID_COMMANDER_EGG_WATER = 10;
    uint64 private constant _ASSET_ID_COMMANDER_EGG_AIR = 11;
    uint64 private constant _ASSET_ID_GENERAL_EGG_FIRE = 12;
    uint64 private constant _ASSET_ID_GENERAL_EGG_EARTH = 13;
    uint64 private constant _ASSET_ID_GENERAL_EGG_WATER = 14;
    uint64 private constant _ASSET_ID_GENERAL_EGG_AIR = 15;
    uint64 private constant _ASSET_ID_SNAKE = 16;

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
    mapping(Rank => uint256) private _totalSupply;
    uint256 private _phase;
    bool private _phasesLocked;

    string private _defaultTokenUri;
    uint256 private _totalAssets;
    mapping(uint64 => uint256) private _isTokenAssetEnumerated;
    uint256 private _totalGifts;
    uint256 private immutable _maxGiftsPerPhase;

    constructor(
        string memory collectionMetadata_,
        string memory defaultTokenUri,
        uint256 maxGiftsPerPhase_
    )
        RMRKCollectionMetadata(collectionMetadata_)
        RMRKRoyalties(_msgSender(), 500) // 500 -> 5%
        RMRKEquippable("Snake Soldiers", "SS")
    {
        _maxGiftsPerPhase = maxGiftsPerPhase_;
        _defaultTokenUri = defaultTokenUri;
    }

    function updateRoyaltyRecipient(
        address newRoyaltyRecipient
    ) external override onlyOwner {
        _setRoyaltyRecipient(newRoyaltyRecipient);
    }

    function tokenURI(uint256) public view returns (string memory) {
        return _defaultTokenUri;
    }

    function addAssetEntry(
        string memory metadataURI
    ) public virtual onlyOwnerOrContributor returns (uint256) {
        unchecked {
            _totalAssets += 1;
        }
        _addAssetEntry(uint64(_totalAssets), metadataURI);
        return _totalAssets;
    }

    function addEquippableAssetEntry(
        uint64 equippableGroupId,
        address catalogAddress,
        string memory metadataURI,
        uint64[] calldata partIds
    ) public virtual onlyOwnerOrContributor returns (uint256) {
        unchecked {
            _totalAssets += 1;
        }
        _addAssetEntry(
            uint64(_totalAssets),
            equippableGroupId,
            catalogAddress,
            metadataURI,
            partIds
        );
        return _totalAssets;
    }

    function addAssetToToken(
        uint256 tokenId,
        uint64 assetId,
        uint64 replacesAssetWithId
    ) public virtual onlyOwnerOrContributor {
        _addAssetToToken(tokenId, assetId, replacesAssetWithId);
        if (_msgSender() == ownerOf(tokenId)) {
            _acceptAsset(tokenId, _pendingAssets[tokenId].length - 1, assetId);
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
    )
        public
        view
        override(AbstractMultiAsset, IRMRKMultiAsset)
        returns (string memory)
    {
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

    function totalAssets() public view returns (uint256) {
        return _totalAssets;
    }

    function totalSupply(Rank rank) public view returns (uint256) {
        return _totalSupply[rank];
    }

    function totalSupply() public view returns (uint256) {
        return
            _totalSupply[Rank.Soldier] +
            _totalSupply[Rank.Commander] +
            _totalSupply[Rank.General];
    }

    function maxSupply(Rank rank) public view returns (uint256) {
        if (rank == Rank.Soldier)
            return _MAX_SUPPLY_PER_PHASE_SOLDIERS * _phase;
        else if (rank == Rank.Commander)
            return _MAX_SUPPLY_PER_PHASE_COMMANDERS * _phase;
        else return _MAX_SUPPLY_PER_PHASE_GENERALS * _phase;
    }

    function maxSupply() public view returns (uint256) {
        return
            (_MAX_SUPPLY_PER_PHASE_SOLDIERS +
                _MAX_SUPPLY_PER_PHASE_COMMANDERS +
                _MAX_SUPPLY_PER_PHASE_GENERALS) * _phase;
    }

    function enableNextPhase(
        uint256 pricePerSoldier,
        uint256 pricePerCommander,
        uint256 pricePerGeneral
    ) external onlyOwner {
        if (_phase == _MAX_PHASES || _phasesLocked) revert MaxPhaseReached();

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
        _phasesLocked = true;
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
        _totalGifts += 1;

        _innerMint(to, 1, rank);
    }

    function _mintChecks(uint256 numToMint, Rank rank) private view {
        if (_phase == 0) revert SaleNotOpen();
        if (numToMint == uint256(0)) revert MintZero();
        if (numToMint + totalSupply(rank) > maxSupply(rank))
            revert MintOverMax();
    }

    function _innerMint(address to, uint256 numToMint, Rank rank) private {
        uint256 nextToken = _totalSupply[rank] + 1 + _rankOffset(rank);
        unchecked {
            _totalSupply[rank] += numToMint;
        }
        uint256 totalSupplyOffset = nextToken + numToMint;
        uint64 assetId;

        for (uint256 i = nextToken; i < totalSupplyOffset; ) {
            _safeMint(to, i, "");
            if (i > _SOLDIERS_OFFSET) {
                assetId = _ASSET_ID_SOLDIER_EGG;
            } else if (i > _COMMANDERS_OFFSET) {
                assetId = _ASSET_ID_COMMANDER_EGG;
            } else {
                assetId = _ASSET_ID_GENERAL_EGG;
            }
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

    function revealElement(
        uint256 tokenId
    ) external onlyApprovedForAssetsOrOwner(tokenId) {
        if (_elementRevealed[tokenId] == 1) revert ElementAlreadyRevealed();
        _elementRevealed[tokenId] = 1;
        uint64 newAssetId;
        uint64 oldAssetId;

        // The "+ tokenId % 4" part, sets the asset for the right element
        if (tokenId > _SOLDIERS_OFFSET) {
            oldAssetId = _ASSET_ID_SOLDIER_EGG;
            newAssetId = _ASSET_ID_SOLDIER_EGG_FIRE + uint64(tokenId % 4);
        } else if (tokenId > _COMMANDERS_OFFSET) {
            oldAssetId = _ASSET_ID_COMMANDER_EGG;
            newAssetId = _ASSET_ID_COMMANDER_EGG_FIRE + uint64(tokenId % 4);
        } else {
            oldAssetId = _ASSET_ID_GENERAL_EGG;
            newAssetId = _ASSET_ID_GENERAL_EGG_FIRE + uint64(tokenId % 4);
        }
        _addAssetToToken(tokenId, newAssetId, oldAssetId);
        _acceptAsset(tokenId, 0, newAssetId);
    }
}
