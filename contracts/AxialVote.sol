// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IBar.sol";

interface IMasterChef {
    function userInfo(uint256 pid, address owner) external view returns (uint256, uint256);
}

contract AxialVote {
    using SafeMath for uint256;

    IPair pair; // AXIAL-AVAX LP
    IBar bar;
    IERC20 axial;
    IMasterChef chef;
    uint256 pid; // Pool ID of the AXIAL-AVAX LP in MasterChefV2

    function name() public pure returns (string memory) {
        return "AxialVote";
    }

    function symbol() public pure returns (string memory) {
        return "AXIALVOTE";
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    constructor(
        address _pair,
        address _bar,
        address _axial,
        address _chef,
        uint256 _pid
    ) public {
        pair = IPair(_pair);
        bar = IBar(_bar);
        axial = IERC20(_axial);
        chef = IMasterChef(_chef);
        pid = _pid;
    }

    function totalSupply() public view returns (uint256) {
        (uint256 lp_totalAxial, , ) = pair.getReserves();
        uint256 xaxial_totalAxial = axial.balanceOf(address(bar));

        return lp_totalAxial.mul(2).add(xaxial_totalAxial);
    }

    function balanceOf(address owner) public view returns (uint256) {
        //////////////////////////
        // Get balance from LPs //
        //////////////////////////
        uint256 lp_totalAxial = axial.balanceOf(address(pair));
        uint256 lp_total = pair.totalSupply();
        uint256 lp_balance = pair.balanceOf(owner);

        // Add staked balance
        (uint256 lp_stakedBalance, ) = chef.userInfo(pid, owner);
        lp_balance = lp_balance.add(lp_stakedBalance);

        // LP voting power is 2x the users AXIAL share in the pool.
        uint256 lp_powah = lp_totalAxial.mul(lp_balance).div(lp_total).mul(2);

        ///////////////////////////
        // Get balance from xAXIAL //
        ///////////////////////////

        uint256 xaxial_balance = bar.balanceOf(owner);
        uint256 xaxial_total = bar.totalSupply();
        uint256 xaxial_totalAxial = axial.balanceOf(address(bar));

        // xAXIAL voting power is the users AXIAL share in the bar
        uint256 xaxial_powah = xaxial_totalAxial.mul(xaxial_balance).div(xaxial_total);

        //////////////////////////
        // Get balance from AXIAL //
        //////////////////////////

        uint256 axial_balance = axial.balanceOf(owner);

        return lp_powah.add(xaxial_powah).add(axial_balance);
    }

    function allowance(address, address) public pure returns (uint256) {
        return 0;
    }

    function transfer(address, uint256) public pure returns (bool) {
        return false;
    }

    function approve(address, uint256) public pure returns (bool) {
        return false;
    }

    function transferFrom(
        address,
        address,
        uint256
    ) public pure returns (bool) {
        return false;
    }
}
