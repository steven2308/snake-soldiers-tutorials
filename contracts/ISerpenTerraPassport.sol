// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.16;

interface ISerpenTerraPassport {
    function balanceOf(address account) external view returns (uint256);

    function burnFromFactionGem(address owner, uint256 amount) external;
}
