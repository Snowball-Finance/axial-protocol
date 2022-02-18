// SPDX-License-Identifier: MIT
pragma solidity ^0.6.7; 

import "../libraries/SafeMath.sol";
import "../libraries/SafeERC20.sol";
import "../libraries/ProtocolGovernance.sol";
import "../libraries/Math.sol";
import "../libraries/reentrancy-guard.sol";


contract Gauge is ProtocolGovernance, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward, uint256 tokenIndex);
    event RewardAdded(uint256 reward);

    IERC20 public constant AXIAL = IERC20(0xcF8419A615c57511807236751c0AF38Db4ba3351); 
    IERC20 public constant TREASURY = IERC20(0x4980AD7cCB304f7d3c5053Aa1131eD1EDaf48809);

    IERC20 public XAXIAL = IERC20(0xcF8419A615c57511807236751c0AF38Db4ba3351); // TODO: Fix this
    IERC20 public immutable TOKEN = IERC20(0xcF8419A615c57511807236751c0AF38Db4ba3351); // TODO: Fix this

    address[] rewardTokens; 
    address public DISTRIBUTION;
    uint256 public constant DURATION = 7 days;

    uint256 public periodFinish = 0;
    mapping(address => uint256) public rewardRates;
    mapping(address => uint256) public rewardPerTokenStored;

    uint256 public lastUpdateTime;

    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;
    mapping(address => mapping(address => uint256)) public rewards;

    uint256 private _totalSupply;
    uint public derivedSupply;
    mapping(address => uint256) private _balances;
    mapping(address => uint256) public derivedBalances;

    modifier updateReward(address account) {
        for (uint i = 0; i < rewardTokens.length; i++) {
            rewardPerTokenStored[rewardTokens[i]] = rewardPerToken(i);
            lastUpdateTime = lastTimeRewardApplicable();
            if (account != address(0)) {
                rewards[account][rewardTokens[i]] = earned(account, i);
                userRewardPerTokenPaid[account][rewardTokens[i]] = rewardPerTokenStored[rewardTokens[i]];
            }
            _;
            if (account != address(0)) {
                kick(account);
            }
        }
        
    }

    modifier onlyDistribution() {
        require(msg.sender == DISTRIBUTION, "Caller is not RewardsDistribution contract");
        _;
    }

    constructor(
        address[] memory _rewardTokens, 
        uint256[] memory _rewardRates, 
        address _governance
    ) public {

        DISTRIBUTION = msg.sender;
        governance = _governance;

        for (uint i = 0; i < _rewardTokens.length; i++) { 
            rewardTokens.push(_rewardTokens[i]);
            rewardRates[_rewardTokens[i]] = _rewardRates[i];
        }

    }

  
    // This function is to allow us to update the gaugeProxy without resetting the old gauges.
    // this changes where it is receiving the axial tokens, as well as changes the governance
    function changeDistribution(address _distribution) external onlyGovernance {
        DISTRIBUTION = _distribution;
    }  

    // total supply of our lp tokens in the gauge (e.g. AC4D tokens present)
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    // balance of lp tokens that user has in the gauge (e.g. amount of AC4D a user has)
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    // how many of our reward tokens is the user receiving per lp token
    // (e.g. how many teddy or axial is received per AC4D token)
    function rewardPerToken(uint256 tokenIndex) public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored[rewardTokens[tokenIndex]];
        }
        return
            rewardPerTokenStored[rewardTokens[tokenIndex]].add(
                lastTimeRewardApplicable().sub(lastUpdateTime).mul(rewardRates[rewardTokens[tokenIndex]]).mul(1e18).div(derivedSupply)
            );
    }

    function derivedBalance(address account) public view returns (uint) {
        uint _balance = _balances[account];
        uint _derived = _balance.mul(40).div(100);
        uint _adjusted = (_totalSupply.mul(XAXIAL.balanceOf(account)).div(XAXIAL.totalSupply())).mul(60).div(100);
        return Math.min(_derived.add(_adjusted), _balance);
    }

    function kick(address account) public {
        uint _derivedBalance = derivedBalances[account];
        derivedSupply = derivedSupply.sub(_derivedBalance);
        _derivedBalance = derivedBalance(account);
        derivedBalances[account] = _derivedBalance;
        derivedSupply = derivedSupply.add(_derivedBalance);
    }

    // ??? REWARDS???
    // it is saying the amoun t of rewardtokens already paid for xisting reward tokens 
    // rewards? the amount of reward tokens/ the amount of rewards tokens for the reward token
    function earned(address account, uint256 tokenIndex) public view returns (uint256) {
        return derivedBalances[account].mul(rewardPerToken(tokenIndex).sub(userRewardPerTokenPaid[account][rewardTokens[tokenIndex]])).div(1e18).add(rewards[account][rewardTokens[tokenIndex]]);
    }

    function getRewardForDuration(uint256 tokenIndex) external view returns (uint256) {
        return rewardRates[rewardTokens[tokenIndex]].mul(DURATION);
    }

    function _deposit(uint amount, address account) internal nonReentrant updateReward(account) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Staked(account, amount);
        TOKEN.safeTransferFrom(account, amount);
    }

    function depositAll() external {
        _deposit(TOKEN.balanceOf(msg.sender), msg.sender);
    }

    function deposit(uint256 amount) external {
        _deposit(amount, msg.sender);
    }

    function depositFor(uint256 amount, address account) external {
        _deposit(amount, account);
    }

    function _withdraw(uint amount) internal nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        TOKEN.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function withdrawAll() external {
        _withdraw(_balances[msg.sender]);
    }
    
    function withdraw(uint256 amount) external {
        _withdraw(amount);
    }

    function getReward(uint256 tokenIndex) public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender][rewardTokens[tokenIndex]];
        if (reward > 0) {
            rewards[msg.sender][rewardTokens[tokenIndex]] = 0;
            AXIAL.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward, tokenIndex);
        }
    }

    function exit() external {
       _withdraw(_balances[msg.sender]);
       for (uint256 i = 0; i < rewardTokens.length; i++){
           getReward(i);
       }
        
    }

    function notifyRewardAmount(uint256 reward, uint tokenIndex) external onlyDistribution updateReward(address(0)) {
        AXIAL.safeTransferFrom(DISTRIBUTION, reward);
        if (block.timestamp >= periodFinish) {
            rewardRates[rewardTokens[tokenIndex]] = reward.div(DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRates[rewardTokens[tokenIndex]]);
            rewardRates[rewardTokens[tokenIndex]] = reward.add(leftover).div(DURATION);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = AXIAL.balanceOf(address(this));
        require(rewardRates[rewardTokens[tokenIndex]] <= balance.div(DURATION), "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }
   
        
    
}