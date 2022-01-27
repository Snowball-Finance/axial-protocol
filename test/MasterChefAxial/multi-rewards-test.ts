/* eslint-disable no-undef */
import {Signer, Contract} from "ethers";
import { expect } from "chai";
import async from "../../../Library/Caches/typescript/4.5/node_modules/@types/async";
const { ethers, network } = require("hardhat");
const {log} = require("../../utils/log");
const {returnSigner} = require("../../utils/helpers");
const {setupSigners, generateToken, generateLPToken} = require("../../utils/static");
import {MultiRewarderContract, MasterChefAxialV3} from "../mocks/MultiRewarder";
import { 
   addRewardToken, balanceOfRewardTokens, pendingRewardTokens, 
   updatePoolInfo, updateRewardRate,
   addNewLP, depositsLPToMasterChef, pendingTokens
} from "../mocks/InternalFunctions";


const masterAbi =[{"inputs":[{"internalType":"contract IMasterChef","name":"_MASTER_CHEF_V2","type":"address"},{"internalType":"contract IERC20","name":"_axial","type":"address"},{"internalType":"uint256","name":"_MASTER_PID","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"},{"indexed":true,"internalType":"contract IERC20","name":"lpToken","type":"address"},{"indexed":true,"internalType":"contract IRewarder","name":"rewarder","type":"address"}],"name":"Add","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"EmergencyWithdraw","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[],"name":"Init","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"allocPoint","type":"uint256"},{"indexed":true,"internalType":"contract IRewarder","name":"rewarder","type":"address"},{"indexed":false,"internalType":"bool","name":"overwrite","type":"bool"}],"name":"Set","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastRewardTimestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpSupply","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"accAxialPerShare","type":"uint256"}],"name":"UpdatePool","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"AXIAL","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MASTER_CHEF_V2","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MASTER_PID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"contract IERC20","name":"_lpToken","type":"address"},{"internalType":"contract IRewarder","name":"_rewarder","type":"address"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"axialPerSec","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"harvestFromMasterChef","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IERC20","name":"dummyToken","type":"address"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"pids","type":"uint256[]"}],"name":"massUpdatePools","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"address","name":"_user","type":"address"}],"name":"pendingTokens","outputs":[{"internalType":"uint256","name":"pendingAxial","type":"uint256"},{"internalType":"address","name":"bonusTokenAddress","type":"address"},{"internalType":"string","name":"bonusTokenSymbol","type":"string"},{"internalType":"uint256","name":"pendingBonusToken","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"poolInfo","outputs":[{"internalType":"contract IERC20","name":"lpToken","type":"address"},{"internalType":"uint256","name":"accAxialPerShare","type":"uint256"},{"internalType":"uint256","name":"lastRewardTimestamp","type":"uint256"},{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"contract IRewarder","name":"rewarder","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolLength","outputs":[{"internalType":"uint256","name":"pools","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"contract IRewarder","name":"_rewarder","type":"address"},{"internalType":"bool","name":"overwrite","type":"bool"}],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalAllocPoint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"}],"name":"updatePool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"rewardDebt","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"pid","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}];

const doMultiRewardsTest = () => {

   const wallet_addr = process.env.WALLET_ADDR === undefined ? '' : process.env['WALLET_ADDR'];

   let MultiRewarder: Contract; 
   let MasterChefAxial: Contract;
   let LPAsset: Contract;
   
   let masterchefAxial_addr = "0x958C0d0baA8F220846d3966742D4Fb5edc5493D3";

   let walletSigner: Signer;
   let timelockSigner: Signer;
   let governanceSigner: Signer;
   let masterchefSigner: Signer;

   let snapshotId: string;
   let asset1: string, asset2: string, asset3: string, asset4: string; 
   let rewardTokensArray: string[];
   let tokensPerSec: string[]; 
   let lp: Contract; 
   let timelock_addr: string;
   let governance_addr: string; 
   let multiRewarder_addr: string;



   describe("Tests for multi-rewards:", async () => {
     
      before(async () => {

         await network.provider.send('hardhat_impersonateAccount', [wallet_addr]);
         log(`\timpersonating account: ${wallet_addr}`);
         walletSigner = await returnSigner(wallet_addr);

         [timelockSigner, governanceSigner] = await setupSigners();

         timelock_addr = await timelockSigner.getAddress();
         governance_addr = await governanceSigner.getAddress(); 

         // Generate four new reward tokens
         asset1 = await generateToken("Asset1", "A1", wallet_addr, walletSigner);
         asset2 = await generateToken("Asset2", "A2", wallet_addr, walletSigner);
         asset3 = await generateToken("Asset3", "A3", wallet_addr, walletSigner);
         asset4 = await generateToken("Asset4", "A4", wallet_addr, walletSigner);

         // An array of reward tokens
         rewardTokensArray = [asset1, asset2, asset3, asset4];

         // Generate an LP token
         lp = await generateLPToken("LPToken", "LP", wallet_addr, walletSigner);
         

         // Create tokens per sec array
         tokensPerSec = ["250000000000", "250000000000", "250000000000", "250000000000"]; 


         /** Connect to existing MasterChefAxial Contract */
         MasterChefAxial = await MasterChefAxialV3(masterchefAxial_addr, timelockSigner); 
       
         /** MultiRewarder Mock **/ 
         MultiRewarder = await MultiRewarderContract( 
            lp.address,  
            rewardTokensArray, 
            tokensPerSec,
            masterchefAxial_addr,
            governance_addr
         );

      });



      it("should add a reward token to our list of reward tokens", async function () {
         await addRewardToken(MultiRewarder, governanceSigner, "239042309532", masterchefAxial_addr, walletSigner); 
      })

      it("should check the MultiRewarderSec's balance function is returning an array of balances", async function () {
         await balanceOfRewardTokens(MultiRewarder); 
      })

      it("should add a new lp to MasterChefAxialV3 ", async function () {
         await addNewLP(MasterChefAxial, timelockSigner, lp.address, MultiRewarder); 
      }) 

      it("should deposit an initial amount of the lp token into MCA", async function () {
         await depositsLPToMasterChef(lp, walletSigner, masterchefAxial_addr, MasterChefAxial);
      })

      it("should return the pending axial on frontend", async function () {
         await pendingTokens(MasterChefAxial, timelockSigner, wallet_addr);
      })

      it("should return the number of tokens pending for each reward token", async function () {
         await pendingRewardTokens(MultiRewarder, wallet_addr); 
      })

      // it("should update pool in MultiRewarder Contract", async function () {
      //    await updatePoolInfo(MultiRewarder); 
      // })

      // it("should update the reward rate of a reward token", async function () {
      //    await updateRewardRate(MultiRewarder, asset1, tokensPerSec); 
      //    expect(tokensPerSec[0]).to.be.equals("350000000000"); 
      // })

   });

}

doMultiRewardsTest(); 



