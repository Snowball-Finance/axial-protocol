const { ethers, network } = require("hardhat");
import { expect } from "chai";
import { log } from "console";
import {Contract, Signer} from "ethers";
import { generateToken, getCurrentTimestamp } from "../../utils/static";
import { fastForwardAWeek} from "../../utils/helpers";


export async function addRewardToken(
    MultiRewarder: Contract, 
    governanceSigner: Signer, 
    tokenPerSec: string, 
    wallet_addr: string, 
    walletSigner: Signer
) {

    let numOfRewards = await MultiRewarder.connect(governanceSigner).rewardTokensLength(); 
    log(`the number of reward tokens before adding a new reward token is ${numOfRewards}`);
    // Generate four new reward tokens
    let token = await generateToken("Token", "T", wallet_addr, walletSigner);
    await MultiRewarder.connect(governanceSigner).addRewardToken(token, tokenPerSec);
    let numOfRewards2 = await MultiRewarder.connect(governanceSigner).rewardTokensLength(); 
    log(`the number of reward tokens after adding a new reward token is ${numOfRewards2}`);
    expect(numOfRewards2).to.be.equals((numOfRewards).add(1)); 
}

// Updates the balance of the reward token 
export async function balanceOfRewardTokens(MultiRewarder: Contract) {
    const numOfRewards = await MultiRewarder.rewardTokensLength(); 
    for(let i = 0; i < numOfRewards; i++){
        // Checks the balance of our reward tokens 
        let balance = await MultiRewarder.balance(i); 
        const BN = ethers.BigNumber.from(balance)._hex.toString();
        log(`the balances are ${balance}`); 
        expect(balance).to.be.equals(BN);    
    }
}

export async function balance(SimpleRewarder: Contract) {
    await SimpleRewarder.balance(); 
}

export async function addNewLP(
    MasterChefAxial: Contract, 
    timelockSigner: Signer, 
    lp: string, 
    MultiRewarder: Contract, 
) {
    let numOfPoolsBefore = await MasterChefAxial.connect(timelockSigner).poolLength();
    //log(`\tThe number of pools of MCA before a new lp is added is: ${numOfPoolsBefore}`); 

    // adding a new lp to the pool  
    await MasterChefAxial.connect(timelockSigner).add("10000", lp, MultiRewarder.address); 
    let numOfPoolsAfter = await MasterChefAxial.connect(timelockSigner).poolLength();
    //log(`\tThe number of pools of MCA after a new lp is added is: ${numOfPoolsAfter}`); 
    expect(numOfPoolsAfter).to.be.equals(numOfPoolsBefore.add(1));
}

export async function depositsLPToMasterChef(assetContract: Contract, walletSigner: Signer, masterchefAxial_addr: string, MasterChefAxial: Contract) {
    // deposit lp into MCA
    await assetContract.connect(walletSigner).approve(masterchefAxial_addr, "25000000000000000000000");
    await MasterChefAxial.connect(walletSigner).deposit(6, "25000000000000000000000"); 
}

export async function pendingTokens(MasterChefAxial: Contract, timelockSigner: Signer, wallet_addr: string ) {
    let pending1 = await MasterChefAxial.connect(timelockSigner).pendingTokens(6, wallet_addr);
    log(`the amount of tokens pending is ${pending1}`);
    await fastForwardAWeek();

    let pending2 = await MasterChefAxial.connect(timelockSigner).pendingTokens(6, wallet_addr);
    log(`the amount of tokens pending after a week is ${pending2}`);
    expect(pending1.pendingAxial).to.be.lt(pending2.pendingAxial);
}

export async function pendingMultiTokens(MasterChefAxial: Contract, MultiRewarder: Contract, timelockSigner: Signer, wallet_addr: string ) {
  
    const numOfRewards = await MultiRewarder.rewardTokensLength();
    for(let i = 0; i < numOfRewards; i++){
         await MultiRewarder.pendingMasterChef(6, wallet_addr, i); 
    }  
    let pending1 = await MasterChefAxial.connect(timelockSigner).pendingTokens(6, wallet_addr);
    log(`the amount of tokens pending is ${pending1}`);

    await fastForwardAWeek();

    
    for(let i = 0; i < numOfRewards; i++){
      await MultiRewarder.pendingMasterChef(6, wallet_addr, i);   
    }
    let pending2 = await MasterChefAxial.connect(timelockSigner).pendingTokens(6, wallet_addr);
    log(`the amount of tokens pending after a week is ${pending2}`);
    expect(pending1.pendingAxial).to.be.lt(pending2.pendingAxial);
}


// Gives the number of reward tokens pending 
export async function pendingRewardTokens(MultiRewarder: Contract, wallet_addr: string) {
    
    //await MultiRewarder.pendingMasterChef(6, wallet_addr); 
    const numOfRewards = await MultiRewarder.rewardTokensLength();
    for (let i = 0; i < numOfRewards; i++){
        const pending = await MultiRewarder.pendingMultiTokens(wallet_addr, i); 
        log(`\t💸The pending tokens for reward token ${i + 1} is: ${pending}`);
    } 
}

export async function pendingSingleToken(SimpleRewarder: Contract, wallet_addr: string) {
    const pending = await SimpleRewarder.pendingTokens(wallet_addr); 
    log(`\t💸The pending tokens for each reward token are: ${pending}`);
}

// Update reward variables of the given pool.
export async function updatePoolInfo(MultiRewarder: Contract) {
    // get the current timestamp 
    let currentTime = await getCurrentTimestamp();
    log(`The time before updating the pool is ${currentTime}`);

    // runs updatePoolInfo
    const info = await MultiRewarder.updatePool();
    const poolInfo = await MultiRewarder.poolInfo(); 

    // we expect the current timestamp to be less than the lastRewardTimestamp 
    log(`Updated pool info:`);
    log(info);
    // log(`The last reward timestamp is ${poolInfo["lastRewardTimestamp"]}`); 
    // expect(poolInfo["lastRewardTimestamp"]).to.be.gt(currentTime); 

    // log(`The acc tokens per share  is ${poolInfo["accTokensPerShare"]}`); 

   
    
}

export async function updateRewardRate(MultiRewarder: Contract, token_addr: string, tokensPerSec: string[]) {
    await MultiRewarder.setRewardRate(token_addr, "350000000000"); 
}

