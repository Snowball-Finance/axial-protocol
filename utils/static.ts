const hre = "hardhat";
const { ethers, network } = require("hardhat");
import { BigNumber } from "@ethersproject/bignumber";
import { Contract, Signer } from "ethers";
import { log } from "./log";
import { overwriteTokenAmount } from "./helpers";

export async function setupSigners() {
    const timelockAddr: string = "0xfd24c14528ed5f4f244873d42f3d5760e32d79a2"; 
    const governanceAddr: string = "0x4980ad7ccb304f7d3c5053aa1131ed1edaf48809"; 

    await network.provider.send('hardhat_impersonateAccount', [timelockAddr]);
    await network.provider.send('hardhat_impersonateAccount', [governanceAddr]);

    let timelockSigner: Signer = ethers.provider.getSigner(timelockAddr);
    let governanceSigner: Signer = ethers.provider.getSigner(governanceAddr);

    let timelock_addr = await timelockSigner.getAddress()
    let governance_addr = await governanceSigner.getAddress(); 

    let balance: string = "0x10000000000000000000000";
    await network.provider.send("hardhat_setBalance", [timelock_addr, balance,]);
    await network.provider.send("hardhat_setBalance", [governance_addr, balance,]);

    return [timelockSigner, governanceSigner];
};

export async function getCurrentTimestamp() {
   let blockNumber =  await ethers.provider.getBlockNumber();
   let block = await ethers.provider.getBlock(blockNumber);

   return block.timestamp;
}

// Generates an erc20 token 
export async function generateToken(asset_name: string, asset_code: string, wallet_addr: string, walletSigner: Signer) {
    const ercFactory = await ethers.getContractFactory("ERC20");
    const assetContract = await ercFactory.deploy(asset_name, asset_code);

    // Update balance of the reward token
    await overwriteTokenAmount(assetContract.address, wallet_addr, "25000000000000000000000", 0); 
    let amt = await assetContract.connect(walletSigner).balanceOf(wallet_addr);
   
    return assetContract.address;  
};

// Generates an lp token 
export async function generateLPToken(asset_name: string, asset_code: string, wallet_addr: string, walletSigner: Signer) {
    const lpFactory = await ethers.getContractFactory("LPToken");
    const lpToken = await lpFactory.deploy();
    lpToken.initialize(asset_name, asset_code);

    // Load lp token with an initial balance
    lpToken.mint(wallet_addr, "25000000000000000000000"); 
    let amt = await lpToken.connect(walletSigner).balanceOf(wallet_addr);

    return lpToken;  
};


