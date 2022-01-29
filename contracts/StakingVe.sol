// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// We have to maintain old versions of this to use legacy solidity (0.6.12)
// Otherwise it's safe to link with @OpenZeppelin/
import "./libraries/SafeERC20.sol";
import "./libraries/SafeMath.sol";

contract StakingVe {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address private StakedToken; // An ERC20 Token to be staked (i.e. Axial)
    address private Governance; // Who has administrative access
    string private Name; // New asset after staking (i.e. sAxial)
    string private Symbol; // New asset symbol after staking (i.e. sAXIAL)

    // Lock structure, a user can create many of these given a future start/end block
    // A DELTA can be derived as the degree of interpolation between the start/end block:
    // Delta = (end - now) / end - start
    // Now delta can be used to determine how much of our staked token is unlocked:
    // currentAmountLocked = startingAmountLocked - (delta * startingAmountLocked)
    struct LockVe {
        uint256 StartBlockTime;
        uint256 EndBlockTime;
        uint256 StartingAmountLocked;
    }

    address[] private Users; // An array containing all user addresses
    mapping(address => LockVe[]) private Locks; // A mapping of each users locks
    mapping(address => uint256) private LockedFunds; // A mapping of each users total deposited funds

    constructor(address _stakedToken, string memory _name, string memory _symbol) public {
        Governance = msg.sender;
        StakedToken = _stakedToken;
        Name = _name;
        Symbol = _symbol;
    }

    modifier onlyGovernance {
        require(msg.sender == Governance, "!governance");
        _;
    }

    // Allow user to lock _amount from now until now + _duration
    function CreateLock(uint256 _duration, uint256 _amount) external {
        address userAddr = msg.sender;
        LockVe[] memory preExistingLocks = Locks[userAddr];

        // Maintain a list of all users.  If they are new, the mapping will return an empty array of locks.
        if (preExistingLocks.length == 0) {
            Users.push(userAddr);
            LockedFunds[userAddr] = 0; // TODO: this line may be redundant
        }

        LockVe storage newLock;
        newLock.StartBlockTime = block.timestamp;
        newLock.EndBlockTime = newLock.StartBlockTime + _duration;
        newLock.StartingAmountLocked = _amount;
        Locks[userAddr].push(newLock);

        // TODO: Actually take the users money and store it
        LockedFunds[userAddr] += _amount;
    }

    function GetMyLocks() external view returns (LockVe[] memory) {
        address userAddr = msg.sender;
        return Locks[userAddr];
    }

    // Return the amount of tokens the user still has locked
    function GetMyBalance() external view returns (uint256) {
        address userAddr = msg.sender;
        LockVe[] memory preExistingLocks = Locks[userAddr];

        uint256 currentTimestamp = block.timestamp;
        uint256 balance = 0;

        for (uint256 i = 0; i < preExistingLocks.length; ++i) {
            LockVe memory lock = preExistingLocks[i];

            if (lock.EndBlockTime > currentTimestamp) {
                // We need to accomodate for the fact that we are dealing only in whole numbers
                // uint256 delta = (lock.EndBlockTime - currentTimestamp) / (lock.EndBlockTime - lock.StartBlockTime);
                uint256 granularity = 1e18;
                uint256 granularDelta = ((lock.EndBlockTime - currentTimestamp) * granularity) / (lock.EndBlockTime - lock.StartBlockTime);
                balance += lock.StartingAmountLocked * granularDelta / granularity;
            }
        }
        return balance;
    }

    function ClaimMyFunds() external {
        address userAddr = msg.sender;
        uint256 totalFundsDeposited = LockedFunds[userAddr];
        uint256 currentBalance = GetMyBalance();
        uint256 fundsToClaim = totalFundsDeposited - currentBalance;

        // TODO: Send fundsToClaim to user

        LockedFunds[userAddr] = currentBalance;
    }

}