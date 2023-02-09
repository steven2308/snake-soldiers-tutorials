// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SerpenTerraPassport is ERC20, ERC20Burnable, Ownable {
    address private _factionGem;

    constructor(address factionGem) ERC20("SerpenTerra Passport", "STP") {
        setFactionGem(factionGem);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burnFromFactionGem(address owner, uint256 amount) public {
        if (_msgSender() != _factionGem) revert("Not Faction Gem");

        _burn(owner, amount);
    }

    function setFactionGem(address factionGem) public onlyOwner {
        _factionGem = factionGem;
    }
}
