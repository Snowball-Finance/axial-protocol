// SPDX-License-Identifier: MIT
pragma solidity ^0.6.7; 


contract ProtocolGovernance {
    /// @notice governance address for the governance contract
    address public governance;
    address public pendingGovernance;
    
    /**
     * @notice modifier to allow for easy gov only control over a function
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "unauthorized sender (governance");
        _;
    }
    
    /**
     * @notice Allows governance to change governance (for future upgradability)
     * @param _governance new governance address to set
     */
    function setGovernance(address _governance) external onlyGovernance{
       governance = _governance;
    }

    /**
     * @notice Allows pendingGovernance to accept their role as governance (protection pattern)
     */
    function acceptGovernance() external {
        require(msg.sender == pendingGovernance, "acceptGovernance: !pendingGov");
        governance = pendingGovernance;
    }
}