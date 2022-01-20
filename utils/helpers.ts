const hre = require("hardhat");
const { ethers, network } = require("hardhat");
import { BigNumber } from "@ethersproject/bignumber";
import {Signer, Contract} from "ethers";
import { log } from "./log"; 

export async function returnSigner(address: string): Promise<Signer> {
  await network.provider.send('hardhat_impersonateAccount', [address]);
  return ethers.provider.getSigner(address)
}

export async function overwriteTokenAmount(assetAddr: string, walletAddr: string, amount: string, slot: number = 0){
  const index = ethers.utils.solidityKeccak256(["uint256", "uint256"], [walletAddr, slot]);
  const BN = ethers.BigNumber.from(amount)._hex.toString();
  const number = ethers.utils.hexZeroPad(BN, 32);

  await ethers.provider.send("hardhat_setStorageAt", [assetAddr, index, number]);
  await hre.network.provider.send("evm_mine");
}