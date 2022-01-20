const { ethers, network } = require("hardhat");
import { expect } from "chai";
import { log } from "console";
import {Contract, Signer} from "ethers";
import { generateToken } from "../../utils/static";


export async function addRewardToken(MultiRewarder: Contract, governanceSigner: Signer, tokenPerSec: number, wallet_addr: string, walletSigner: Signer) {
    // Generate four new reward tokens
    let token = await generateToken("Token", "T", wallet_addr, walletSigner);
    await MultiRewarder.connect(governanceSigner).addRewardToken(token, tokenPerSec); 
}

// Updates the balance of the reward token 
export async function balanceOfRewardTokens(MultiRewarder: Contract) {
    // Checks the balance of our reward tokens 
    const balance = await MultiRewarder.balance(); 
    for(let i = 0; i < balance.length; i++){
        expect(balance[i]).to.be.gt(0);    
    }
}