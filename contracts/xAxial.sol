// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// Axial is the coolest bar in town. You come in with some Axial, and leave with more! The longer you stay, the more Axial you get.
//
// This contract handles swapping to and from xAxial, AxialSwap's staking token.
contract Axial is ERC20("xAxial", "xAXL") {
    using SafeMath for uint256;
    IERC20 public axial;

    // Define the Axial token contract
    constructor(IERC20 _axial) public {
        axial = _axial;
    }

    // Enter the bar. Pay some AXIALs. Earn some shares.
    // Locks Axial and mints xAxial
    function enter(uint256 _amount) public {
        // Gets the amount of Axial locked in the contract
        uint256 totalAxial = axial.balanceOf(address(this));
        // Gets the amount of xAxial in existence
        uint256 totalShares = totalSupply();
        // If no xAxial exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalAxial == 0) {
            _mint(msg.sender, _amount);
        }
        // Calculate and mint the amount of xAxial the Axial is worth. The ratio will change overtime, as xAxial is burned/minted and Axial deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalAxial);
            _mint(msg.sender, what);
        }
        // Lock the Axial in the contract
        axial.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your AXIALs.
    // Unlocks the staked + gained Axial and burns xAxial
    function leave(uint256 _share) public {
        // Gets the amount of xAxial in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of Axial the xAxial is worth
        uint256 what = _share.mul(axial.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        axial.transfer(msg.sender, what);
    }
}
