import { Signer } from "ethers"
import { solidity } from "ethereum-waffle"

import { GenericERC20 } from "../build/typechain/GenericERC20"
import chai from "chai"
import { ethers } from "hardhat"

chai.use(solidity)
const { expect } = chai

describe("GaugeV4", async () => {

  it("total supply should return the total supply for given token", async () => {})

  it("a user should be able to get their lp balance for given token", async () => {})
  it("a user should be able to get their reward per token for a given token ", async () => {})

  it("a user should be able to get dervied balance of lp token", async () => {})
  it("a user should be able exit the pool", async () => {})

  it("a user should be able get their amount of earned rewards for a given token", async () => {})
  it("a user should be able get their reward for the next duration", async () => {})

  it("a user should be able withdraw their reward for the next duration", async () => {})


  it("a third party should be able to add a rewards", async () => {})

})
