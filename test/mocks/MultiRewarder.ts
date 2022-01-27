const hre = "hardhat";
const { ethers, network } = require("hardhat");
import { BigNumber } from "@ethersproject/bignumber";
import { Contract, Signer } from "ethers";
import { log } from "../../utils/log";

export async function MultiRewarderContract(
    lp_addr: string, 
    asset_array: string[],
    tokens_per_sec: string[],
    masterchefAxial_addr: string,
    timelock_addr: string
){
    let MultiRewarder: Contract

    const multiRewarderFactory = await ethers.getContractFactory("MultiRewarderPerSec");
    // Now we can deploy the MultiRewarderPerSec contract 
    MultiRewarder = await multiRewarderFactory.deploy(
        lp_addr,
        asset_array,
        tokens_per_sec,
        masterchefAxial_addr,
        timelock_addr
    );
    
    // Checks to see if MultiRewarder contract has been deployed
    log(`\tDeployed MultiRewarder contract at ${MultiRewarder.address}`);

    return MultiRewarder;
}

export async function SimpleRewarderContract(
    rewardAsset: string,
    lp_addr: string, 
    tokens_per_sec: string,
    masterchefAxial_addr: string,
){
    let SimpleRewarder: Contract

    const simpleRewarderFactory = await ethers.getContractFactory("SimpleRewarderPerSec");
    // Now we can deploy the SimpleRewarderPerSec contract 
    SimpleRewarder = await simpleRewarderFactory.deploy(
        rewardAsset,
        lp_addr,
        tokens_per_sec,
        masterchefAxial_addr,
        false
    );
    
    // Checks to see if SimpleRewarder contract has been deployed
    log(`\tDeployed MultiRewarder contract at ${SimpleRewarder.address}`);

    return SimpleRewarder;
}

export async function MasterChefAxialV3(masterchefAxial_addr: string, governanceSigner: Signer){
    const MasterChefAxial = await ethers.getContractAt("MasterChefAxialV3", masterchefAxial_addr, governanceSigner); 

    return MasterChefAxial; 
}


