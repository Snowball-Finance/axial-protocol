// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// We have to maintain old versions of this to use legacy solidity (0.6.12)
// Otherwise it's safe to link with @OpenZeppelin/
import "./libraries/SafeERC20.sol";
import "./libraries/SafeMath.sol";
import "./interfaces/IERC20.sol";

contract StakingVe {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info pertaining to staking contract
    address private StakedToken; // An ERC20 Token to be staked (i.e. Axial)
    address private Governance; // Who has administrative access
    string private Name; // New asset after staking (i.e. sAxial)
    string private Symbol; // New asset symbol after staking (i.e. sAXIAL)
    uint256 private InterpolationGranularity = 1e18; // Note: ERC20.decimals() is for display and does not affect arithmetic!

    // Info pertaining to users
    address[] private Users; // An array containing all user addresses
    mapping(address => LockVe[]) private Locks; // A mapping of each users locks
    mapping(address => uint256) private LockedFunds; // A mapping of each users total deposited funds

    // Lock structure, a user can create many of these given a future start/end block
    // A DELTA can be derived as the degree of interpolation between the start/end block:
    // Delta = (end - now) / end - start
    // This can be used to determine how much of our staked token is unlocked:
    // currentAmountLocked = startingAmountLocked - (delta * startingAmountLocked)
    struct LockVe {
        uint256 StartBlockTime;
        uint256 EndBlockTime;
        uint256 StartingAmountLocked;
    }

    // TODO: Move this into its own contract, it's bloating our style
    // nonreentrant ensures a function cannot be executed again while it is still running
    // this prevents exploits which rely on depositing/withdrawing before balance is updated
    uint8 internal constant _not_entered = 1;
    uint8 internal constant _entered = 2;
    uint8 internal _entered_state = 1;
    modifier nonreentrant() {
        require(_entered_state == _not_entered);
        _entered_state = _entered;
        _;
        _entered_state = _not_entered;
    }

    // constructor
    // in: _stakedToken - address of the token our users will deposit and lock in exchange for governance tokens
    // in: _name - desired name of our governance token
    // in: _symbol - desired symbol of our governance token
    // in: _governance - address of wallet which will be given adminstrative access to this contract
    constructor(address _stakedToken, string memory _name, string memory _symbol, address _governance) public {
        Governance = _governance;
        StakedToken = _stakedToken;
        Name = _name;
        Symbol = _symbol;
    }

    // onlyGovernance ensures that a function cannot be executed by anyone other than governance
    // this can be used for adminstrative functions such as migrating users to an updated contract
    modifier onlyGovernance {
        require(msg.sender == Governance, "!governance");
        _;
    }

    // GetBalance
    // in: _userAddr - address of any user to view the number of tokens they still have locked
    // see also: GetMyBalance()
    function GetBalance(address _userAddr) public view returns (uint256) {
        LockVe[] memory preExistingLocks = Locks[_userAddr];

        uint256 currentTimestamp = block.timestamp;
        uint256 balance = 0;

        for (uint256 i = 0; i < preExistingLocks.length; ++i) {
            LockVe memory lock = preExistingLocks[i];

            if (lock.EndBlockTime > currentTimestamp) {
                
                uint256 granularDelta = ((lock.EndBlockTime - currentTimestamp) * InterpolationGranularity) / (lock.EndBlockTime - lock.StartBlockTime);
                balance += lock.StartingAmountLocked * granularDelta / InterpolationGranularity;
            }
        }
        return balance;
    }

    // GetPower
    // in: _userAddr - address of any user to view the number of governance tokens currently awarded to them
    // see also: GetMyPower()
    function GetPower(address _userAddr) public view returns (uint256) {
        LockVe[] memory preExistingLocks = Locks[_userAddr];

        uint256 currentTimestamp = block.timestamp;
        uint256 power = 0;

        for (uint256 i = 0; i < preExistingLocks.length; ++i) {
            LockVe memory lock = preExistingLocks[i];

            if (lock.EndBlockTime > currentTimestamp) {
                // We need to accomodate for the fact that we are dealing only in whole numbers
                // uint256 delta = (lock.EndBlockTime - currentTimestamp) / (lock.EndBlockTime - lock.StartBlockTime);
                uint256 startingAmountAwarded = (lock.EndBlockTime - lock.StartBlockTime) * lock.StartingAmountLocked / 104 weeks;
                uint256 granularDelta = ((lock.EndBlockTime - currentTimestamp) * InterpolationGranularity) / (lock.EndBlockTime - lock.StartBlockTime);
                power += startingAmountAwarded * granularDelta / InterpolationGranularity;
            }
        }
        return power;
    }

    // GetLocks
    // in: _userAddr - address of any user to view all Locks they have ever created
    // This may be used by the web application for graphical illustration purposes
    // see also: GetMyLocks()
    function GetLocks(address _userAddr) public view returns (LockVe[] memory) {
        return Locks[_userAddr];
    }

    // GetMyLocks
    // Retrieves a list of all locks the invoking user has ever created
    // This may be used by the web application for graphical illustration purposes
    // see also: GetLocks(address _userAddr)
    function GetMyLocks() public view returns (LockVe[] memory) {
        address userAddr = msg.sender;
        return GetLocks(userAddr);
    }

    // GetMyBalance
    // View the total quantity of deposit tokens the invoking user still has locked
    // This may be used by the web application for display purposes
    // see also: GetBalance(address _userAddr)
    function GetMyBalance() public view returns (uint256) {
        address userAddr = msg.sender;
        return GetBalance(userAddr);
    }

    // GetMyPower
    // View the total quantity of governance tokens the user currently has awarded to them
    // This may be used by the web application for display purposes
    // see also: GetPower(address _userAddr)
    function GetMyPower() public view returns (uint256) {
        address userAddr = msg.sender;
        return GetPower(userAddr);
    }

    // ClaimMyFunds
    // Transfers deposit tokens which have decayed over some portion of the lock period back to their original owner
    // It is up to the user to invoke this in order to reclaim their original deposit tokens over time
    // This will need to be called by the web application via a button or some other means
    function ClaimMyFunds() external nonreentrant {
        address userAddr = msg.sender;
        uint256 totalFundsDeposited = LockedFunds[userAddr];
        uint256 currentBalance = GetMyBalance();
        uint256 fundsToClaim = totalFundsDeposited - currentBalance;

        IERC20(StakedToken).safeTransfer(userAddr, fundsToClaim);

        LockedFunds[userAddr] = currentBalance;
    }

    // CreateLock
    // in: _duration - number of seconds the invoking user will lock their funds for
    // in: _amount - number of tokens the invoking user will lock
    // Creates a lock which keeps the invoking users deposit tokens for a period of time in exchange for governance tokens
    // The deposit tokens and the awarded governance tokens both decay linearly over time
    // The quantity of governance tokens is defined as:
    // amountLocked * (timeRemaining / 2 years)
    function CreateLock(uint256 _duration, uint256 _amount) external nonreentrant {
        require(_duration <= 52 weeks, ">52 weeks");

        // Retrieve list of locks the user has already created
        address userAddr = msg.sender;
        LockVe[] memory preExistingLocks = Locks[userAddr];

        // Receive the users tokens
        require(IERC20(StakedToken).balanceOf(userAddr) >= _amount, "!balance"); // TODO: remove if the following line makes this redundant
        IERC20(StakedToken).safeTransferFrom(userAddr, _amount);

        // Maintain a list of all users.  If they are new, the mapping will return an empty array of locks.
        if (preExistingLocks.length == 0) {
            Users.push(userAddr);
            LockedFunds[userAddr] = 0; // TODO: this line may be redundant
        }

        // Create a new lock and append it to this users locks
        LockVe storage newLock;
        newLock.StartBlockTime = block.timestamp;
        newLock.EndBlockTime = newLock.StartBlockTime + _duration;
        newLock.StartingAmountLocked = _amount;
        Locks[userAddr].push(newLock);

        LockedFunds[userAddr] += _amount;
    }

}