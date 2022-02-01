const hre = require("hardhat");
const { ethers, network } = require("hardhat");
import { BigNumber } from "@ethersproject/bignumber";
import {Signer, Contract} from "ethers";
import { log } from "./log"; 

export async function returnSigner(address: string): Promise<Signer> {
  await network.provider.send('hardhat_impersonateAccount', [address]);
  return ethers.provider.getSigner(address)
}

export async function overwriteTokenAmount(assetAddr: string, walletAddr: string, amount: string, slot: number){
  const index = ethers.utils.solidityKeccak256(["uint256", "uint256"], [walletAddr, slot]);
  const BN = ethers.BigNumber.from(amount)._hex.toString();
  const number = ethers.utils.hexZeroPad(BN, 32);

  await ethers.provider.send("hardhat_setStorageAt", [assetAddr, index, number]);
  await hre.network.provider.send("evm_mine");
}

export async function increaseTime(sec: number) {
  // if (sec < 60) log(`⌛ Advancing ${sec} secs`);
  // else if (sec < 3600) log(`⌛ Advancing ${Number(sec / 60).toFixed(0)} mins`);
  // else if (sec < 60 * 60 * 24) log(`⌛ Advancing ${Number(sec / 3600).toFixed(0)} hours`);
  // else if (sec < 60 * 60 * 24 * 31) log(`⌛ Advancing ${Number(sec / 3600 / 24).toFixed(0)} days`);

  await hre.network.provider.send("evm_increaseTime", [sec]);
  await hre.network.provider.send("evm_mine");
}

export async function increaseBlock(block: number) {
  // log(`⌛ Advancing ${block} blocks`);
  for (let i = 1; i <= block; i++) {
      await hre.network.provider.send("evm_mine");
  }
}

export async function fastForwardAWeek() {
  let i = 0;
  do {
      await increaseTime(60 * 60 * 24);
      await increaseBlock(60 * 60);
      i++;
  } while (i < 8);
}