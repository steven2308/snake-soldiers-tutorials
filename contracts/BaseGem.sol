// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.21;

import "@rmrk-team/evm-contracts/contracts/implementations/abstract/RMRKAbstractEquippable.sol";

error GemAlreadyClaimed();
error CannotMintGemForNotOwnedToken();
error ClaimingNotActive();

abstract contract BaseGem is RMRKAbstractEquippable {
    address private immutable _snakeSoldiers;
    mapping(uint256 => uint256) private _claimed;
    uint256 private _claimingActive;

    uint64 private constant _MAIN_ASSET_ID = uint64(1);
    uint256 internal constant _SOLDIERS_OFFSET = 200;
    uint64 private constant _LOWEST_POSSIBLE_PRIORITY = (2 ^ 16) - 1;

    modifier onlyWithActiveClaim() {
        if (_claimingActive == 0) {
            revert ClaimingNotActive();
        }
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory collectionMetadata,
        address snakeSoldiers_,
        uint256 maxSupply
    )
        RMRKImplementationBase(
            name,
            symbol,
            collectionMetadata,
            maxSupply,
            _msgSender(),
            500
        )
    {
        _snakeSoldiers = snakeSoldiers_;
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

    function snakeSoldiers() external view returns (address) {
        return _snakeSoldiers;
    }

    function addAssetToTokens(
        uint256[] calldata tokenIds,
        uint64 assetId,
        uint64 overwrites
    ) external onlyOwnerOrContributor {
        uint256 length = tokenIds.length;
        for (uint256 i; i < length; ) {
            _addAssetToToken(tokenIds[i], assetId, overwrites);
            unchecked {
                ++i;
            }
        }
    }

    function _afterAddAssetToToken(
        uint256 tokenId,
        uint64 assetId,
        uint64 replacesAssetWithId
    ) internal virtual override {
        // Do nothing, we don't want auto accepting
    }

    function withdrawRaised(address to, uint256 amount) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");
    }

    function claimed(uint256 snakeTokenId) external view returns (bool) {
        return _claimed[snakeTokenId] == 1;
    }

    function claimMany(
        uint256[] calldata snakeTokenIds
    ) external onlyWithActiveClaim {
        uint256 length = snakeTokenIds.length;
        for (uint256 i; i < length; ) {
            _claim(snakeTokenIds[i]);
            unchecked {
                ++i;
            }
        }
    }

    function claim(uint256 snakeTokenId) external onlyWithActiveClaim {
        _claim(snakeTokenId);
    }

    function _claim(uint256 snakeTokenId) private {
        // We use the same id for the gem just because relationship is 1 to 1
        if (_claimed[snakeTokenId] == 1) revert GemAlreadyClaimed();

        _claimed[snakeTokenId] = 1;
        _totalSupply += 1;

        address owner = IERC6059(_snakeSoldiers).ownerOf(snakeTokenId);
        if (_msgSender() != owner) revert CannotMintGemForNotOwnedToken();
        _nestMint(_snakeSoldiers, snakeTokenId, snakeTokenId, "");
        _addAssetToToken(snakeTokenId, _MAIN_ASSET_ID, uint64(0));
        _acceptAsset(snakeTokenId, 0, _MAIN_ASSET_ID);
    }

    function getAssetMetadata(
        uint256 tokenId,
        uint64 assetId
    ) public view override returns (string memory) {
        string memory baseMetaUri = super.getAssetMetadata(tokenId, assetId);
        string memory postUri = _postUriFor(tokenId);
        return string.concat(baseMetaUri, postUri, ".json");
    }

    function _postUriFor(
        uint256 tokenId
    ) internal pure virtual returns (string memory) {}

    function isClaimActive() external view returns (bool) {
        return _claimingActive == 1;
    }

    function setClaimActive() external onlyOwner {
        _claimingActive = 1;
    }
}
