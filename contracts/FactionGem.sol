// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.16;

import "./BaseGem.sol";
import "./ISerpenTerraPassport.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/extension/soulbound/RMRKSoulbound.sol";

contract FactionGem is RMRKSoulbound, BaseGem {
    string private constant _POST_URL_PER_TYPE_ISLANDS = "islands";
    string private constant _POST_URL_PER_TYPE_DESERT = "desert";
    string private constant _POST_URL_PER_TYPE_VALLEY = "valley";
    string private constant _POST_URL_PER_TYPE_MOUNTAIN = "mountain";
    string private constant _POST_URL_PER_TYPE_FOREST = "forest";

    uint256 private constant _COMMANDERS_OFFSET = 20;

    address private _passportAddress;

    constructor(
        string memory collectionMetadata_,
        string memory tokenURI_,
        address snakeSoldiers_,
        uint256 maxSupply_,
        address passportAddress
    )
        BaseGem(
            "Snake Soldiers Element Gem",
            "SSEG",
            collectionMetadata_,
            tokenURI_,
            snakeSoldiers_,
            maxSupply_
        )
    {
        setPassportAddress(passportAddress);
    }

    function setPassportAddress(address passportAddress) public onlyOwner {
        _passportAddress = passportAddress;
    }

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(RMRKSoulbound, IERC165, RMRKEquippable)
        returns (bool)
    {
        return
            RMRKSoulbound.supportsInterface(interfaceId) ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(RMRKCore, RMRKSoulbound) {
        super._beforeTokenTransfer(from, to, tokenId);
        bool isForestGem = tokenId % 5 == 4;
        if (from != address(0) && to != address(0) && !isForestGem) {
            address owner = ownerOf(tokenId);
            ISerpenTerraPassport(_passportAddress).burnFromFactionGem(owner, 1);
        }
    }

    // Factions are assigned round robing style, it's an easy way to make sure
    // that the number of snakes per element is as similar as possible.
    function _postUriFor(
        uint256 tokenId
    ) internal pure override returns (string memory) {
        uint256 mod;

        if (tokenId > _COMMANDERS_OFFSET) {
            mod = tokenId % 5;
        } else {
            // For generals, we ensure the faction match the elements
            mod = tokenId % 4;
        }
        if (mod == 0) return _POST_URL_PER_TYPE_DESERT;
        else if (mod == 1) return _POST_URL_PER_TYPE_MOUNTAIN;
        else if (mod == 2) return _POST_URL_PER_TYPE_ISLANDS;
        else if (mod == 3) return _POST_URL_PER_TYPE_VALLEY;
        else return _POST_URL_PER_TYPE_FOREST;
    }

    function isSoulbound(uint256 tokenId) public view override returns (bool) {
        uint256 mod = tokenId % 5;
        if (mod == 4) return false; // Forest gem is not soulbound

        address owner = ownerOf(tokenId);
        uint256 balance = ISerpenTerraPassport(_passportAddress).balanceOf(
            owner
        );
        return balance == 0;
    }
}
