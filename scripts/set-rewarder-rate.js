const { ethers } = require("hardhat");
require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

async function main() {
  const SimpleRewarderPerSec_ABI = [{"inputs": [{"internalType": "contract IERC20","name": "_rewardToken","type": "address"},{"internalType": "contract IERC20","name": "_lpToken","type": "address"},{"internalType": "uint256","name": "_tokenPerSec","type": "uint256"},{"internalType": "contract IMasterChefAxial","name": "_MCA","type": "address"},{"internalType": "bool","name": "_isNative","type": "bool"}],"stateMutability": "nonpayable","type": "constructor"},{"anonymous": false,"inputs": [{"indexed": true,"internalType": "address","name": "user","type": "address"},{"indexed": false,"internalType": "uint256","name": "amount","type": "uint256"}],"name": "OnReward","type": "event"},{"anonymous": false,"inputs": [{"indexed": true,"internalType": "address","name": "previousOwner","type": "address"},{"indexed": true,"internalType": "address","name": "newOwner","type": "address"}],"name": "OwnershipTransferred","type": "event"},{"anonymous": false,"inputs": [{"indexed": false,"internalType": "uint256","name": "oldRate","type": "uint256"},{"indexed": false,"internalType": "uint256","name": "newRate","type": "uint256"}],"name": "RewardRateUpdated","type": "event"},{"inputs": [],"name": "MCA","outputs": [{"internalType": "contract IMasterChefAxial","name": "","type": "address"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "balance","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "claimOwnership","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "emergencyWithdraw","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "isNative","outputs": [{"internalType": "bool","name": "","type": "bool"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "lpToken","outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],"stateMutability": "view","type": "function"},{"inputs": [{"internalType": "address","name": "_user","type": "address"},{"internalType": "uint256","name": "_lpAmount","type": "uint256"}],"name": "onAxialReward","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "owner","outputs": [{"internalType": "address","name": "","type": "address"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "pendingOwner","outputs": [{"internalType": "address","name": "","type": "address"}],"stateMutability": "view","type": "function"},{"inputs": [{"internalType": "address","name": "_user","type": "address"}],"name": "pendingTokens","outputs": [{"internalType": "uint256","name": "pending","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "poolInfo","outputs": [{"internalType": "uint256","name": "accTokenPerShare","type": "uint256"},{"internalType": "uint256","name": "lastRewardTimestamp","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [],"name": "rewardToken","outputs": [{"internalType": "contract IERC20","name": "","type": "address"}],"stateMutability": "view","type": "function"},{"inputs": [{"internalType": "uint256","name": "_tokenPerSec","type": "uint256"}],"name": "setRewardRate","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "tokenPerSec","outputs": [{"internalType": "uint256","name": "","type": "uint256"}],"stateMutability": "view","type": "function"},{"inputs": [{"internalType": "address","name": "newOwner","type": "address"},{"internalType": "bool","name": "direct","type": "bool"},{"internalType": "bool","name": "renounce","type": "bool"}],"name": "transferOwnership","outputs": [],"stateMutability": "nonpayable","type": "function"},{"inputs": [],"name": "updatePool","outputs": [{"components": [{"internalType": "uint256","name": "accTokenPerShare","type": "uint256"},{"internalType": "uint256","name": "lastRewardTimestamp","type": "uint256"}],"internalType": "struct SimpleRewarderPerSec.PoolInfo","name": "pool","type": "tuple"}],"stateMutability": "nonpayable","type": "function"},{"inputs": [{"internalType": "address","name": "","type": "address"}],"name": "userInfo","outputs": [{"internalType": "uint256","name": "amount","type": "uint256"},{"internalType": "uint256","name": "rewardDebt","type": "uint256"},{"internalType": "uint256","name": "unpaidRewards","type": "uint256"}],"stateMutability": "view","type": "function"},{"stateMutability": "payable","type": "receive"}];

  const [signer] = await ethers.getSigners();
  const token_name = "ORCA";
  console.log("Setting the new rate for the teddy rewarder with the account:", signer.address);
  // const rewarder_addr = "0xd84f5C83b2Dc67D9aC7Af06A93509CCbe4E81aEa"; // Teddy
  const rewarder_addr = "0x35192aC36f7203b4916Bed14E04959CFB6c5ec31"; // Orca

  const Rewarder = new ethers.Contract(rewarder_addr, SimpleRewarderPerSec_ABI, signer);
  // const setRate = await Rewarder.setRewardRate("0x547DEA7552034D8"); //380517503805175000 for Teddy
  const setRate = await Rewarder.setRewardRate("0x410F09034BF33E8"); //292998477929985000 for Orca
  const tx_setRate = await setRate.wait(1);
  if (!tx_setRate.status) {
    console.error(`Error setting the rate for the ${token_name} Rewarder`);
    return;
  }
  const newRate = await Rewarder.tokenPerSec();
  console.log(`set the rate for the ${token_name} Rewarder to ${newRate}`);

  return;

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });