/* eslint-disable no-undef */
const { ethers, network } = require("hardhat");
const chai = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const {increaseTime, overwriteTokenAmount, increaseBlock, toGwei, fromWei} = require("../../utils/helpers");
const { expect } = chai;


const masterAbi =[{"inputs":[{"internalType":"contract IMasterChef","name":"_MASTER_CHEF_V2","type":"address"},{"internalType":"contract IERC20","name":"_axial","type":"address"},{"internalType":"uint256","name":"_MASTER_PID","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"},{"indexed":true,"internalType":"contract IERC20","name":"lpToken","type":"address"},{"indexed":true,"internalType":"contract IRewarder","name":"rewarder","type":"address"}],"name":"Add","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[],"name":"Init","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"},{"indexed":true,"internalType":"contract IRewarder","name":"rewarder","type":"address"},{"indexed":false,"internalType":"bool","name":"overwrite","type":"bool"}],"name":"Set","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastRewardTimestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"accAxialPerShare","type":"uint256"}],"name":"UpdatePool","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"AXIAL","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MASTER_CHEF_V2","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MASTER_PID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"contract IERC20","name":"_lpToken","type":"address"},{"internalType":"contract IRewarder","name":"_rewarder","type":"address"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"axialPerSec","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"harvestFromMasterChef","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"dummyToken","type":"address"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"pids","type":"uint256[]"}],"name":"massUpdatePools","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"address","name":"_user","type":"address"}],"name":"pendingTokens","outputs":[{"internalType":"uint256","name":"pendingAxial","type":"uint256"},{"internalType":"address","name":"bonusTokenAddress","type":"address"},{"internalType":"string","name":"bonusTokenSymbol","type":"string"},{"internalType":"uint256","name":"pendingBonusToken","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"poolInfo","outputs":[{"internalType":"contract IERC20","name":"lpToken","type":"address"},{"internalType":"uint256","name":"accAxialPerShare","type":"uint256"},{"internalType":"uint256","name":"lastRewardTimestamp","type":"uint256"},{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"contract IRewarder","name":"rewarder","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolLength","outputs":[{"internalType":"uint256","name":"pools","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"contract IRewarder","name":"_rewarder","type":"address"},{"internalType":"bool","name":"overwrite","type":"bool"}],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalAllocPoint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"}],"name":"updatePool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const doQuadRewardsTest = () => {

   const walletAddr = process.env.WALLET_ADDR;
   let SimpleRewarder; 
   let asset1, asset2, asset3, asset4; 
   let rawAsset1, rawAsset2, rawAsset3, rawAsset4; 
   let simpleRewarderAddress, lp, lpAddress, masterChefV3, masterChefTest;

   const txnAmt = "25000000000000000000000";
   let masterchefAxial = "0x958C0d0baA8F220846d3966742D4Fb5edc5493D3";

   let Mim, AA3DAdrr; 

   const governance_addr = "0xfd24c14528ed5f4f244873d42f3d5760e32d79a2"; 

   let tokenPerSec = [4000000000000, 4000000000000, 4000000000000, 4000000000000];
  
   let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";


   describe("Tests for multi-rewards:", async () => {

      //These reset the state after each test is executed 
      beforeEach(async () => {
         snapshotId = await ethers.provider.send('evm_snapshot');
      });
     
      afterEach(async () => {
         await ethers.provider.send('evm_revert', [snapshotId]);
      });
 
      before(async () => {

         walletSigner = ethers.provider.getSigner(walletAddr);

         await network.provider.send("hardhat_setBalance", [governance_addr,"0x10000000000000000000000",]);
         
         await network.provider.send('hardhat_impersonateAccount', ["0xfd24c14528ed5f4f244873d42f3d5760e32d79a2"]);  //governance
         await network.provider.send('hardhat_impersonateAccount', ["0xac9be1372ab5fc54cdf4dd2afe7a678e94706e82"]);  //avaxaxial
         let testSigner = ethers.provider.getSigner("0xac9be1372ab5fc54cdf4dd2afe7a678e94706e82");                // avaxaxial signer
         let governanceSigner = ethers.provider.getSigner(governance_addr);
         masterChefV3 = await ethers.getContractAt(masterAbi, masterchefAxial, governanceSigner); 
         masterChefTest = await ethers.getContractAt(masterAbi, masterchefAxial, testSigner); 

         // Generate an erc token 
         const erc = await ethers.getContractFactory("ERC20");
         rawAsset1 = await erc.deploy("Asset1","A1");
         rawAsset2 = await erc.deploy("Asset2","A2");
         rawAsset3 = await erc.deploy("Asset3","A3");
         rawAsset4 = await erc.deploy("Asset4","A4");

         asset1 = rawAsset1.address;
         asset2 = rawAsset2.address;
         asset3 = rawAsset3.address;
         asset4 = rawAsset4.address;

       
         //    let amt1 = await rawAsset1.connect(walletSigner).balanceOf(walletAddr);

         mimAddress = "0x130966628846BFd36ff31a822705796e8cb8C18D";  
         AvaxAxialAdrr = "0x5305a6c4da88391f4a9045bf2ed57f4bf0cf4f62";



         Mim = new ethers.Contract(mimAddress, erc.interface, governanceSigner); 
         AvaxAxial = new ethers.Contract(AvaxAxialAdrr, erc.interface, governanceSigner); 

         await overwriteTokenAmount(mimAddress,governance_addr,txnAmt,2);
         const bal_of_mim = await Mim.balanceOf(governance_addr); 
         console.log(`The value of mim is ${bal_of_mim}`);

         const ac4d = "0x4da067E13974A4d32D342d86fBBbE4fb0f95f382";
        

         // The Strategy address will not be supplied. We should deploy and setup a new strategy
         const simpleRewarderFactory = await ethers.getContractFactory("SimpleRewarderPerSec");
         SimpleRewarder = await simpleRewarderFactory.deploy( 
            asset1, 
            asset2, 
            asset3, 
            asset4, 
            mimAddress, 
            tokenPerSec, 
            masterchefAxial, 
            false
         );
         // Checks if strategy is deployed
         simpleRewarderAddress = SimpleRewarder.address;

         const ASSET1 = new ethers.Contract(asset1, erc.interface, governanceSigner); 
         await overwriteTokenAmount(asset1,governance_addr,txnAmt,0);
         const bal_of_asset1 = await ASSET1.balanceOf(governance_addr); 
         console.log(`Balance of asset 1 is ${bal_of_asset1}`);
         
         const ASSET2 = new ethers.Contract(asset2, erc.interface, governanceSigner);
         await overwriteTokenAmount(asset2,governance_addr,txnAmt,0);
         const bal_of_asset2 = await ASSET2.balanceOf(governance_addr); 
         console.log(`Balance of asset 2 is ${bal_of_asset2}`);

         const ASSET3 = new ethers.Contract(asset3, erc.interface, governanceSigner);
         await overwriteTokenAmount(asset3,governance_addr,txnAmt,0);
         const bal_of_asset3 = await ASSET3.balanceOf(governance_addr); 
         console.log(`Balance of asset 3 is ${bal_of_asset3}`);

         const ASSET4 = new ethers.Contract(asset4, erc.interface, governanceSigner);
         await overwriteTokenAmount(asset4,governance_addr,txnAmt,0);
         const bal_of_asset4 = await ASSET4.balanceOf(governance_addr); 
         console.log(`Balance of asset 4 is ${bal_of_asset4}`);

         await masterChefV3.add(7000, mimAddress, simpleRewarderAddress);

         await masterChefV3.updatePool(6);

         await increaseTime(60 * 60 * 24 * 30);
         await increaseBlock(500);

         
         console.log(`We are checking more stuff`);
         // you need to call the 
         
         // // get the pending tokens to be returned 
         // const pendingTokens = await SimpleRewarder.pending(walletAddr); 
         // console.log(`The tokens that we have pending are: ${pendingTokens}`);

         console.log(`\tDeployed strategy address is: ${simpleRewarderAddress}`);

      });

      const harvester = async () => {
         
         // // const mintedLp = await lp.mint(walletAddr, txnAmt);
         // await overwriteTokenAmount(lpAddress,walletAddr,txnAmt,0);
         // let lpAmt = await lp.connect(walletSigner).balanceOf(walletAddr);
         // console.log(`\n \tThe balance of our lp token is: ${lpAmt}`);

         // let update = await SimpleRewarder.onAxialReward(walletAddr, 25000000000);
         // console.log(`info inside the function is ${update}`);

      }; 


      // it("checks that we get an array of the tokens", async () => {
      //    let array = await SimpleRewarder.rewardTokenArray(asset1, asset2, asset3, asset4); 
      //    console.log(`\tThe tokens are: ${array}`);
      //    expect(array).to.be.not.empty;
            
      // });

      // it("should update the amount of token distribution rate", async () => {
      //    let newTokenPerSecArray = [5000000000,5000000000,5000000000,5000000000]
      //    await SimpleRewarder.setRewardRate(newTokenPerSecArray);
      //    expect(newTokenPerSecArray).to.be.not.empty;
      // });

      // call deposit in MasterChefAxial to update user information
      it("call deposit in the MockMasterChefAxial contract to update the amount of lp tokens the user has", async () => {
         const test = await masterChefV3.poolInfo(6);
         console.log(`quick check ${test}`);
         await Mim.approve(masterChefV3.address,"2500000000000000000000000000");
         const allow = (await Mim.allowance(governance_addr,masterChefV3.address)) * 1;
         // console.log(`are we allowed to do stuff ${allow}`);
         let depositResult = await masterChefV3.deposit(6, "2500000000000000000000000000");



      });

      // it("checks that we have reward tokens present", async () => {
      //    await overwriteTokenAmount(asset1,walletAddr,txnAmt,0);
      //    let amt1 = await rawAsset1.connect(walletSigner).balanceOf(walletAddr);
      //    await overwriteTokenAmount(asset2,walletAddr,txnAmt,0);
      //    let amt2 = await rawAsset2.connect(walletSigner).balanceOf(walletAddr); 
      //    await overwriteTokenAmount(asset3,walletAddr,txnAmt,0);
      //    let amt3 = await rawAsset3.connect(walletSigner).balanceOf(walletAddr);
      //    await overwriteTokenAmount(asset4,walletAddr,txnAmt,0);
      //    let amt4 = await rawAsset4.connect(walletSigner).balanceOf(walletAddr);

      //    expect(amt1).to.be.gt(0);
      //    expect(amt2).to.be.gt(0);
      //    expect(amt3).to.be.gt(0);
      //    expect(amt4).to.be.gt(0);

      //    await harvester();
      // })

      it("returns a new rewarder pool for mcav3", async () => {

      })

   });

}


doQuadRewardsTest(); 



