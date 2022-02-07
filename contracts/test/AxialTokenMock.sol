// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../AxialToken.sol";

contract AxialTokenMock is AxialToken {
  function mints(address[] memory tos, uint256[] memory amount) external {
    for (uint i = 0; i < tos.length; i++) {
      mint(tos[i], amount[i]);
    }
  }
}
