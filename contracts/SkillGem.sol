// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.16;

import "./BaseGem.sol";

contract SkillGem is BaseGem {
    string private constant _POST_URL_PER_TYPE_COMBAT = "combat";
    string private constant _POST_URL_PER_TYPE_TANK = "tank";
    string private constant _POST_URL_PER_TYPE_HEAL = "healer";
    string private constant _POST_URL_PER_TYPE_SNIPER = "sniper";

    constructor(
        string memory collectionMetadata_,
        string memory tokenURI_,
        address snakeSoldiers_,
        uint256 maxSupply_
    )
        BaseGem(
            "Snake Soldiers Skill Gem",
            "SSSG",
            collectionMetadata_,
            tokenURI_,
            snakeSoldiers_,
            maxSupply_
        )
    {}

    // Skills are assigned round robing style but with 2 at a time:
    // 0, 1, 1, 2, 2, 3, 3, 0, 0 ...
    // We want to have the number of snakes per skill as similar as possible.
    function _postUriFor(
        uint256 tokenId
    ) internal pure override returns (string memory) {
        uint256 mod;

        if (tokenId > _SOLDIERS_OFFSET) {
            mod = (tokenId % 8) / 2;
        } else {
            // For generals and commanders, we ensure the skills match the elements:
            mod = tokenId % 4;
        }

        if (mod == 0) return _POST_URL_PER_TYPE_COMBAT;
        else if (mod == 1) return _POST_URL_PER_TYPE_TANK;
        else if (mod == 2) return _POST_URL_PER_TYPE_HEAL;
        else return _POST_URL_PER_TYPE_SNIPER;
    }
}
