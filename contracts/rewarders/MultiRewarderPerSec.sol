// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../boringcrypto/BoringOwnable.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/ProtocolGovernance.sol";
import  "../MasterChefAxialV3.sol";

import "hardhat/console.sol";

// interface IRewarder {
//     using SafeERC20 for IERC20;

//     function onAxialReward(address user, uint256 newLpAmount) external;

//     function pendingTokens(address user) external view returns (uint256 pending);

//     function rewardToken() external view returns (IERC20);
// }

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
contract MultiRewarderPerSec is IRewarder, BoringOwnable, ReentrancyGuard, ProtocolGovernance {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public override rewardToken;
    address public immutable lpToken;
    address[] rewardTokens; 
    mapping(address => uint256) public tokensPerSec;
    
    address public immutable MCA;

    /// @dev Info of each MCA user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of YOUR_TOKEN entitled to the user.
    struct UserInfo {
        uint256 amount;
        mapping(address => uint256) rewardDebts; 
        mapping(address => uint256) unpaidRewards;
    }


    struct MCAV3PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. AXIAL to distribute per block.
        uint256 lastRewardTimestamp; // Last block number that AXIAL distribution occurs.
        uint256 accAxialPerShare; // Accumulated AXIAL per share, times 1e12. See below.
    }

    struct MCAV3UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    /// @dev Info of each MCA poolInfo.
    /// `accTokensPerShare` Amount of YOUR_TOKEN each LP token is worth.
    /// `lastRewardTimestamp` The last timestamp YOUR_TOKEN was rewarded to the poolInfo.
    struct PoolInfo {
        uint256[] accTokensPerShare;
        uint256 lastRewardTimestamp;
    }

    /// @dev Info of the poolInfo.
    PoolInfo public poolInfo;
    /// @dev Info of each user that stakes LP tokens.
    mapping(address => UserInfo) public userInfo;

    uint256 private constant ACC_TOKEN_PRECISION = 1e12;

    event OnReward(address indexed user, uint256[] amounts);
    event RewardRateUpdated(address token, uint256 tokenPerSec);

    modifier onlyMCA() {
        require(msg.sender == address(MCA), "onlyMCA: only MasterChefAxial can call this function");
        _;
    }

    modifier validAddress(address _rewardToken) {
        require(Address.isContract(_rewardToken), "reward token must be a valid contract");
        _;
    }

    constructor(
        address _lpToken,
        address[] memory _tokens,
        uint256[] memory _tokensPerSec, 
        address _MCA, 
        address _governance
    ) public {
        require(Address.isContract(_lpToken), "constructor: LP token must be a valid contract");
        require(Address.isContract(_MCA), "constructor: MasterChefAxial must be a valid contract");
        lpToken = _lpToken;

        for (uint i = 0; i < _tokens.length; i++) { 
            rewardTokens.push(_tokens[i]);
            tokensPerSec[_tokens[i]] = _tokensPerSec[i];
            poolInfo.accTokensPerShare.push(0);
            

        }
        MCA = _MCA;
        governance = _governance; 
        poolInfo.lastRewardTimestamp = block.timestamp; 
    }

    /// @param token Reward token to be added to our rewardTokens array 
    /// @param tokenPerSec The number of tokens to be distributed per second 
    // adding a reward token to our array 
    function addRewardToken(
        address token, 
        uint256 tokenPerSec
    ) public onlyGovernance validAddress(token){
        // adding a new reward token to the array 
        rewardTokens.push(token);
        tokensPerSec[token] = tokenPerSec;
        poolInfo.accTokensPerShare.push(0); 
    }

    /// @dev Update reward variables of the given poolInfo.
    /// @return pool Returns the pool that was updated.
    function updatePool() public returns (PoolInfo memory pool) {
        pool = poolInfo;

        if (block.timestamp > pool.lastRewardTimestamp) {
            uint256 lpSupply = IERC20(lpToken).balanceOf(MCA);
    
            if (lpSupply > 0) {
                for (uint i = 0; i < rewardTokens.length; i++){
                    uint256 timeElapsed = block.timestamp.sub(pool.lastRewardTimestamp);
                    uint256 tokenReward = timeElapsed.mul(tokensPerSec[rewardTokens[i]]);
                    pool.accTokensPerShare[i] = pool.accTokensPerShare[i].add((tokenReward.mul(ACC_TOKEN_PRECISION) / lpSupply));
                }
            }
            pool.lastRewardTimestamp = block.timestamp;
            poolInfo = pool;
        }
    
        return pool; 
    }

    /// @dev Sets the distribution reward rate. This will also update the poolInfo.
    /// @param _tokenPerSec The number of tokens to distribute per second
    function setRewardRate(address _token, uint256 _tokenPerSec) external onlyOwner {
        updatePool();
       
        tokensPerSec[_token] = _tokenPerSec; 
        emit RewardRateUpdated(_token, _tokenPerSec); 
    }

    /// @dev Function called by MasterChefAxial whenever staker claims AXIAL harvest. Allows staker to also receive their reward tokens.
    /// @param _user Address of user
    /// @param _lpAmount Number of LP tokens the user has
    function onAxialReward(address _user, uint256 _lpAmount) external override onlyMCA nonReentrant {
        updatePool(); 
        PoolInfo memory pool = poolInfo;
        UserInfo storage user = userInfo[_user];
        uint256[] memory pending;
        uint256[] memory difference;
    
        if (user.amount > 0) {
            console.log("WE are inside the loop in the onAxialReward function");
            for (uint i = 0; i < rewardTokens.length; i++){
                uint256 pendings = (user.amount.mul(pool.accTokensPerShare[i]) / ACC_TOKEN_PRECISION).sub(user.rewardDebts[rewardTokens[i]]).add(
                        user.unpaidRewards[rewardTokens[i]]
                );
                pending[i] = pendings;


                console.log("Pending tokens are" ,pending[i]); 

                if (address(rewardTokens[i]) != address(0)){
                        uint256 balance = IERC20(rewardTokens[i]).balanceOf(address(this));
                        console.log("The balance of the reward token is ", balance);
                        if (pending[i] > balance) {
                            IERC20(rewardTokens[i]).safeTransfer(_user, balance);
                            user.unpaidRewards[rewardTokens[i]] = pending[i] - balance;
                        } else {
                            IERC20(rewardTokens[i]).safeTransfer(_user, pending[i]);
                            user.unpaidRewards[rewardTokens[i]] = 0;
                        }
                        console.log("unpaid rewards for user " ,user.unpaidRewards[rewardTokens[i]]); 
                }   
                
                user.amount = _lpAmount;
                user.rewardDebts[rewardTokens[i]] = user.amount.mul(pool.accTokensPerShare[i]) / ACC_TOKEN_PRECISION;
                difference[i] = pending[i] - user.unpaidRewards[rewardTokens[i]];
            } 
        }
        emit OnReward(_user, difference);
    }

    /// deprecated because we have more than one token
    /// this contract inherits IRewarder, and so this function is necessary to avoid marking the contract as abstract 
    function pendingTokens(address _user) external view override returns (uint256 pending) {
        return 0;  
    }

    function pendingMasterChef(uint256 pid, address _user) external view
        returns (
            uint256 pendingAxial,
            uint256 tokenIndex, 
            address bonusTokenAddress,
            string memory bonusTokenSymbol,
            uint256 pendingBonusToken
        ){

            MasterChefAxialV3 mcaContract = MasterChefAxialV3(MCA);

            (uint256 amount, uint256 rewardDebt) = mcaContract.userInfo(pid, _user);
            MasterChefAxialV3.UserInfo memory user = MasterChefAxialV3.UserInfo(amount, rewardDebt);

            // Should work too
            //MasterChefAxialV3.UserInfo memory user2 = abi.decode(mcaContract.userInfo(pid, _user), MasterChefAxialV3.UserInfo);

            (IERC20 lpToken, uint256 accAxialPerShare, uint256 lastRewardTimestamp, uint256 allocPoint,IRewarder rewarder) = mcaContract.poolInfo(pid);
            MasterChefAxialV3.PoolInfo memory pool = MasterChefAxialV3.PoolInfo(lpToken, accAxialPerShare, lastRewardTimestamp, allocPoint, rewarder);
 
        }

    /// @dev View function to see pending tokens
    /// @param _user Address of user.
    /// @return pending reward for a given user.
    function pendingMultiTokens(address _user, uint256 tokenIndex) public view returns (uint256 pending){
        UserInfo storage user = userInfo[_user];

        uint256 accTokensPerShare = poolInfo.accTokensPerShare[tokenIndex]; 
        uint256 lpSupply = IERC20(lpToken).balanceOf(MCA);
        console.log("The lpSupply is", lpSupply);
        console.log("The user.amount is", user.amount);

        if (block.timestamp > poolInfo.lastRewardTimestamp && lpSupply != 0) {
            uint256 timeElapsed = block.timestamp.sub(poolInfo.lastRewardTimestamp);
            uint256 tokenReward = timeElapsed.mul(tokensPerSec[rewardTokens[tokenIndex]]);  
            accTokensPerShare = accTokensPerShare.add(tokenReward.mul(ACC_TOKEN_PRECISION).div(lpSupply));
        }

        pending = (user.amount.mul(accTokensPerShare) / ACC_TOKEN_PRECISION).sub(user.rewardDebts[rewardTokens[tokenIndex]]).add(
            user.unpaidRewards[rewardTokens[tokenIndex]]
        );
    
        return pending; 
    }
    

    /// @dev In case rewarder is stopped before emissions finished, this function allows
    /// withdrawal of remaining tokens.
    function emergencyWithdraw(uint256 tokenIndex) public onlyOwner {
        address token = rewardTokens[tokenIndex];
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(address(msg.sender), balance);   
    }

    // returns the length of our rewardTokens array
    function rewardTokensLength() public view returns (uint256) {
        return rewardTokens.length; 
    }

    /// @dev View function to see balance of reward tokens.
    function balance(uint256 tokenIndex) external view returns (uint256 balance) {
        balance = IERC20(rewardTokens[tokenIndex]).balanceOf(address(this));
        return balance; 
    }

    /// @dev payable function needed to receive AVAX
    receive() external payable {}
}
