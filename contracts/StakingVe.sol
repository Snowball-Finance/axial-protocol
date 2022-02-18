// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/// @title A vesting style staking contract with extendable linear decay
/// @author Auroter
/// @notice Allows you to lock tokens in exchange for governance tokens
/// @notice Locks can be extended or deposited into
/// @notice Maximum deposit duration is two years (104 weeks)
/// @dev Simply call stake(...) to create initial lock or extend one that already exists for the user

// We have to maintain old versions of this to use legacy solidity (0.6.12)
import "./libraries/SafeERC20.sol";
import "./libraries/SafeMath.sol";
import "./interfaces/IERC20.sol";

//import "hardhat/console.sol";

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
    mapping(address => LockVe) private Locks; // A mapping of each users lock
    mapping(address => uint256) private LockedFunds; // A mapping of each users total deposited funds
    mapping(address => uint256) private DeferredFunds; // A mapping of vested funds the user wishes to leave unclaimed

    // Lock structure, only one of these is allowed per user
    // A DELTA can be derived as the degree of interpolation between the start/end block:
    // Delta = (end - now) / end - start
    // This can be used to determine how much of our staked token is unlocked:
    // currentAmountLocked = startingAmountLocked - (delta * startingAmountLocked)
    struct LockVe {
        uint256 StartBlockTime;
        uint256 EndBlockTime;
        uint256 StartingAmountLocked;
        bool Initialized;
    }

    uint8 internal constant _not_entered = 1;
    uint8 internal constant _entered = 2;
    uint8 internal _entered_state = 1;
    /// @notice Protects deposit / withdraw functions from exploits
    /// @notice Ensures a function cannot be executed again while it is still running
    /// @dev TODO: Move this into its own contract
    modifier nonreentrant() {
        require(_entered_state == _not_entered);
        _entered_state = _entered;
        _;
        _entered_state = _not_entered;
    }

    /// @notice Constructor
    /// @param _stakedToken Address of the token our users will deposit and lock in exchange for governance tokens
    /// @param _name Desired name of our governance token
    /// @param _symbol Desired symbol of our governance token
    /// @param _governance Address of wallet which will be given adminstrative access to this contract
    constructor(
        address _stakedToken,
        string memory _name,
        string memory _symbol,
        address _governance
    ) public {
        Governance = _governance;
        StakedToken = _stakedToken;
        Name = _name;
        Symbol = _symbol;
    }

    /// @notice Ensures that a function cannot be executed by anyone other than governance
    /// @dev this can be used for adminstrative functions such as migrating users to an updated contract
    modifier onlyGovernance() {
        require(msg.sender == Governance, "!governance");
        _;
    }

    /// @notice Calculate the number of vested tokens a user has not claimed, see also: getMyUnclaimed()
    /// @param _userAddr Address of any user to view the number of vested tokens they have not yet claimed
    /// @return Quantity of tokens which have vested but are unclaimed by the specified user
    function getUnclaimed(address _userAddr) public view returns (uint256) {
        uint256 totalFundsDeposited = LockedFunds[_userAddr] + DeferredFunds[_userAddr];
        uint256 currentBalance = getMyBalance();
        uint256 fundsToClaim = totalFundsDeposited - currentBalance;
        return fundsToClaim;
    }

    /// @notice Calculate the number of vested tokens invoking user has not claimed, see also: getUnclaimed()
    /// @return Quantity of tokens which have vested but are unclaimed by the invoking user
    function getMyUnclaimed() public view returns (uint256) {
        address userAddr = msg.sender;
        return getUnclaimed(userAddr);
    }

    /// @notice Calculate the number of tokens a user still has locked, see also: getMyBalance()
    /// @param _userAddr Address of any user to view the number of tokens they still have locked
    /// @return Quantity of tokens the user has locked
    function getBalance(address _userAddr) public view returns (uint256) {
        LockVe memory usersLock = Locks[_userAddr];

        uint256 currentTimestamp = block.timestamp;
        uint256 balance = 0;

        if (usersLock.EndBlockTime > currentTimestamp) {
            uint256 granularDelta = ((usersLock.EndBlockTime - currentTimestamp) * InterpolationGranularity) / (usersLock.EndBlockTime - usersLock.StartBlockTime);
            balance += (usersLock.StartingAmountLocked * granularDelta) / InterpolationGranularity;
        }
        return balance;
    }

    /// @notice Calculate the number of governance tokens allocated to a user by this contract, see also: getMyPower()
    /// @param _userAddr Address of any user to view the number of governance tokens currently awarded to them
    /// @return Quantity of governance tokens allocated to the user
    function getPower(address _userAddr) public view returns (uint256) {
        LockVe memory usersLock = Locks[_userAddr];

        uint256 currentTimestamp = block.timestamp;
        uint256 power = 0;

        if (usersLock.EndBlockTime > currentTimestamp) {
            // We need to accomodate for the fact that we are dealing only in whole numbers
            // uint256 delta = (lock.EndBlockTime - currentTimestamp) / (lock.EndBlockTime - lock.StartBlockTime);
            uint256 startingAmountAwarded = ((usersLock.EndBlockTime - usersLock.StartBlockTime) * usersLock.StartingAmountLocked) / 104 weeks;
            uint256 granularDelta = ((usersLock.EndBlockTime - currentTimestamp) * InterpolationGranularity) / (usersLock.EndBlockTime - usersLock.StartBlockTime);
            power += (startingAmountAwarded * granularDelta) / InterpolationGranularity;
        }
        return power;
    }

    /// @notice Retrieve a list of all users who have ever staked
    /// @return An array of addresses of all users who have ever staked
    function getAllUsers() public view returns (address[] memory) {
        return Users;
    }

    /// @notice Check if a user has ever created a Lock in this contract
    /// @param _userAddr Address of any user to check
    /// @dev This may be used by the web application to determine if the UI says "Create Lock" or "Add to Lock"
    /// @return True if the user has ever created a lock
    function isUserLocked(address _userAddr) public view returns (bool) {
        LockVe memory usersLock = Locks[_userAddr];
        return usersLock.Initialized;
    }

    /// @notice Check if invoking user has ever created a Lock in this contract
    /// @dev This may be used by the web application to determine if the UI says "Create Lock" or "Add to Lock"
    /// @return True if invoking user has ever created a lock
    function amILocked() public view returns (bool) {
        address userAddr = msg.sender;
        return isUserLocked(userAddr);
    }

    /// @notice View a users Lock, see also GetMyLock()
    /// @param _userAddr Address of any user to view all Locks they have ever created
    /// @dev This may be used by the web application for graphical illustration purposes
    /// @return Users Lock in the format of the LockVe struct
    function getLock(address _userAddr) public view returns (LockVe memory) {
        return Locks[_userAddr];
    }

    /// @notice View the invoking users Lock, see also GetLock()
    /// @dev This may be used by the web application for graphical illustration purposes
    /// @return Invoking users Lock in the format of the LockVe struct
    function getMyLock() public view returns (LockVe memory) {
        address userAddr = msg.sender;
        return getLock(userAddr);
    }

    /// @notice View the total quantity of deposit tokens the invoking user still has locked, see also GetBalance()
    /// @dev This may be used by the web application for display purposes
    /// @return Quantity of invoking users deposit tokens which are still locked by the contract 
    function getMyBalance() public view returns (uint256) {
        address userAddr = msg.sender;
        return getBalance(userAddr);
    }

    /// @notice View the total quantity of governance tokens the user currently has awarded to them, see also GetPower()
    /// @dev This may be used by the web application for display purposes
    /// @return Quantity of invoking users governance tokens awarded by the contract
    function getMyPower() public view returns (uint256) {
        address userAddr = msg.sender;
        return getPower(userAddr);
    }

    /// @notice Transfers deposit tokens which have decayed over some portion of the lock period back to their original owner
    /// @notice It is up to the user to invoke this in order to reclaim their original deposit tokens over time
    /// @dev This will need to be called by the web application via a button or some other means
    function claimMyFunds() external nonreentrant {
        address userAddr = msg.sender;
        uint256 totalFundsDeposited = LockedFunds[userAddr] + DeferredFunds[userAddr];
        uint256 currentBalance = getMyBalance();
        uint256 fundsToClaim = totalFundsDeposited - currentBalance;

        IERC20(StakedToken).safeTransfer(userAddr, fundsToClaim);

        LockedFunds[userAddr] = currentBalance;
        DeferredFunds[userAddr] = 0;
    }

    /// @notice Create/extend the duration of the invoking users lock and/or deposit additional tokens into it
    /// @param _duration Number of seconds the invoking user will extend their lock for
    /// @param _amount Number of additional tokens to deposit into the lock
    /// @param _deferUnclaimed If True, leaves any unclaimed vested balance in the staking contract
    function stake(uint256 _duration, uint256 _amount, bool _deferUnclaimed) public nonreentrant {
        require(_duration > 0 || _amount > 0, "null");

        // Retrieve list of locks the user has already created
        address userAddr = msg.sender;
        LockVe memory usersLock = Locks[userAddr];

        uint256 oldDurationRemaining = 0;

        // Keep track of new user or pre-existing lockout period
        if (!usersLock.Initialized) {
            Users.push(userAddr);
        } else if (block.timestamp < usersLock.EndBlockTime) {
            oldDurationRemaining = usersLock.EndBlockTime - block.timestamp;
        }

        require (oldDurationRemaining + _duration <= 104 weeks, ">2 years");

        // Receive the users tokens
        require(IERC20(StakedToken).balanceOf(userAddr) >= _amount, "!balance");
        IERC20(StakedToken).safeTransferFrom(userAddr, _amount);

        // Account for balance / unclaimed funds
        uint256 totalFundsDeposited = LockedFunds[userAddr];
        uint256 oldBalance = getBalance(userAddr);
        uint256 fundsUnclaimed = totalFundsDeposited - oldBalance;
        if (!_deferUnclaimed) {
            fundsUnclaimed += DeferredFunds[userAddr];
            IERC20(StakedToken).safeTransfer(userAddr, fundsUnclaimed);
            DeferredFunds[userAddr] = 0;
        } else {
            DeferredFunds[userAddr] += fundsUnclaimed;
        }
        uint256 newTotalDeposit = oldBalance + _amount;

        // Update balance
        LockedFunds[userAddr] = newTotalDeposit;

        // Fill out updated LockVe struct
        LockVe memory newLock;
        newLock.StartBlockTime = block.timestamp;
        newLock.EndBlockTime = newLock.StartBlockTime + _duration + oldDurationRemaining;
        newLock.StartingAmountLocked = newTotalDeposit;
        newLock.Initialized = true;
        Locks[userAddr] = newLock;
    }
}
