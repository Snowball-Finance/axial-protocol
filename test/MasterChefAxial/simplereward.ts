/* eslint-disable no-undef */
import {Signer, Contract} from "ethers";
import { expect } from "chai";
import async from "../../../Library/Caches/typescript/4.5/node_modules/@types/async";
const { ethers, network } = require("hardhat");
const {log} = require("../../utils/log");
const {returnSigner} = require("../../utils/helpers");
const {setupSigners, generateToken, generateLPToken} = require("../../utils/static");
import {SimpleRewarderContract, MasterChefAxialV3} from "../mocks/MultiRewarder";
import { 
   balance, balanceOfRewardTokens, pendingRewardTokens, 
   updatePoolInfo, updateRewardRate,
   addNewLP, depositsLPToMasterChef, pendingTokens,
   pendingSingleToken
} from "../mocks/InternalFunctions";


const doSimpleRewardsTest = () => {

   const wallet_addr = process.env.WALLET_ADDR === undefined ? '' : process.env['WALLET_ADDR'];

   let SimpleRewarder: Contract; 
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
       
         /** SimpleRewarder Mock **/ 
         SimpleRewarder = await SimpleRewarderContract( 
            asset1,
            lp.address,  
            "250000000000", 
            masterchefAxial_addr
         );

      });




   it("should check the SimpleRewarderSec's balance function is returning the balance of the reward token", async function () {
         await balance(SimpleRewarder); 
   })

   it("should add a new lp to MasterChefAxialV3 ", async function () {
      await addNewLP(MasterChefAxial, timelockSigner, lp.address, SimpleRewarder); 
   }) 

   it("should deposit an initial amount of the lp token into MCA", async function () {
      await depositsLPToMasterChef(lp, walletSigner, masterchefAxial_addr, MasterChefAxial);
   })

   it("should return the pending axial on frontend", async function () {
   await pendingTokens(MasterChefAxial, timelockSigner, wallet_addr);
   })

   it("should return the number of tokens pending for each reward token", async function () {
      await pendingSingleToken(SimpleRewarder, wallet_addr); 
   })

   it("should update pool in SimpleRewarder Contract", async function () {
      await updatePoolInfo(SimpleRewarder); 
   })

      // it("should update the reward rate of a reward token", async function () {
      //    await updateRewardRate(SimpleRewarder, asset1, tokensPerSec); 
      //    expect(tokensPerSec[0]).to.be.equals("350000000000"); 
      // })

   });

}

doSimpleRewardsTest(); 



