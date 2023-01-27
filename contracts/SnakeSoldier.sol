// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.16;

import "@rmrk-team/evm-contracts/contracts/RMRK/access/Ownable.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/equippable/RMRKEquippable.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/extension/RMRKRoyalties.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/utils/RMRKCollectionMetadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

error MaxPhaseReached();
error NextPhasePriceMustBeEqualOrHigher();

contract SnakeSoldier is
    Ownable,
    RMRKCollectionMetadata,
    RMRKRoyalties,
    RMRKEquippable
{
    using Strings for uint256;

    enum Rank {
        Soldier,
        Commander,
        General
    }

    uint256 private constant _MAX_SUPPLY_PER_PHASE_SOLDIERS = 1200; // A maximum possible of 1200*4=4800
    uint256 private constant _MAX_SUPPLY_PER_PHASE_COMMANDERS = 45; // A maximum possible of 45*4=180
    uint256 private constant _MAX_SUPPLY_PER_PHASE_GENERALS = 5; // A maximum possible of 5*4=20
    uint256 private constant _MAX_PHASES = 4;

    uint256 private _pricePerSoldier;
    uint256 private _pricePerCommander;
    uint256 private _pricePerGeneral;

    mapping(Rank => uint256) private _totalSupply;
    uint256 private _phase;
    bool private _phasesLocked;

    string private _defaultTokenUri;
    uint256 private _totalAssets;
    mapping(uint64 => uint256) private _isTokenAssetEnumerated;

    constructor(
        string memory collectionMetadata_,
        string memory defaultTokenUri
    )
        RMRKCollectionMetadata(collectionMetadata_)
        RMRKRoyalties(_msgSender(), 500) // 500 -> 5%
        RMRKEquippable("Snake Soldiers", "SS")
    {
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
}
