// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.16;

import "@rmrk-team/evm-contracts/contracts/implementations/RMRKCatalogImpl.sol";
import "@rmrk-team/evm-contracts/contracts/RMRK/utils/RMRKEquipRenderUtils.sol";

contract SnakeCatalog is RMRKCatalogImpl {
    constructor(
        string memory metadataURI,
        string memory type_
    ) RMRKCatalogImpl(metadataURI, type_) {}
}
