// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../boringcrypto/BoringOwnable.sol";
import "../libraries/SafeERC20.sol";

import "hardhat/console.sol";

interface IRewarder {
    using SafeERC20 for IERC20;

    function onAxialReward(address user, uint256 newLpAmount) external;

    function pendingTokens(address user) external view returns (uint256 pending);

    function rewardToken() external view returns (IERC20);
}

interface IMasterChefAxial {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
    }

    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this poolInfo. SUSHI to distribute per block.
        uint256 lastRewardTimestamp; // Last block timestamp that SUSHI distribution occurs.
        uint256 accAxialPerShare; // Accumulated SUSHI per share, times 1e12. See below.
    }

    function poolInfo(uint256 pid) external view returns (PoolInfo memory);

    function totalAllocPoint() external view returns (uint256);

    function deposit(uint256 _pid, uint256 _amount) external;
}

/**
 * This is a sample contract to be used in the MasterChefAxial contract for partners to reward
 * stakers with their native token alongside AXIAL.
 *
 * It assumes no minting rights, so requires a set amount of YOUR_TOKEN to be transferred to this contract prior.
 * E.g. say you've allocated 100,000 XYZ to the AXIAL-XYZ farm over 30 days. Then you would need to transfer
 * 100,000 XYZ and set the block reward accordingly so it's fully distributed after 30 days.
 *
 */
contract SimpleRewarderPerSec is IRewarder, BoringOwnable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public override rewardToken;
    IERC20 public immutable rewardToken1;
    IERC20 public immutable rewardToken2;
    IERC20 public immutable rewardToken3;
    IERC20 public immutable rewardToken4;
    IERC20 public immutable lpToken;
    bool public immutable isNative;
    IMasterChefAxial public immutable MCA;



    /// @dev Info of each MCA user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of YOUR_TOKEN entitled to the user.
    struct UserInfo {
        uint256 amount;
        uint256[] rewardDebt; 
        uint256[] unpaidRewards;
    }

    /// @dev Info of each MCA poolInfo.
    /// `accTokenPerShare` Amount of YOUR_TOKEN each LP token is worth.
    /// `lastRewardTimestamp` The last timestamp YOUR_TOKEN was rewarded to the poolInfo.
    struct PoolInfo {
        uint256[4] accTokenPerShare; 
        uint256 lastRewardTimestamp;
    }

    /// @dev Info of the poolInfo.
    PoolInfo public poolInfo;
    /// @dev Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    uint256[] public tokenPerSec;
    uint256 private constant ACC_TOKEN_PRECISION = 1e12;

    event OnReward(address indexed user, uint256[] amount);
    event RewardRateUpdated(uint256[] oldRate, uint256[] newRate);

    modifier onlyMCA() {
        require(msg.sender == address(MCA), "onlyMCA: only MasterChefAxial can call this function");
        _;
    }

    constructor(
        IERC20 _rewardToken1,
        IERC20 _rewardToken2,
        IERC20 _rewardToken3,
        IERC20 _rewardToken4,
        IERC20 _lpToken,
        uint256[4] memory _tokenPerSec,
        IMasterChefAxial _MCA,
        bool _isNative
    ) public {
        require(Address.isContract(address(_rewardToken1)), "constructor: reward token 1 must be a valid contract");
        require(Address.isContract(address(_rewardToken2)), "constructor: reward token 2 must be a valid contract");
        require(Address.isContract(address(_rewardToken3)), "constructor: reward token 3 must be a valid contract");
        require(Address.isContract(address(_rewardToken4)), "constructor: reward token 4 must be a valid contract");
        require(Address.isContract(address(_lpToken)), "constructor: LP token must be a valid contract");
        require(Address.isContract(address(_MCA)), "constructor: MasterChefAxial must be a valid contract");

        rewardToken1 = _rewardToken1;
        rewardToken2 = _rewardToken2;
        rewardToken3 = _rewardToken3;
        rewardToken4 = _rewardToken4;
        lpToken = _lpToken;
        tokenPerSec = _tokenPerSec;
        MCA = _MCA;
        isNative = _isNative;
        poolInfo = PoolInfo({lastRewardTimestamp: block.timestamp, accTokenPerShare:[uint256(0), uint256(0), uint256(0), uint256(0)]});
    }

    // function that pushes each of the rewardTokens into an array 
    function rewardTokenArray(IERC20, IERC20, IERC20, IERC20) public view returns (address[4] memory rewardTokens){
        rewardTokens = [address(rewardToken1), address(rewardToken2), address(rewardToken3), address(rewardToken4)];
    }

    /// @dev Update reward variables of the given poolInfo.
    /// @return pool Returns the pool that was updated.
    function updatePool() public returns (PoolInfo memory pool) {
        pool = poolInfo;

        if (block.timestamp > pool.lastRewardTimestamp) {
            uint256 lpSupply = lpToken.balanceOf(address(MCA));

            if (lpSupply > 0) {
                for (uint i = 0; i < 4; i++){
                    uint256 timeElapsed = block.timestamp.sub(pool.lastRewardTimestamp);
                    uint256 tokenReward = timeElapsed.mul(tokenPerSec[i]);
                    pool.accTokenPerShare[i] = pool.accTokenPerShare[i].add((tokenReward.mul(ACC_TOKEN_PRECISION) / lpSupply));
                }
            }
            pool.lastRewardTimestamp = block.timestamp;
            poolInfo = pool;
        }
    }

    /// @dev Sets the distribution reward rate. This will also update the poolInfo.
    /// @param _tokenPerSec The number of tokens to distribute per second
    function setRewardRate(uint256[] memory _tokenPerSec) external onlyOwner {
        updatePool();
        uint256[] memory oldRate = new uint256[](4);

        for (uint i = 0; i < 4; i++){
            uint256 oldRates = tokenPerSec[i]; 

            oldRate[i] = oldRates;
            tokenPerSec[i] = _tokenPerSec[i];
        }
        emit RewardRateUpdated(oldRate, _tokenPerSec); 
    }

    /// @dev Function called by MasterChefAxial whenever staker claims AXIAL harvest. Allows staker to also receive a 2nd reward token.
    /// @param _user Address of user
    /// @param _lpAmount Number of LP tokens the user has
    function onAxialReward(address _user, uint256 _lpAmount) external override onlyMCA nonReentrant {
        console.log("Inside onAxialReward");
        address[4] memory rewardTokens = rewardTokenArray(rewardToken1, rewardToken2, rewardToken3, rewardToken4); 
        updatePool();
        PoolInfo memory pool = poolInfo;
        UserInfo storage user = userInfo[_user];
        uint256[] memory pending = new uint256[](4);
        uint256[] memory difference = new uint256[](4);
    
        console.log("Acc token per share is" ,pool.accTokenPerShare[0]); 
        console.log("User amount is" ,user.amount); 
        if (user.amount > 0) {
            for (uint i = 0; i < 4; i++){
                uint256 pendings = (user.amount.mul(pool.accTokenPerShare[i]) / ACC_TOKEN_PRECISION).sub(user.rewardDebt[i]).add(
                        user.unpaidRewards[i]
                );
                pending[i] = pendings;

                console.log("Pending tokens are" ,pending[i]); 

                if (rewardTokens[i] != address(0)){
                        uint256 balance = IERC20(rewardTokens[i]).balanceOf(address(this));
                        console.log("The balance of the reward token is ", balance);
                        if (pending[i] > balance) {
                            IERC20(rewardTokens[i]).safeTransfer(_user, balance);
                            user.unpaidRewards[i] = pending[i] - balance;
                        } else {
                            IERC20(rewardTokens[i]).safeTransfer(_user, pending[i]);
                            user.unpaidRewards[i] = 0;
                        }
                        console.log("unpaid rewards for user " ,user.unpaidRewards[i]); 
                }   
                
                user.amount = _lpAmount;
                user.rewardDebt[i] = user.amount.mul(pool.accTokenPerShare[i]) / ACC_TOKEN_PRECISION;
                difference[i] = pending[i] - user.unpaidRewards[i];
            } 
        }
        emit OnReward(_user, difference);
        console.log("Checking to see if we are getting this far");
    }

    /// @dev View function to see pending tokens
    /// @param _user Address of user.
    /// @return pending reward for a given user.
    function pendingTokens(address _user) external view override returns (uint256 pending) {

        return 0; 
        
    }

    function pending(address _user) public view returns (uint256[] memory pending){
        PoolInfo memory pool = poolInfo;
        UserInfo storage user = userInfo[_user];
        uint256[] memory accTokenPerShare = new uint256[](4);

        for (uint i = 0; i < 4; i++){
            accTokenPerShare[i] = pool.accTokenPerShare[i]; 
            uint256 lpSupply = lpToken.balanceOf(address(MCA));

            if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
                uint256 timeElapsed = block.timestamp.sub(pool.lastRewardTimestamp);
                uint256 tokenReward = timeElapsed.mul(tokenPerSec[i]); 
                accTokenPerShare[i] = accTokenPerShare[i].add(tokenReward.mul(ACC_TOKEN_PRECISION).div(lpSupply));
            }

            pending[i] = (user.amount.mul(accTokenPerShare[i]) / ACC_TOKEN_PRECISION).sub(user.rewardDebt[i]).add(
                user.unpaidRewards[i]
            );
        }
        console.log("Hello. It's me :)");
        return pending; 
    }
    

    /// @dev In case rewarder is stopped before emissions finished, this function allows
    /// withdrawal of remaining tokens.
    function emergencyWithdraw() public onlyOwner {
        address[4] memory rewardTokens = rewardTokenArray(rewardToken1, rewardToken2, rewardToken3, rewardToken4); 

        if (isNative) {
            (bool success, ) = msg.sender.call.value(address(this).balance)("");
            require(success, "Transfer failed");
        } else {
            for (uint i = 0; i < 4; i++){
                IERC20(rewardTokens[i]).safeTransfer(address(msg.sender), IERC20(rewardTokens[i]).balanceOf(address(this)));   
            }
        }
    }

    /// @dev View function to see balance of reward token.
    function balance() external view returns (uint256[] memory balances) {
        address[4] memory rewardTokens = rewardTokenArray(rewardToken1, rewardToken2, rewardToken3, rewardToken4); 

            for (uint i = 0; i < 4; i++){
                uint256 bal = IERC20(rewardTokens[i]).balanceOf(address(this));
                balances[i] = bal;
                return balances;
            }
    }

    /// @dev payable function needed to receive AVAX
    receive() external payable {}
}
